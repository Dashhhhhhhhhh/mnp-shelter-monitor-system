BEGIN;

-- =========================================================
-- M & P Shelter Monitoring System
-- 045_create_donation_restriction_changes.sql
--
-- Records donor-authorized changes to the restriction of
-- MONETARY donations.
--
-- Restriction changes are immutable financial audit records.
-- They do not change the total shelter cash amount.
-- =========================================================


CREATE TABLE donation_restriction_changes (

  -- =======================================================
  -- Primary identity
  -- =======================================================

  restriction_change_id UUID PRIMARY KEY
    DEFAULT gen_random_uuid(),


  -- =======================================================
  -- Donation being reclassified
  -- =======================================================

  donation_id UUID NOT NULL
    REFERENCES donations(donation_id)
    ON DELETE RESTRICT,


  -- =======================================================
  -- Amount being reclassified
  --
  -- Partial reclassification is allowed.
  -- =======================================================

  change_amount NUMERIC(12,2) NOT NULL,


  -- =======================================================
  -- Previous restriction state
  -- =======================================================

  from_restriction_type VARCHAR(20) NOT NULL,

  from_restriction_category VARCHAR(30),

  from_restricted_expense_id UUID
    REFERENCES expenses(expense_id)
    ON DELETE RESTRICT,


  -- =======================================================
  -- New restriction state
  -- =======================================================

  to_restriction_type VARCHAR(20) NOT NULL,

  to_restriction_category VARCHAR(30),

  to_restricted_expense_id UUID
    REFERENCES expenses(expense_id)
    ON DELETE RESTRICT,


  -- =======================================================
  -- Donor authorization / reason
  -- =======================================================

  authorization_note TEXT NOT NULL,

  change_reason TEXT NOT NULL,


  -- =======================================================
  -- Business timestamps
  -- =======================================================

  authorized_at TIMESTAMPTZ NOT NULL,

  changed_at TIMESTAMPTZ NOT NULL,


  -- =======================================================
  -- Idempotency
  -- =======================================================

  idempotency_key VARCHAR(255) NOT NULL,

  idempotency_request_hash VARCHAR(64) NOT NULL,


  -- =======================================================
  -- Audit
  --
  -- created_by is the authenticated ADMIN who records the
  -- authorized restriction change.
  --
  -- Records are immutable.
  -- =======================================================

  created_by UUID NOT NULL
    REFERENCES users(user_id)
    ON DELETE RESTRICT,

  created_at TIMESTAMPTZ NOT NULL
    DEFAULT CURRENT_TIMESTAMP,


  -- =======================================================
  -- Amount integrity
  -- =======================================================

  CONSTRAINT chk_donation_restriction_change_amount
  CHECK (
    change_amount > 0
  ),


  -- =======================================================
  -- Restriction type integrity
  -- =======================================================

  CONSTRAINT chk_donation_restriction_change_from_type
  CHECK (
    from_restriction_type IN (
      'GENERAL',
      'RESTRICTED'
    )
  ),

  CONSTRAINT chk_donation_restriction_change_to_type
  CHECK (
    to_restriction_type IN (
      'GENERAL',
      'RESTRICTED'
    )
  ),


  -- =======================================================
  -- Previous restriction-state integrity
  -- =======================================================

  CONSTRAINT chk_donation_restriction_change_from_state
  CHECK (
    (
      from_restriction_type = 'GENERAL'
      AND from_restriction_category IS NULL
      AND from_restricted_expense_id IS NULL
    )
    OR
    (
    from_restriction_type = 'RESTRICTED'
    AND from_restriction_category IS NOT NULL
    AND from_restriction_category IN (
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
      AND (
        (
          from_restriction_category = 'SPECIFIC_EXPENSE'
          AND from_restricted_expense_id IS NOT NULL
        )
        OR
        (
          from_restriction_category IS DISTINCT FROM 'SPECIFIC_EXPENSE'
          AND from_restricted_expense_id IS NULL
        )
      )
    )
  ),


  -- =======================================================
  -- New restriction-state integrity
  -- =======================================================

  CONSTRAINT chk_donation_restriction_change_to_state
  CHECK (
    (
      to_restriction_type = 'GENERAL'
      AND to_restriction_category IS NULL
      AND to_restricted_expense_id IS NULL
    )
    OR
    (
    to_restriction_type = 'RESTRICTED'
    AND to_restriction_category IS NOT NULL
    AND to_restriction_category IN (
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
      AND (
        (
          to_restriction_category = 'SPECIFIC_EXPENSE'
          AND to_restricted_expense_id IS NOT NULL
        )
        OR
        (
          to_restriction_category IS DISTINCT FROM 'SPECIFIC_EXPENSE'
          AND to_restricted_expense_id IS NULL
        )
      )
    )
  ),


  -- =======================================================
  -- The change must actually modify the restriction state.
  -- =======================================================

  CONSTRAINT chk_donation_restriction_state_changed
  CHECK (
    ROW(
      from_restriction_type,
      from_restriction_category,
      from_restricted_expense_id
    )
    IS DISTINCT FROM
    ROW(
      to_restriction_type,
      to_restriction_category,
      to_restricted_expense_id
    )
  ),


  -- =======================================================
  -- Authorization / reason integrity
  -- =======================================================

  CONSTRAINT chk_donation_restriction_authorization_note
  CHECK (
    LENGTH(TRIM(authorization_note)) > 0
  ),

  CONSTRAINT chk_donation_restriction_change_reason
  CHECK (
    LENGTH(TRIM(change_reason)) > 0
  ),


  -- =======================================================
  -- Timestamp integrity
  --
  -- Cross-table validation that authorized_at / changed_at
  -- are not before donation.donated_at is handled by the
  -- Finance service.
  -- =======================================================

  CONSTRAINT chk_donation_restriction_authorized_at
  CHECK (
    authorized_at <= CURRENT_TIMESTAMP
  ),

  CONSTRAINT chk_donation_restriction_changed_at
  CHECK (
    changed_at <= CURRENT_TIMESTAMP
    AND changed_at >= authorized_at
  ),


  -- =======================================================
  -- Idempotency integrity
  -- =======================================================

  CONSTRAINT chk_donation_restriction_idempotency_key
  CHECK (
    LENGTH(TRIM(idempotency_key)) > 0
  ),

  CONSTRAINT chk_donation_restriction_request_hash
  CHECK (
    LENGTH(idempotency_request_hash) = 64
  ),


  CONSTRAINT uq_donation_restriction_change_idempotency
  UNIQUE (
    created_by,
    idempotency_key
  )
);


-- =========================================================
-- Indexes
-- =========================================================


-- All restriction changes for one donation.
CREATE INDEX idx_donation_restriction_changes_donation
ON donation_restriction_changes(donation_id);


-- Chronological restriction-change history.
CREATE INDEX idx_donation_restriction_changes_changed_at
ON donation_restriction_changes(changed_at);


COMMIT;