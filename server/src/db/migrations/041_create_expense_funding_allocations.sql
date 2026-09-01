BEGIN;

-- =========================================================
-- M & P Shelter Monitoring System
-- 041_create_expense_funding_allocations.sql
--
-- Creates the split-funding table for expenses.
--
-- One expense may have one or many funding allocations.
--
-- Supported funding types:
--   SHELTER_FUNDS
--   PERSONAL_ADVANCE
--   PERSONAL_CONTRIBUTION
--   DIRECT_PAYMENT
-- =========================================================


CREATE TABLE expense_funding_allocations (

  -- =======================================================
  -- Primary identity
  -- =======================================================

  allocation_id UUID PRIMARY KEY
    DEFAULT gen_random_uuid(),


  -- =======================================================
  -- Expense being funded
  -- =======================================================

  expense_id UUID NOT NULL
    REFERENCES expenses(expense_id)
    ON DELETE RESTRICT,


  -- =======================================================
  -- Funding information
  -- =======================================================

  funding_type VARCHAR(30) NOT NULL,

  allocation_amount NUMERIC(12,2) NOT NULL,

  funded_at TIMESTAMPTZ NOT NULL,


  -- =======================================================
  -- Payment information
  --
  -- Finance-wide payment methods are standardized to:
  --   CASH
  --   E_WALLET
  --   BANK_TRANSFER
  --   OTHER
  --
  -- Example:
  --   payment_method   = E_WALLET
  --   payment_provider = GCASH
  -- =======================================================

  payment_method VARCHAR(30) NOT NULL,

  payment_provider VARCHAR(100),

  reference_number VARCHAR(255),

  CONSTRAINT chk_expense_funding_payment_provider
CHECK (
  payment_provider IS NULL
  OR LENGTH(TRIM(payment_provider)) > 0
),

CONSTRAINT chk_expense_funding_reference_number
CHECK (
  reference_number IS NULL
  OR LENGTH(TRIM(reference_number)) > 0
),


  -- =======================================================
  -- PERSONAL_ADVANCE identity
  --
  -- Person who personally paid and expects reimbursement.
  -- =======================================================

  advanced_by_user_id UUID
    REFERENCES users(user_id)
    ON DELETE RESTRICT,


  -- =======================================================
  -- PERSONAL_CONTRIBUTION identity
  --
  -- Person who paid personally but does NOT expect
  -- reimbursement.
  -- =======================================================

  contributed_by_user_id UUID
    REFERENCES users(user_id)
    ON DELETE RESTRICT,


  -- =======================================================
  -- DIRECT_PAYMENT identity
  --
  -- Exactly one payer identity is used:
  --
  --   direct_paid_by_user_id
  --     registered system user
  --
  -- OR
  --
  --   outside_payer_name
  --     payer outside the system
  -- =======================================================

  direct_paid_by_user_id UUID
    REFERENCES users(user_id)
    ON DELETE RESTRICT,

  outside_payer_name VARCHAR(150),


  -- =======================================================
  -- DIRECT_PAYMENT support/donation relationship
  --
  -- A DIRECT_PAYMENT allocation must link 1:1 to its
  -- corresponding DIRECT_PAYMENT donation/support record.
  -- =======================================================

  direct_payment_donation_id UUID
    REFERENCES donations(donation_id)
    ON DELETE RESTRICT,


  -- =======================================================
  -- Optional descriptive notes
  -- =======================================================

  notes TEXT,


  -- =======================================================
  -- Void audit
  --
  -- Financial allocations are never hard-deleted.
  -- =======================================================

  void_reason TEXT,

  voided_by UUID
    REFERENCES users(user_id)
    ON DELETE RESTRICT,

  voided_at TIMESTAMPTZ,


  -- =======================================================
  -- Creation idempotency
  --
  -- Allocation creation is a financial write and therefore
  -- requires durable idempotency information.
  -- =======================================================

  idempotency_key VARCHAR(255) NOT NULL,

  idempotency_request_hash VARCHAR(64) NOT NULL,


  -- =======================================================
  -- Audit
  -- =======================================================

  created_by UUID NOT NULL
    REFERENCES users(user_id)
    ON DELETE RESTRICT,

  updated_by UUID
    REFERENCES users(user_id)
    ON DELETE RESTRICT,

  created_at TIMESTAMPTZ NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

  updated_at TIMESTAMPTZ NOT NULL
    DEFAULT CURRENT_TIMESTAMP,


  -- =======================================================
  -- Funding type
  -- =======================================================

  CONSTRAINT chk_expense_funding_type
  CHECK (
    funding_type IN (
      'SHELTER_FUNDS',
      'PERSONAL_ADVANCE',
      'PERSONAL_CONTRIBUTION',
      'DIRECT_PAYMENT'
    )
  ),


  -- =======================================================
  -- Allocation amount
  -- =======================================================

  CONSTRAINT chk_expense_funding_allocation_amount
  CHECK (
    allocation_amount > 0
  ),


  -- =======================================================
  -- Funding timestamp
  -- =======================================================

  CONSTRAINT chk_expense_funding_funded_at
  CHECK (
    funded_at <= CURRENT_TIMESTAMP
  ),


  -- =======================================================
  -- Payment method
  -- =======================================================

  CONSTRAINT chk_expense_funding_payment_method
  CHECK (
    payment_method IN (
      'CASH',
      'E_WALLET',
      'BANK_TRANSFER',
      'OTHER'
    )
  ),


  -- =======================================================
  -- Outside payer name
  -- =======================================================

  CONSTRAINT chk_expense_funding_outside_payer_name
  CHECK (
    outside_payer_name IS NULL
    OR LENGTH(TRIM(outside_payer_name)) > 0
  ),


  -- =======================================================
  -- Funding identity integrity
  --
  -- SHELTER_FUNDS:
  --   no personal payer identity
  --   no DIRECT_PAYMENT donation
  --
  -- PERSONAL_ADVANCE:
  --   advanced_by_user_id required
  --
  -- PERSONAL_CONTRIBUTION:
  --   contributed_by_user_id required
  --
  -- DIRECT_PAYMENT:
  --   donation link required
  --   exactly one payer identity required
  -- =======================================================

  CONSTRAINT chk_expense_funding_identity
  CHECK (

    -- -----------------------------------------------------
    -- SHELTER_FUNDS
    -- -----------------------------------------------------

    (
      funding_type = 'SHELTER_FUNDS'

      AND advanced_by_user_id IS NULL
      AND contributed_by_user_id IS NULL

      AND direct_paid_by_user_id IS NULL
      AND outside_payer_name IS NULL
      AND direct_payment_donation_id IS NULL
    )

    OR

    -- -----------------------------------------------------
    -- PERSONAL_ADVANCE
    -- -----------------------------------------------------

    (
      funding_type = 'PERSONAL_ADVANCE'

      AND advanced_by_user_id IS NOT NULL

      AND contributed_by_user_id IS NULL
      AND direct_paid_by_user_id IS NULL
      AND outside_payer_name IS NULL
      AND direct_payment_donation_id IS NULL
    )

    OR

    -- -----------------------------------------------------
    -- PERSONAL_CONTRIBUTION
    -- -----------------------------------------------------

    (
      funding_type = 'PERSONAL_CONTRIBUTION'

      AND contributed_by_user_id IS NOT NULL

      AND advanced_by_user_id IS NULL
      AND direct_paid_by_user_id IS NULL
      AND outside_payer_name IS NULL
      AND direct_payment_donation_id IS NULL
    )

    OR

    -- -----------------------------------------------------
    -- DIRECT_PAYMENT
    -- -----------------------------------------------------

    (
      funding_type = 'DIRECT_PAYMENT'

      AND advanced_by_user_id IS NULL
      AND contributed_by_user_id IS NULL

      AND direct_payment_donation_id IS NOT NULL

      AND
      (
        (
          direct_paid_by_user_id IS NOT NULL
          AND outside_payer_name IS NULL
        )

        OR

        (
          direct_paid_by_user_id IS NULL
          AND outside_payer_name IS NOT NULL
          AND LENGTH(TRIM(outside_payer_name)) > 0
        )
      )
    )
  ),


  -- =======================================================
  -- Void integrity
  --
  -- Active:
  --   all void fields NULL
  --
  -- Voided:
  --   all void fields required
  --
  -- Void cannot occur before funding or in the future.
  -- =======================================================

  CONSTRAINT chk_expense_funding_void_fields
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

      AND voided_at >= funded_at
      AND voided_at <= CURRENT_TIMESTAMP
    )
  ),


  -- =======================================================
  -- Idempotency
  -- =======================================================

  CONSTRAINT chk_expense_funding_idempotency_key
  CHECK (
    LENGTH(TRIM(idempotency_key)) > 0
  ),

  CONSTRAINT chk_expense_funding_idempotency_request_hash
  CHECK (
    LENGTH(idempotency_request_hash) = 64
  ),


  -- Same ADMIN + same creation key cannot create another
  -- allocation.
  CONSTRAINT uq_expense_funding_idempotency
  UNIQUE (
    created_by,
    idempotency_key
  ),


  -- One DIRECT_PAYMENT donation/support record may fund only
  -- one allocation.
  --
  -- PostgreSQL allows multiple NULL values in UNIQUE, which
  -- is exactly what we want for non-DIRECT_PAYMENT rows.
  CONSTRAINT uq_expense_funding_direct_payment_donation
  UNIQUE (
    direct_payment_donation_id
  )
);


