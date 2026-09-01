BEGIN;

-- =========================================================
-- M & P Shelter Monitoring System
-- 039_refactor_donations_for_finance.sql
--
-- Refactor the existing donations table for the Finance
-- module.
--
-- Current donations table contains no records, so legacy
-- donation data does not require backfilling.
-- =========================================================


-- =========================================================
-- 1. Remove constraints that depend on the old design
-- =========================================================

ALTER TABLE donations
DROP CONSTRAINT IF EXISTS chk_donation_payment_method,
DROP CONSTRAINT IF EXISTS chk_donation_amount,
DROP CONSTRAINT IF EXISTS chk_donation_date,
DROP CONSTRAINT IF EXISTS fk_donations_created_by,
DROP CONSTRAINT IF EXISTS fk_donations_updated_by,
DROP CONSTRAINT IF EXISTS fk_donations_received_by;


-- =========================================================
-- 2. Replace DATE-only donation date with actual timestamp
-- =========================================================

ALTER TABLE donations
DROP COLUMN donation_date;

ALTER TABLE donations
ADD COLUMN donated_at TIMESTAMPTZ NOT NULL;


-- =========================================================
-- 3. Add Finance fields
-- =========================================================

ALTER TABLE donations

-- Payment / transaction reference
ADD COLUMN reference_number VARCHAR(255),

-- Registered donor / payer when applicable
ADD COLUMN donor_user_id UUID,

-- MONETARY fund restriction
ADD COLUMN fund_restriction VARCHAR(20),
ADD COLUMN restriction_category VARCHAR(30),
ADD COLUMN restricted_expense_id UUID,

-- Void audit
ADD COLUMN void_reason TEXT,
ADD COLUMN voided_by UUID,
ADD COLUMN voided_at TIMESTAMPTZ,

-- Creation idempotency
ADD COLUMN idempotency_key VARCHAR(255) NOT NULL,
ADD COLUMN idempotency_request_hash VARCHAR(64) NOT NULL;


-- =========================================================
-- 4. Finance audit requirements
--
-- Finance records must always retain the authenticated actor
-- that created the record.
-- =========================================================

ALTER TABLE donations
ALTER COLUMN created_by SET NOT NULL;


-- =========================================================
-- 5. Foreign keys
--
-- Financial history uses ON DELETE RESTRICT so referenced
-- users / expenses cannot disappear from audit history.
-- =========================================================

ALTER TABLE donations

ADD CONSTRAINT fk_donations_donor_user
FOREIGN KEY (donor_user_id)
REFERENCES users(user_id)
ON DELETE RESTRICT,

ADD CONSTRAINT fk_donations_restricted_expense
FOREIGN KEY (restricted_expense_id)
REFERENCES expenses(expense_id)
ON DELETE RESTRICT,

ADD CONSTRAINT fk_donations_created_by
FOREIGN KEY (created_by)
REFERENCES users(user_id)
ON DELETE RESTRICT,

ADD CONSTRAINT fk_donations_updated_by
FOREIGN KEY (updated_by)
REFERENCES users(user_id)
ON DELETE RESTRICT,

ADD CONSTRAINT fk_donations_received_by
FOREIGN KEY (received_by)
REFERENCES users(user_id)
ON DELETE RESTRICT,

ADD CONSTRAINT fk_donations_voided_by
FOREIGN KEY (voided_by)
REFERENCES users(user_id)
ON DELETE RESTRICT;


-- =========================================================
-- 6. donated_at integrity
--
-- A donation/support event cannot be recorded as occurring
-- in the future.
-- =========================================================

ALTER TABLE donations
ADD CONSTRAINT chk_donated_at
CHECK (
  donated_at <= CURRENT_TIMESTAMP
);


-- =========================================================
-- 7. Payment method rules
--
-- MONETARY and DIRECT_PAYMENT involve monetary payment.
--
-- IN_KIND represents physical goods and therefore does not
-- use payment method/provider/reference fields.
-- =========================================================

