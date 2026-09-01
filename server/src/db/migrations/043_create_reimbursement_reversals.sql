BEGIN;

-- =========================================================
-- M & P Shelter Monitoring System
-- 043_create_reimbursement_reversals.sql
--
-- Records reversals of personal-advance reimbursements.
--
-- Reimbursements themselves are immutable. If a recorded
-- reimbursement was incorrect, a reversal is created
-- instead of modifying or deleting the reimbursement.
--
-- One reimbursement may have multiple partial reversals.
-- =========================================================


CREATE TABLE reimbursement_reversals (

  -- =======================================================
  -- Primary identity
  -- =======================================================

  reversal_id UUID PRIMARY KEY
    DEFAULT gen_random_uuid(),


  -- =======================================================
  -- Reimbursement being reversed
  -- =======================================================

  reimbursement_id UUID NOT NULL
    REFERENCES personal_advance_reimbursements(reimbursement_id)
    ON DELETE RESTRICT,


  -- =======================================================
  -- Reversal information
  -- =======================================================

  reversal_amount NUMERIC(12,2) NOT NULL,

  reversal_reason TEXT NOT NULL,

  reversed_at TIMESTAMPTZ NOT NULL,


  -- =======================================================
  -- Idempotency
  -- =======================================================

  idempotency_key VARCHAR(255) NOT NULL,

  idempotency_request_hash VARCHAR(64) NOT NULL,


  -- =======================================================
  -- Audit
  --
  -- created_by is the authenticated ADMIN who records
  -- the reversal.
  --
  -- Reversal records are immutable.
  -- =======================================================

  created_by UUID NOT NULL
    REFERENCES users(user_id)
    ON DELETE RESTRICT,

  created_at TIMESTAMPTZ NOT NULL
    DEFAULT CURRENT_TIMESTAMP,


  -- =======================================================
  -- Amount integrity
  -- =======================================================

  CONSTRAINT chk_reimbursement_reversal_amount
  CHECK (
    reversal_amount > 0
  ),


  -- =======================================================
  -- Reversal reason
  -- =======================================================

  CONSTRAINT chk_reimbursement_reversal_reason
  CHECK (
    LENGTH(TRIM(reversal_reason)) > 0
  ),


  -- =======================================================
  -- Reversal timestamp
  --
  -- Cross-table validation that reversed_at is not before
  -- the original reimbursed_at timestamp is enforced in
  -- the Finance service transaction.
  -- =======================================================

  CONSTRAINT chk_reimbursement_reversal_reversed_at
  CHECK (
    reversed_at <= CURRENT_TIMESTAMP
  ),


  -- =======================================================
  -- Idempotency integrity
  -- =======================================================

  CONSTRAINT chk_reimbursement_reversal_idempotency_key
  CHECK (
    LENGTH(TRIM(idempotency_key)) > 0
  ),

  CONSTRAINT chk_reimbursement_reversal_request_hash
  CHECK (
    LENGTH(idempotency_request_hash) = 64
  ),


  CONSTRAINT uq_reimbursement_reversal_idempotency
  UNIQUE (
    created_by,
    idempotency_key
  )
);


-- =========================================================
-- Indexes
-- =========================================================


-- All reversals belonging to one reimbursement.
CREATE INDEX idx_reimbursement_reversals_reimbursement
ON reimbursement_reversals(reimbursement_id);


-- Chronological reversal history / reports.
CREATE INDEX idx_reimbursement_reversals_reversed_at
ON reimbursement_reversals(reversed_at);


COMMIT;