BEGIN;

-- =========================================================
-- M & P Shelter Monitoring System
-- 040_refactor_expenses_for_split_funding.sql
--
-- Refactor expenses so an expense represents WHAT was
-- incurred, while HOW it was funded is moved into
-- expense_funding_allocations.
--
-- Current expenses table contains no records, so legacy
-- payment-source data does not require backfilling.
-- =========================================================


-- =========================================================
-- 1. Remove constraints from the old single-funding model
-- =========================================================

ALTER TABLE expenses
DROP CONSTRAINT IF EXISTS chk_expense_payment_source,
DROP CONSTRAINT IF EXISTS chk_expense_payment_method,
DROP CONSTRAINT IF EXISTS fk_expenses_paid_by,
DROP CONSTRAINT IF EXISTS fk_expenses_created_by,
DROP CONSTRAINT IF EXISTS fk_expenses_updated_by;


-- =========================================================
-- 2. Remove obsolete funding/payment columns
--
-- These no longer belong to expenses because one expense
-- may have multiple funding allocations.
-- =========================================================

ALTER TABLE expenses
DROP COLUMN paid_by_user_id,
DROP COLUMN payment_source,
DROP COLUMN payment_method;


-- =========================================================
-- 3. Add Finance audit / void / idempotency fields
-- =========================================================

ALTER TABLE expenses

-- Void audit
ADD COLUMN void_reason TEXT,
ADD COLUMN voided_by UUID,
ADD COLUMN voided_at TIMESTAMPTZ,

-- Expense creation idempotency
ADD COLUMN idempotency_key VARCHAR(255) NOT NULL,
ADD COLUMN idempotency_request_hash VARCHAR(64) NOT NULL;


-- =========================================================
-- 4. Finance audit requirements
--
-- Every expense must have an authenticated creator.
-- =========================================================

ALTER TABLE expenses
ALTER COLUMN created_by SET NOT NULL;


-- =========================================================
-- 5. Recreate Finance audit foreign keys
--
-- Financial audit actors use ON DELETE RESTRICT so their
-- historical identity cannot disappear.
-- =========================================================

ALTER TABLE expenses

ADD CONSTRAINT fk_expenses_created_by
FOREIGN KEY (created_by)
REFERENCES users(user_id)
ON DELETE RESTRICT,

ADD CONSTRAINT fk_expenses_updated_by
FOREIGN KEY (updated_by)
REFERENCES users(user_id)
ON DELETE RESTRICT,

ADD CONSTRAINT fk_expenses_voided_by
FOREIGN KEY (voided_by)
REFERENCES users(user_id)
ON DELETE RESTRICT;


-- =========================================================
-- 6. Description integrity
--
-- Expense description is already NOT NULL in the original
-- schema. This additionally prevents blank / whitespace-only
-- descriptions.
-- =========================================================

ALTER TABLE expenses
ADD CONSTRAINT chk_expense_description
CHECK (
  LENGTH(TRIM(description)) > 0
);


-- =========================================================
-- 7. Void audit integrity
--
-- Active expense:
--   voided_at    NULL
--   voided_by    NULL
--   void_reason  NULL
--
-- Voided expense:
--   all three required
--
-- A void cannot:
--   - occur before the expense date
--   - occur in the future
--
-- Service layer will additionally prevent voiding an
-- expense while active funding allocations still exist.
-- =========================================================

ALTER TABLE expenses
ADD CONSTRAINT chk_expense_void_fields
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
    AND voided_at::date >= expense_date
    AND voided_at <= CURRENT_TIMESTAMP
  )
);


-- =========================================================
-- 8. Expense creation idempotency
--
-- Financial expense creation always requires:
--
-- idempotency_key
--   Client-generated operation identifier.
--
-- idempotency_request_hash
--   Backend-generated request fingerprint.
-- =========================================================

ALTER TABLE expenses

ADD CONSTRAINT chk_expense_idempotency_key
CHECK (
  LENGTH(TRIM(idempotency_key)) > 0
),

ADD CONSTRAINT chk_expense_idempotency_request_hash
CHECK (
  LENGTH(idempotency_request_hash) = 64
);


ALTER TABLE expenses
ADD CONSTRAINT uq_expenses_created_by_idempotency_key
UNIQUE (
  created_by,
  idempotency_key
);


-- =========================================================
-- 9. Useful Finance query indexes
-- =========================================================

-- Expense timeline / reporting
CREATE INDEX idx_expenses_date
ON expenses(expense_date DESC);


-- Category-based financial reports
CREATE INDEX idx_expenses_category_date
ON expenses(
  category,
  expense_date DESC
);


-- Animal-related expense history
CREATE INDEX idx_expenses_animal
ON expenses(animal_id)
WHERE animal_id IS NOT NULL;


-- Medical-record-related expense history
CREATE INDEX idx_expenses_medical_record
ON expenses(medical_record_id)
WHERE medical_record_id IS NOT NULL;


-- Frequently used active-expense reporting
CREATE INDEX idx_expenses_active_date
ON expenses(expense_date DESC)
WHERE voided_at IS NULL;


COMMIT;