-- =========================================================
-- Indexes
-- =========================================================


-- Main lookup:
-- get all funding allocations belonging to an expense.
CREATE INDEX idx_expense_funding_allocations_expense
ON expense_funding_allocations(expense_id);


-- Funding-type queries and reports.
CREATE INDEX idx_expense_funding_allocations_type
ON expense_funding_allocations(funding_type);


-- Active allocations are used when calculating:
--
--   total funded
--   remaining fundable amount
--   funding status
CREATE INDEX idx_expense_funding_allocations_active_expense
ON expense_funding_allocations(expense_id)
WHERE voided_at IS NULL;


-- Personal advances belonging to a user.
CREATE INDEX idx_expense_funding_allocations_advanced_by
ON expense_funding_allocations(advanced_by_user_id)
WHERE advanced_by_user_id IS NOT NULL;


-- Personal contributions belonging to a user.
CREATE INDEX idx_expense_funding_allocations_contributed_by
ON expense_funding_allocations(contributed_by_user_id)
WHERE contributed_by_user_id IS NOT NULL;


-- Registered DIRECT_PAYMENT payer history.
CREATE INDEX idx_expense_funding_allocations_direct_paid_by
ON expense_funding_allocations(direct_paid_by_user_id)
WHERE direct_paid_by_user_id IS NOT NULL;


COMMIT;