import pool from "../../../config/db.js";

async function hasCashMovementsForDonation(donationId, db = pool) {
  const result = await db.query(
    `
    SELECT EXISTS (
      SELECT 1
      FROM finance_cash_source_movements
      WHERE donation_id = $1
    ) AS has_cash_movements
    `,
    [donationId],
  );

  return result.rows[0].has_cash_movements;
}

async function getCashMovementsByDonationId(donationId, db = pool) {
  const result = await db.query(
    `
    SELECT
      cash_movement_id,
      donation_id,
      movement_type,
      movement_amount,
      source_restriction_type,
      source_restriction_category,
      source_restricted_expense_id,
      created_at
    FROM finance_cash_source_movements
    WHERE donation_id = $1
    ORDER BY created_at ASC
    `,
    [donationId],
  );

  return result.rows;
}

async function createFinanceCashSourceMovement(
  {
    donationId,
    movementType,
    movementAmount,
    sourceRestrictionType,
    sourceRestrictionCategory,
    sourceRestrictedExpenseId,
    allocationId,
    reimbursementId,
    reversalId,
    correctionId,
    relatedCashMovementId,
    createdBy,
  },
  db = pool,
) {
  const result = await db.query(
    `
      INSERT INTO finance_cash_source_movements (
        donation_id,
        movement_type,
        movement_amount,
        source_restriction_type,
        source_restriction_category,
        source_restricted_expense_id,
        allocation_id,
        reimbursement_id,
        reversal_id,
        correction_id,
        related_cash_movement_id,
        created_by
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12
      )
      RETURNING
        cash_movement_id,
        donation_id,
        movement_type,
        movement_amount::text AS movement_amount,
        source_restriction_type,
        source_restriction_category,
        source_restricted_expense_id,
        allocation_id,
        reimbursement_id,
        reversal_id,
        correction_id,
        related_cash_movement_id,
        created_by,
        created_at
    `,
    [
      donationId,
      movementType,
      movementAmount,
      sourceRestrictionType,
      sourceRestrictionCategory,
      sourceRestrictedExpenseId,
      allocationId,
      reimbursementId,
      reversalId,
      correctionId,
      relatedCashMovementId,
      createdBy,
    ],
  );

  return result.rows[0];
}