ALTER TABLE donations
ADD CONSTRAINT chk_donation_payment_fields
CHECK (
  (
    donation_type IN ('MONETARY', 'DIRECT_PAYMENT')
    AND payment_method IS NOT NULL
    AND payment_method IN (
      'CASH',
      'E_WALLET',
      'BANK_TRANSFER',
      'OTHER'
    )
  )
  OR
  (
    donation_type = 'IN_KIND'
    AND payment_method IS NULL
    AND payment_provider IS NULL
    AND reference_number IS NULL
  )
);


-- =========================================================
-- 8. Monetary amount rules
--
-- MONETARY:
--   Actual money received by M & P.
--
-- DIRECT_PAYMENT:
--   Money paid directly to a provider by a donor/payer.
--
-- IN_KIND:
--   May optionally have an estimated monetary value, but
--   that value never becomes shelter cash.
-- =========================================================

ALTER TABLE donations
ADD CONSTRAINT chk_donation_amount
CHECK (
  (
    donation_type IN ('MONETARY', 'DIRECT_PAYMENT')
    AND monetary_amount IS NOT NULL
    AND monetary_amount > 0
  )
  OR
  (
    donation_type = 'IN_KIND'
    AND (
      monetary_amount IS NULL
      OR monetary_amount > 0
    )
  )
);


-- =========================================================
-- 9. MONETARY fund restriction structure
--
-- Only MONETARY donations enter the shelter cash pool.
--
-- They must be classified as:
--   GENERAL
--   RESTRICTED
--
-- IN_KIND and DIRECT_PAYMENT do not participate in this
-- restricted-cash structure.
-- =========================================================

ALTER TABLE donations
ADD CONSTRAINT chk_donation_fund_restriction
CHECK (
  (
    donation_type = 'MONETARY'
    AND fund_restriction IS NOT NULL
    AND fund_restriction IN (
      'GENERAL',
      'RESTRICTED'
    )
  )
  OR
  (
    donation_type IN (
      'IN_KIND',
      'DIRECT_PAYMENT'
    )
    AND fund_restriction IS NULL
    AND restriction_category IS NULL
    AND restricted_expense_id IS NULL
  )
);


-- =========================================================
-- 10. GENERAL monetary donation
--
-- GENERAL money has no restriction category and is not
-- tied to a specific expense.
-- =========================================================

ALTER TABLE donations
ADD CONSTRAINT chk_general_donation_restriction
CHECK (
  fund_restriction IS DISTINCT FROM 'GENERAL'
  OR
  (
    restriction_category IS NULL
    AND restricted_expense_id IS NULL
  )
);


-- =========================================================
-- 11. RESTRICTED monetary donation
--
-- Restricted funds require:
--   - structured restriction category
--   - human-readable donor purpose
--
-- Restriction categories reuse expense-category vocabulary
-- where possible.
-- =========================================================

ALTER TABLE donations
ADD CONSTRAINT chk_restricted_donation
CHECK (
  fund_restriction IS DISTINCT FROM 'RESTRICTED'
  OR
  (
    restriction_category IS NOT NULL

    AND restriction_category IN (
      'VET',
      'MEDICINE',
      'FOOD',
      'LITTER',
      'CAGE_SUPPLIES',
      'CLEANING_SUPPLIES',
      'TRANSPORTATION',
      'SPECIFIC_EXPENSE',
      'OTHER'
    )

    AND purpose IS NOT NULL
    AND LENGTH(TRIM(purpose)) > 0
  )
);


-- =========================================================
-- 12. SPECIFIC_EXPENSE restriction
--
-- When the donor restricts money to one exact expense,
-- restricted_expense_id is required.
--
-- For every other category, restricted_expense_id must
-- remain NULL.
-- =========================================================

ALTER TABLE donations
ADD CONSTRAINT chk_specific_expense_restriction
CHECK (
  (
    restriction_category = 'SPECIFIC_EXPENSE'
    AND restricted_expense_id IS NOT NULL
  )
  OR
  (
    restriction_category IS DISTINCT FROM 'SPECIFIC_EXPENSE'
    AND restricted_expense_id IS NULL
  )
);


