BEGIN;

-- =========================================================
-- M & P Shelter Monitoring System
-- 042_create_personal_advance_reimbursements.sql
--
-- Records reimbursements made against PERSONAL_ADVANCE
-- expense funding allocations.
--
-- One PERSONAL_ADVANCE may have multiple reimbursements.
--
-- Reimbursements are immutable financial records.
-- Mistakes are corrected through reimbursement reversals,
-- not by UPDATE or DELETE.
-- =========================================================


CREATE TABLE personal_advance_reimbursements (

  -- =======================================================
  -- Primary identity
  -- =======================================================

  reimbursement_id UUID PRIMARY KEY
    DEFAULT gen_random_uuid(),


  -- =======================================================
  -- PERSONAL_ADVANCE allocation being reimbursed
  -- =======================================================

  allocation_id UUID NOT NULL
    REFERENCES expense_funding_allocations(allocation_id)
    ON DELETE RESTRICT,


  -- =======================================================
  -- Reimbursement financial information
  -- =======================================================

  reimbursement_amount NUMERIC(12,2) NOT NULL,

  reimbursed_at TIMESTAMPTZ NOT NULL,


  -- =======================================================
  -- Payment information
  -- =======================================================

  payment_method VARCHAR(30) NOT NULL,

  payment_provider VARCHAR(100),

  reference_number VARCHAR(255),


  -- =======================================================
  -- Optional descriptive note
  -- =======================================================

  notes TEXT,


  -- =======================================================
  -- Idempotency
  -- =======================================================

  idempotency_key VARCHAR(255) NOT NULL,

  idempotency_request_hash VARCHAR(64) NOT NULL,


  -- =======================================================
  -- Audit
  --
  -- created_by is the authenticated ADMIN who records the
  -- reimbursement.
  --
  -- The reimbursement recipient is NOT stored here.
  -- It is derived from:
  --
  -- expense_funding_allocations.advanced_by_user_id
  -- =======================================================

  created_by UUID NOT NULL
    REFERENCES users(user_id)
    ON DELETE RESTRICT,

  created_at TIMESTAMPTZ NOT NULL
    DEFAULT CURRENT_TIMESTAMP,


  -- =======================================================
  -- Amount integrity
  -- =======================================================

  CONSTRAINT chk_personal_advance_reimbursement_amount
  CHECK (
    reimbursement_amount > 0
  ),


  -- =======================================================
  -- Reimbursement timestamp
  --
  -- Cross-table validation that reimbursed_at is not before
  -- funded_at will be enforced in the service transaction.
  -- =======================================================

  CONSTRAINT chk_personal_advance_reimbursed_at
  CHECK (
    reimbursed_at <= CURRENT_TIMESTAMP
  ),


  -- =======================================================
  -- Payment method
  -- =======================================================

  CONSTRAINT chk_personal_advance_reimbursement_payment_method
  CHECK (
    payment_method IN (
      'CASH',
      'E_WALLET',
      'BANK_TRANSFER',
      'OTHER'
    )
  ),


  -- =======================================================
  -- Optional payment metadata
  -- =======================================================

  CONSTRAINT chk_personal_advance_reimbursement_provider
  CHECK (
    payment_provider IS NULL
    OR LENGTH(TRIM(payment_provider)) > 0
  ),

  CONSTRAINT chk_personal_advance_reimbursement_reference
  CHECK (
    reference_number IS NULL
    OR LENGTH(TRIM(reference_number)) > 0
  ),


  -- =======================================================
  -- Idempotency integrity
  -- =======================================================

  CONSTRAINT chk_personal_advance_reimbursement_idempotency_key
  CHECK (
    LENGTH(TRIM(idempotency_key)) > 0
  ),

  CONSTRAINT chk_personal_advance_reimbursement_request_hash
  CHECK (
    LENGTH(idempotency_request_hash) = 64
  ),


  CONSTRAINT uq_personal_advance_reimbursement_idempotency
  UNIQUE (
    created_by,
    idempotency_key
  )
);


-- =========================================================
-- Indexes
-- =========================================================


-- Main query:
-- all reimbursements belonging to a PERSONAL_ADVANCE.
CREATE INDEX idx_personal_advance_reimbursements_allocation
ON personal_advance_reimbursements(allocation_id);


-- Chronological reimbursement reports.
CREATE INDEX idx_personal_advance_reimbursements_reimbursed_at
ON personal_advance_reimbursements(reimbursed_at);


COMMIT;