async function getEligibleCashSourceBucketsForExpense(
  expenseId,
  expenseCategory,
  db = pool,
) {
  const result = await db.query(
    `
      WITH active_monetary_donations AS (
        SELECT
          donation_id,
          donated_at,
          monetary_amount,
          fund_restriction,
          restriction_category,
          restricted_expense_id
        FROM donations
        WHERE donation_type = 'MONETARY'
          AND voided_at IS NULL
      ),

      bucket_entries AS (
        -- Original donation bucket
        SELECT
          d.donation_id,
          d.donated_at,
          d.fund_restriction AS restriction_type,
          d.restriction_category,
          d.restricted_expense_id,
          d.monetary_amount AS amount_change
        FROM active_monetary_donations d

        UNION ALL

        -- Money leaving a bucket
        SELECT
          d.donation_id,
          d.donated_at,
          rc.from_restriction_type,
          rc.from_restriction_category,
          rc.from_restricted_expense_id,
          -rc.change_amount
        FROM donation_restriction_changes rc
        JOIN active_monetary_donations d
          ON d.donation_id = rc.donation_id

        UNION ALL

        -- Money entering another bucket
        SELECT
          d.donation_id,
          d.donated_at,
          rc.to_restriction_type,
          rc.to_restriction_category,
          rc.to_restricted_expense_id,
          rc.change_amount
        FROM donation_restriction_changes rc
        JOIN active_monetary_donations d
          ON d.donation_id = rc.donation_id

        UNION ALL

        -- Cash usage/restoration
        SELECT
          d.donation_id,
          d.donated_at,
          m.source_restriction_type,
          m.source_restriction_category,
          m.source_restricted_expense_id,
          CASE
            WHEN m.movement_type IN (
              'ALLOCATION_USE',
              'REIMBURSEMENT_USE',
              'REIMBURSEMENT_RECONSUME'
            )
              THEN -m.movement_amount

            WHEN m.movement_type IN (
              'ALLOCATION_RESTORE',
              'REIMBURSEMENT_RESTORE'
            )
              THEN m.movement_amount

            ELSE 0
          END
        FROM finance_cash_source_movements m
        JOIN active_monetary_donations d
          ON d.donation_id = m.donation_id
      ),

      current_buckets AS (
        SELECT
          donation_id,
          donated_at,
          restriction_type,
          restriction_category,
          restricted_expense_id,
          SUM(amount_change) AS available_amount
        FROM bucket_entries
        GROUP BY
          donation_id,
          donated_at,
          restriction_type,
          restriction_category,
          restricted_expense_id
      )

      SELECT
        donation_id,
        donated_at,
        restriction_type,
        restriction_category,
        restricted_expense_id,
        available_amount::text AS available_amount
      FROM current_buckets
      WHERE available_amount > 0
        AND (
          restriction_type = 'GENERAL'
          OR
          (
            restriction_type = 'RESTRICTED'
            AND (
              restriction_category = $2
              OR
              (
                restriction_category = 'SPECIFIC_EXPENSE'
                AND restricted_expense_id = $1
              )
            )
          )
        )
      ORDER BY
        CASE
          WHEN restriction_type = 'GENERAL' THEN 0
          ELSE 1
        END,
        donated_at ASC,
        donation_id ASC
    `,
    [expenseId, expenseCategory],
  );

  return result.rows;
}

async function lockActiveMonetaryDonationsForCashUse(db = pool) {
  const result = await db.query(
    `
      SELECT
        donation_id
      FROM donations
      WHERE donation_type = 'MONETARY'
        AND voided_at IS NULL
      ORDER BY donated_at ASC, donation_id ASC
      FOR UPDATE
    `,
  );

  return result.rows;
}

async function getRestorableAllocationUseCashMovements(
  allocationId,
  db = pool,
) {
  const result = await db.query(
    `
      SELECT
        use_movement.cash_movement_id,
        use_movement.donation_id,
        use_movement.movement_amount::text AS original_amount,

        (
          use_movement.movement_amount
          -
          COALESCE(
            SUM(restore_movement.movement_amount),
            0
          )
        )::text AS restorable_amount,

        use_movement.source_restriction_type,
        use_movement.source_restriction_category,
        use_movement.source_restricted_expense_id,
        use_movement.created_at

      FROM finance_cash_source_movements use_movement

      LEFT JOIN finance_cash_source_movements restore_movement
        ON restore_movement.related_cash_movement_id =
          use_movement.cash_movement_id
        AND restore_movement.movement_type =
          'ALLOCATION_RESTORE'

      WHERE use_movement.allocation_id = $1
        AND use_movement.movement_type =
          'ALLOCATION_USE'

      GROUP BY
        use_movement.cash_movement_id,
        use_movement.donation_id,
        use_movement.movement_amount,
        use_movement.source_restriction_type,
        use_movement.source_restriction_category,
        use_movement.source_restricted_expense_id,
        use_movement.created_at

      HAVING
        use_movement.movement_amount
        -
        COALESCE(
          SUM(restore_movement.movement_amount),
          0
        ) > 0

      ORDER BY
        use_movement.created_at DESC,
        use_movement.cash_movement_id DESC
    `,
    [allocationId],
  );

  return result.rows;
}

export {
  hasCashMovementsForDonation,
  getCashMovementsByDonationId,
  createFinanceCashSourceMovement,
  getEligibleCashSourceBucketsForExpense,
  lockActiveMonetaryDonationsForCashUse,
  getRestorableAllocationUseCashMovements,
};
