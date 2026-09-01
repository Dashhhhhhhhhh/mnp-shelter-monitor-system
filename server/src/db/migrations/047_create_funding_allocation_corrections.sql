BEGIN;

-- =========================================================
-- M & P Shelter Monitoring System
-- 047_create_funding_allocation_corrections.sql
--
-- Immutable audit history for corrections made to
-- expense_funding_allocations.
--
-- The allocation itself may be updated only when Finance
-- business rules allow the correction.
--
-- This table permanently preserves the allocation state
-- before and after the correction.
-- =========================================================


CREATE TABLE funding_allocation_corrections (

  -- =======================================================
  -- Primary identity
  -- =======================================================

  correction_id UUID PRIMARY KEY
    DEFAULT gen_random_uuid(),


  -- =======================================================
  -- Allocation being corrected
  -- =======================================================

  allocation_id UUID NOT NULL
    REFERENCES expense_funding_allocations(allocation_id)
    ON DELETE RESTRICT,


  -- =======================================================
  -- Immutable before / after snapshots
  --
  -- JSONB is used because an allocation contains several
  -- conditional fields depending on funding_type.
  --
  -- Example fields may include:
  --
  -- funding_type
  -- allocation_amount
  -- funded_at
  -- payment_method
  -- payment_provider
  -- reference_number
  -- advanced_by_user_id
  -- contributed_by_user_id
  -- direct_paid_by_user_id
  -- outside_payer_name
  -- direct_payment_donation_id
  -- =======================================================

  old_state JSONB NOT NULL,

  new_state JSONB NOT NULL,


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
  -- the correction.
  --
  -- Correction records themselves are immutable.
  -- =======================================================

  created_by UUID NOT NULL
    REFERENCES users(user_id)
    ON DELETE RESTRICT,

  created_at TIMESTAMPTZ NOT NULL
    DEFAULT CURRENT_TIMESTAMP,


  -- =======================================================
  -- Snapshot integrity
  -- =======================================================

    CONSTRAINT chk_funding_allocation_correction_old_state_object
    CHECK (
    jsonb_typeof(old_state) = 'object'
    AND old_state <> '{}'::jsonb
    ),

    CONSTRAINT chk_funding_allocation_correction_new_state_object
    CHECK (
    jsonb_typeof(new_state) = 'object'
    AND new_state <> '{}'::jsonb
    ),

  CONSTRAINT chk_funding_allocation_correction_state_changed
  CHECK (
    old_state IS DISTINCT FROM new_state
  ),


  -- =======================================================
  -- Correction reason
  -- =======================================================

  CONSTRAINT chk_funding_allocation_correction_reason
  CHECK (
    LENGTH(TRIM(correction_reason)) > 0
  ),


  -- =======================================================
  -- Timestamp integrity
  -- =======================================================

  CONSTRAINT chk_funding_allocation_corrected_at
  CHECK (
    corrected_at <= CURRENT_TIMESTAMP
  ),


  -- =======================================================
  -- Idempotency integrity
  -- =======================================================

  CONSTRAINT chk_funding_allocation_correction_idempotency_key
  CHECK (
    LENGTH(TRIM(idempotency_key)) > 0
  ),

  CONSTRAINT chk_funding_allocation_correction_request_hash
  CHECK (
    LENGTH(idempotency_request_hash) = 64
  ),

  CONSTRAINT uq_funding_allocation_correction_idempotency
  UNIQUE (
    created_by,
    idempotency_key
  )
);


-- =========================================================
-- Indexes
-- =========================================================

-- Full correction history for one funding allocation.
CREATE INDEX idx_funding_allocation_corrections_allocation
ON funding_allocation_corrections(allocation_id);


-- Chronological Finance audit history.
CREATE INDEX idx_funding_allocation_corrections_corrected_at
ON funding_allocation_corrections(corrected_at);


COMMIT;