BEGIN;

-- =========================================================
-- M & P Shelter Monitoring System
-- 048_create_expense_amount_corrections.sql
--
-- Immutable audit history for corrections made to
-- expenses.amount.
--
-- The expense row itself may be updated only when Finance
-- business rules allow the correction.
--
-- This table permanently preserves the previous and new
-- expense amounts.
-- =========================================================


CREATE TABLE expense_amount_corrections (

  -- =======================================================
  -- Primary identity
  -- =======================================================

  correction_id UUID PRIMARY KEY
    DEFAULT gen_random_uuid(),


  -- =======================================================
  -- Expense being corrected
  -- =======================================================

  expense_id UUID NOT NULL
    REFERENCES expenses(expense_id)
    ON DELETE RESTRICT,


  -- =======================================================
  -- Amount change
  -- =======================================================

  old_amount NUMERIC(12,2) NOT NULL,

  new_amount NUMERIC(12,2) NOT NULL,


  -- =======================================================
  -- Correction information
  -- =======================================================

  correction_reason TEXT NOT NULL,

  corrected_at TIMESTAMPTZ NOT NULL,


  -- =======================================================
  -- Idempotency
  -- =======================================================

  idempotency_key VARCHAR(255) NOT NULL,

  idempotency_request_hash VARCHAR(64) NOT NULL,


  -- =======================================================
  -- Audit
  --
  -- created_by is the authenticated ADMIN who performs
  -- the expense amount correction.
  --
  -- Correction records themselves are immutable.
  -- =======================================================

  created_by UUID NOT NULL
    REFERENCES users(user_id)
    ON DELETE RESTRICT,

  created_at TIMESTAMPTZ NOT NULL
    DEFAULT CURRENT_TIMESTAMP,


  -- =======================================================
  -- Amount integrity
  -- =======================================================

  CONSTRAINT chk_expense_amount_correction_old_amount
  CHECK (
    old_amount > 0
  ),

  CONSTRAINT chk_expense_amount_correction_new_amount
  CHECK (
    new_amount > 0
  ),


  -- =======================================================
  -- Correction must actually change the amount
  -- =======================================================

  CONSTRAINT chk_expense_amount_correction_changed
  CHECK (
    old_amount <> new_amount
  ),


  -- =======================================================
  -- Correction reason
  -- =======================================================

  CONSTRAINT chk_expense_amount_correction_reason
  CHECK (
    LENGTH(TRIM(correction_reason)) > 0
  ),


  -- =======================================================
  -- Timestamp integrity
  --
  -- Cross-table validation that corrected_at is not before
  -- the original expense date is handled in the Finance
  -- service transaction.
  -- =======================================================

  CONSTRAINT chk_expense_amount_correction_corrected_at
  CHECK (
    corrected_at <= CURRENT_TIMESTAMP
  ),


  -- =======================================================
  -- Idempotency integrity
  -- =======================================================

  CONSTRAINT chk_expense_amount_correction_idempotency_key
  CHECK (
    LENGTH(TRIM(idempotency_key)) > 0
  ),

  CONSTRAINT chk_expense_amount_correction_request_hash
  CHECK (
    LENGTH(idempotency_request_hash) = 64
  ),


  CONSTRAINT uq_expense_amount_correction_idempotency
  UNIQUE (
    created_by,
    idempotency_key
  )
);


-- =========================================================
-- Indexes
-- =========================================================


-- Full amount-correction history for one expense.
CREATE INDEX idx_expense_amount_corrections_expense
ON expense_amount_corrections(expense_id);


-- Chronological Finance audit history.
CREATE INDEX idx_expense_amount_corrections_corrected_at
ON expense_amount_corrections(corrected_at);


COMMIT;