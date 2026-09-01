BEGIN;

-- =========================================================
-- M & P Shelter Monitoring System
-- 046_create_finance_cash_source_movements.sql
--
-- Immutable internal ledger showing how MONETARY donation
-- cash is consumed, restored, or consumed again.
--
-- This table is NOT exposed as a normal public CRUD
-- resource. Rows are generated inside parent Finance
-- transactions.
--
-- All movement amounts are stored as positive values.
-- movement_type determines whether the movement decreases
-- or restores available shelter cash.
-- =========================================================


CREATE TABLE finance_cash_source_movements (

  -- =======================================================
  -- Primary identity
  -- =======================================================

  cash_movement_id UUID PRIMARY KEY
    DEFAULT gen_random_uuid(),


  -- =======================================================
  -- Monetary donation providing the cash
  -- =======================================================

  donation_id UUID NOT NULL
    REFERENCES donations(donation_id)
    ON DELETE RESTRICT,


  -- =======================================================
  -- Movement
  --
  -- ALLOCATION_USE
  --   SHELTER_FUNDS allocation consumes cash.
  --
  -- ALLOCATION_RESTORE
  --   Allocation correction / void restores previously
  --   consumed shelter cash.
  --
  -- REIMBURSEMENT_USE
  --   Reimbursement consumes shelter cash.
  --
  -- REIMBURSEMENT_RESTORE
  --   Reimbursement reversal restores previously consumed
  --   cash.
  --
  -- REIMBURSEMENT_RECONSUME
  --   Reversal correction consumes restored cash again.
  -- =======================================================

  movement_type VARCHAR(40) NOT NULL,

  movement_amount NUMERIC(12,2) NOT NULL,


  -- =======================================================
  -- Restriction bucket snapshot
  --
  -- One monetary donation can eventually contain multiple
  -- effective buckets after partial donor-authorized
  -- restriction changes.
  --
  -- Example:
  --
  -- Donation = 5000 VET
  --
  -- Later:
  --   1000 VET -> GENERAL
  --
  -- Effective buckets:
  --   4000 RESTRICTED / VET
  --   1000 GENERAL
  --
  -- Every cash movement therefore records which exact
  -- restriction bucket supplied/restored the money.
  -- =======================================================

  source_restriction_type VARCHAR(20) NOT NULL,

  source_restriction_category VARCHAR(30),

  source_restricted_expense_id UUID
    REFERENCES expenses(expense_id)
    ON DELETE RESTRICT,


  -- =======================================================
  -- Parent financial operation
  --
  -- Exactly one parent column is used depending on
  -- movement_type.
  -- =======================================================

  allocation_id UUID
    REFERENCES expense_funding_allocations(allocation_id)
    ON DELETE RESTRICT,

  reimbursement_id UUID
    REFERENCES personal_advance_reimbursements(reimbursement_id)
    ON DELETE RESTRICT,

  reversal_id UUID
    REFERENCES reimbursement_reversals(reversal_id)
    ON DELETE RESTRICT,

  correction_id UUID
    REFERENCES reimbursement_reversal_corrections(correction_id)
    ON DELETE RESTRICT,


  -- =======================================================
  -- Related cash movement
  --
  -- Restoration / reconsumption movements point back to
  -- the exact movement whose financial effect they modify.
  --
  -- Examples:
  --
  -- ALLOCATION_RESTORE
  --   -> original ALLOCATION_USE
  --
  -- REIMBURSEMENT_RESTORE
  --   -> original REIMBURSEMENT_USE
  --
  -- REIMBURSEMENT_RECONSUME
  --   -> corresponding REIMBURSEMENT_RESTORE
  --
  -- This lets us restore the SAME original donation bucket
  -- instead of selecting another source later.
  -- =======================================================

  related_cash_movement_id UUID
    REFERENCES finance_cash_source_movements(cash_movement_id)
    ON DELETE RESTRICT,


  -- =======================================================
  -- Audit
  --
  -- created_by is inherited from the authenticated ADMIN
  -- performing the parent Finance operation.
  --
  -- Cash movement rows are immutable.
  -- =======================================================

  created_by UUID NOT NULL
    REFERENCES users(user_id)
    ON DELETE RESTRICT,

  created_at TIMESTAMPTZ NOT NULL
    DEFAULT CURRENT_TIMESTAMP,


  -- =======================================================
  -- Movement type integrity
  -- =======================================================

  CONSTRAINT chk_finance_cash_movement_type
  CHECK (
    movement_type IN (
      'ALLOCATION_USE',
      'ALLOCATION_RESTORE',
      'REIMBURSEMENT_USE',
      'REIMBURSEMENT_RESTORE',
      'REIMBURSEMENT_RECONSUME'
    )
  ),


  -- =======================================================
  -- Amount integrity
  -- =======================================================

  CONSTRAINT chk_finance_cash_movement_amount
  CHECK (
    movement_amount > 0
  ),


  -- =======================================================
  -- Restriction bucket integrity
  -- =======================================================

  CONSTRAINT chk_finance_cash_source_restriction_type
  CHECK (
    source_restriction_type IN (
      'GENERAL',
      'RESTRICTED'
    )
  ),


  CONSTRAINT chk_finance_cash_source_restriction_state
  CHECK (
    (
      source_restriction_type = 'GENERAL'

      AND source_restriction_category IS NULL
      AND source_restricted_expense_id IS NULL
    )

    OR

    (
      source_restriction_type = 'RESTRICTED'

      AND source_restriction_category IS NOT NULL

      AND source_restriction_category IN (
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

      AND
      (
        (
          source_restriction_category = 'SPECIFIC_EXPENSE'
          AND source_restricted_expense_id IS NOT NULL
        )

        OR

        (
          source_restriction_category
            IS DISTINCT FROM 'SPECIFIC_EXPENSE'

          AND source_restricted_expense_id IS NULL
        )
      )
    )
  ),


  -- =======================================================
  -- Parent relationship integrity
  --
  -- USE movements do not point to an earlier movement.
  --
  -- RESTORE / RECONSUME movements must point to the exact
  -- previous cash movement they are modifying.
  -- =======================================================

  CONSTRAINT chk_finance_cash_movement_parent
  CHECK (

    -- -----------------------------------------------------
    -- SHELTER_FUNDS allocation consumes cash
    -- -----------------------------------------------------

    (
      movement_type = 'ALLOCATION_USE'

      AND allocation_id IS NOT NULL

      AND reimbursement_id IS NULL
      AND reversal_id IS NULL
      AND correction_id IS NULL

      AND related_cash_movement_id IS NULL
    )

    OR

    -- -----------------------------------------------------
    -- SHELTER_FUNDS allocation correction / void restores
    -- previously consumed cash
    -- -----------------------------------------------------

    (
      movement_type = 'ALLOCATION_RESTORE'

      AND allocation_id IS NOT NULL

      AND reimbursement_id IS NULL
      AND reversal_id IS NULL
      AND correction_id IS NULL

      AND related_cash_movement_id IS NOT NULL
    )

    OR

    -- -----------------------------------------------------
    -- Personal-advance reimbursement consumes cash
    -- -----------------------------------------------------

    (
      movement_type = 'REIMBURSEMENT_USE'

      AND reimbursement_id IS NOT NULL

      AND allocation_id IS NULL
      AND reversal_id IS NULL
      AND correction_id IS NULL

      AND related_cash_movement_id IS NULL
    )

    OR

    -- -----------------------------------------------------
    -- Reimbursement reversal restores cash
    -- -----------------------------------------------------

    (
      movement_type = 'REIMBURSEMENT_RESTORE'

      AND reversal_id IS NOT NULL

      AND allocation_id IS NULL
      AND reimbursement_id IS NULL
      AND correction_id IS NULL

      AND related_cash_movement_id IS NOT NULL
    )

    OR

    -- -----------------------------------------------------
    -- Reversal correction consumes restored cash again
    -- -----------------------------------------------------

    (
      movement_type = 'REIMBURSEMENT_RECONSUME'

      AND correction_id IS NOT NULL

      AND allocation_id IS NULL
      AND reimbursement_id IS NULL
      AND reversal_id IS NULL

      AND related_cash_movement_id IS NOT NULL
    )
  ),


  -- A movement cannot directly reference itself.
  CONSTRAINT chk_finance_cash_movement_not_self_related
  CHECK (
    related_cash_movement_id IS NULL
    OR related_cash_movement_id <> cash_movement_id
  )
);


-- =========================================================
-- Indexes
-- =========================================================


-- Calculate effective cash remaining for one monetary
-- donation.
CREATE INDEX idx_finance_cash_movements_donation
ON finance_cash_source_movements(donation_id);


-- Calculate available cash for a specific restriction bucket.
CREATE INDEX idx_finance_cash_movements_donation_bucket
ON finance_cash_source_movements(
  donation_id,
  source_restriction_type,
  source_restriction_category,
  source_restricted_expense_id
);


-- Cash movements generated by SHELTER_FUNDS allocations.
CREATE INDEX idx_finance_cash_movements_allocation
ON finance_cash_source_movements(allocation_id)
WHERE allocation_id IS NOT NULL;


-- Cash consumed by reimbursements.
CREATE INDEX idx_finance_cash_movements_reimbursement
ON finance_cash_source_movements(reimbursement_id)
WHERE reimbursement_id IS NOT NULL;


-- Cash restored by reimbursement reversals.
CREATE INDEX idx_finance_cash_movements_reversal
ON finance_cash_source_movements(reversal_id)
WHERE reversal_id IS NOT NULL;


-- Cash consumed again by reversal corrections.
CREATE INDEX idx_finance_cash_movements_correction
ON finance_cash_source_movements(correction_id)
WHERE correction_id IS NOT NULL;


-- Find restoration / reconsumption movements belonging to
-- an earlier cash movement.
CREATE INDEX idx_finance_cash_movements_related
ON finance_cash_source_movements(related_cash_movement_id)
WHERE related_cash_movement_id IS NOT NULL;


COMMIT;