-- =========================================================
-- 13. DIRECT_PAYMENT payer identity
--
-- DIRECT_PAYMENT represents a donor/payer paying the
-- provider directly.
--
-- Exactly one payer identity must be present:
--
--   donor_user_id
--     Registered M & P system user
--
-- OR
--
--   donor_name
--     Outside payer without a system account
--
-- DIRECT_PAYMENT cannot be anonymous.
--
-- M & P does not receive this money, so received_by must
-- remain NULL.
-- =========================================================

ALTER TABLE donations
ADD CONSTRAINT chk_direct_payment_identity
CHECK (
  donation_type <> 'DIRECT_PAYMENT'
  OR
  (
    is_anonymous = FALSE
    AND received_by IS NULL

    AND
    (
      (
        donor_user_id IS NOT NULL
        AND donor_name IS NULL
      )
      OR
      (
        donor_user_id IS NULL
        AND donor_name IS NOT NULL
        AND LENGTH(TRIM(donor_name)) > 0
      )
    )
  )
);


-- =========================================================
-- 14. Optional donor name integrity
--
-- If donor_name is supplied, it cannot consist only of
-- whitespace.
-- =========================================================

ALTER TABLE donations
ADD CONSTRAINT chk_donor_name_not_blank
CHECK (
  donor_name IS NULL
  OR LENGTH(TRIM(donor_name)) > 0
);


-- =========================================================
-- 15. Void audit integrity
--
-- Active donation:
--   voided_at    NULL
--   voided_by    NULL
--   void_reason  NULL
--
-- Voided donation:
--   all three required
--
-- Void timestamp must:
--   - not precede donated_at
--   - not be in the future
-- =========================================================

ALTER TABLE donations
ADD CONSTRAINT chk_donation_void_fields
CHECK (
  (
    voided_at IS NULL
    AND voided_by IS NULL
    AND void_reason IS NULL
  )
  OR
  (
    voided_at IS NOT NULL
    AND voided_by IS NOT NULL
    AND void_reason IS NOT NULL
    AND LENGTH(TRIM(void_reason)) > 0
    AND voided_at >= donated_at
    AND voided_at <= CURRENT_TIMESTAMP
  )
);


-- =========================================================
-- 16. Idempotency integrity
--
-- Finance donation creation always requires an idempotency
-- key and request hash.
--
-- idempotency_key:
--   Client-generated operation key.
--
-- idempotency_request_hash:
--   Backend-generated SHA-256-style request fingerprint.
-- =========================================================

ALTER TABLE donations

ADD CONSTRAINT chk_donation_idempotency_key
CHECK (
  LENGTH(TRIM(idempotency_key)) > 0
),

ADD CONSTRAINT chk_donation_idempotency_request_hash
CHECK (
  LENGTH(idempotency_request_hash) = 64
);


-- Same ADMIN + same idempotency key cannot create another
-- donation record.

ALTER TABLE donations
ADD CONSTRAINT uq_donations_created_by_idempotency_key
UNIQUE (
  created_by,
  idempotency_key
);


-- =========================================================
-- 17. Finance query indexes
-- =========================================================

-- Common donation-type filtering
CREATE INDEX idx_donations_type
ON donations(donation_type);


-- Chronological donation/support queries
CREATE INDEX idx_donations_donated_at
ON donations(donated_at);


-- Donations / direct payments associated with a registered
-- system user
CREATE INDEX idx_donations_donor_user
ON donations(donor_user_id)
WHERE donor_user_id IS NOT NULL;


-- Active monetary donations used when determining available
-- shelter cash
CREATE INDEX idx_donations_active_monetary
ON donations(donated_at)
WHERE donation_type = 'MONETARY'
  AND voided_at IS NULL;


-- Restricted-fund lookup, including FIFO-style ordering by
-- donated_at
CREATE INDEX idx_donations_restricted_funds
ON donations(
  restriction_category,
  donated_at
)
WHERE donation_type = 'MONETARY'
  AND fund_restriction = 'RESTRICTED'
  AND voided_at IS NULL;


COMMIT;