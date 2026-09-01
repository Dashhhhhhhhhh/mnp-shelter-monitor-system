BEGIN;

-- =========================================================
-- M & P Shelter Monitoring System
-- 044_create_reimbursement_reversal_corrections.sql
--
-- Records corrections to reimbursement reversals.
--
-- Reversals themselves are immutable.
-- If a reversal was partially or fully incorrect, a
-- correction record restores part of that reversal effect.
--
-- One reversal may have multiple partial corrections.
-- =========================================================


CREATE TABLE reimbursement_reversal_corrections (

  -- =======================================================
  -- Primary identity
  -- =======================================================

  correction_id UUID PRIMARY KEY
    DEFAULT gen_random_uuid(),


  -- =======================================================
  -- Reversal being corrected
  -- =======================================================

  reversal_id UUID NOT NULL
    REFERENCES reimbursement_reversals(reversal_id)
    ON DELETE RESTRICT,


  -- =======================================================
  -- Correction information
  -- =======================================================

  correction_amount NUMERIC(12,2) NOT NULL,

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
  -- created_by is the authenticated ADMIN who records
  -- the correction.
  --
  -- Correction records are immutable.
  -- =======================================================

  created_by UUID NOT NULL
    REFERENCES users(user_id)
    ON DELETE RESTRICT,

  created_at TIMESTAMPTZ NOT NULL
    DEFAULT CURRENT_TIMESTAMP,


  -- =======================================================
  -- Amount integrity
  -- =======================================================

  CONSTRAINT chk_reimbursement_reversal_correction_amount
  CHECK (
    correction_amount > 0
  ),


  -- =======================================================
  -- Correction reason
  -- =======================================================

  CONSTRAINT chk_reimbursement_reversal_correction_reason
  CHECK (
    LENGTH(TRIM(correction_reason)) > 0
  ),


  -- =======================================================
  -- Correction timestamp
  --
  -- Cross-table validation that corrected_at is not before
  -- reversed_at is enforced later in the Finance service.
  -- =======================================================

  CONSTRAINT chk_reimbursement_reversal_corrected_at
  CHECK (
    corrected_at <= CURRENT_TIMESTAMP
  ),


  -- =======================================================
  -- Idempotency integrity
  -- =======================================================

  CONSTRAINT chk_reimbursement_reversal_correction_idempotency_key
  CHECK (
    LENGTH(TRIM(idempotency_key)) > 0
  ),

  CONSTRAINT chk_reimbursement_reversal_correction_request_hash
  CHECK (
    LENGTH(idempotency_request_hash) = 64
  ),


  CONSTRAINT uq_reimbursement_reversal_correction_idempotency
  UNIQUE (
    created_by,
    idempotency_key
  )
);


-- =========================================================
-- Indexes
-- =========================================================


-- All corrections belonging to one reversal.
CREATE INDEX idx_reimbursement_reversal_corrections_reversal
ON reimbursement_reversal_corrections(reversal_id);


-- Chronological correction history / reports.
CREATE INDEX idx_reimbursement_reversal_corrections_corrected_at
ON reimbursement_reversal_corrections(corrected_at);


COMMIT; 