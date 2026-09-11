import pool from "../../../config/db.js";

async function hasReimbursementHistoryForAllocation(allocationId, db = pool) {
  const result = await db.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM personal_advance_reimbursements
        WHERE allocation_id = $1
      ) AS has_reimbursement_history
    `,
    [allocationId],
  );

  return result.rows[0].has_reimbursement_history;
}

async function getEffectiveReimbursedAmountForAllocation(
  allocationId,
  db = pool,
) {
  const result = await db.query(
    `
      WITH allocation_reimbursements AS (
        SELECT
          reimbursement_id,
          reimbursement_amount
        FROM personal_advance_reimbursements
        WHERE allocation_id = $1
      ),

      reversal_totals AS (
        SELECT
          rr.reimbursement_id,
          SUM(rr.reversal_amount) AS reversed_amount
        FROM reimbursement_reversals rr
        JOIN allocation_reimbursements ar
          ON ar.reimbursement_id = rr.reimbursement_id
        GROUP BY rr.reimbursement_id
      ),

      correction_totals AS (
        SELECT
          rr.reimbursement_id,
          SUM(rc.correction_amount) AS correction_amount
        FROM reimbursement_reversal_corrections rc
        JOIN reimbursement_reversals rr
          ON rr.reversal_id = rc.reversal_id
        JOIN allocation_reimbursements ar
          ON ar.reimbursement_id = rr.reimbursement_id
        GROUP BY rr.reimbursement_id
      )

      SELECT
        COALESCE(
          SUM(
            ar.reimbursement_amount
            - COALESCE(rt.reversed_amount, 0)
            + COALESCE(ct.correction_amount, 0)
          ),
          0
        )::text AS effective_reimbursed_amount
      FROM allocation_reimbursements ar
      LEFT JOIN reversal_totals rt
        ON rt.reimbursement_id = ar.reimbursement_id
      LEFT JOIN correction_totals ct
        ON ct.reimbursement_id = ar.reimbursement_id
    `,
    [allocationId],
  );

  return result.rows[0].effective_reimbursed_amount;
}

async function createPersonalAdvanceReimbursement(
  {
    allocationId,
    reimbursementAmount,
    reimbursedAt,
    paymentMethod,
    paymentProvider,
    referenceNumber,
    notes,
    idempotencyKey,
    idempotencyRequestHash,
    createdBy,
  },
  db = pool,
) {
  const result = await db.query(
    `
      INSERT INTO personal_advance_reimbursements (
        allocation_id,
        reimbursement_amount,
        reimbursed_at,
        payment_method,
        payment_provider,
        reference_number,
        notes,
        idempotency_key,
        idempotency_request_hash,
        created_by
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10
      )
      RETURNING
        reimbursement_id,
        allocation_id,
        reimbursement_amount::text AS reimbursement_amount,
        reimbursed_at,
        payment_method,
        payment_provider,
        reference_number,
        notes,
        idempotency_key,
        idempotency_request_hash,
        created_by,
        created_at
    `,
    [
      allocationId,
      reimbursementAmount,
      reimbursedAt,
      paymentMethod,
      paymentProvider,
      referenceNumber,
      notes,
      idempotencyKey,
      idempotencyRequestHash,
      createdBy,
    ],
  );

  return result.rows[0];
}

async function findReimbursementByIdempotencyKey(
  createdBy,
  idempotencyKey,
  db = pool,
) {
  const result = await db.query(
    `
      SELECT
        reimbursement_id,
        allocation_id,
        reimbursement_amount::text AS reimbursement_amount,
        reimbursed_at,
        payment_method,
        payment_provider,
        reference_number,
        notes,
        idempotency_key,
        idempotency_request_hash,
        created_by,
        created_at
      FROM personal_advance_reimbursements
      WHERE created_by = $1
        AND idempotency_key = $2
    `,
    [createdBy, idempotencyKey],
  );

  return result.rows[0] || null;
}

async function findReimbursementByIdForUpdate(reimbursementId, db = pool) {
  const result = await db.query(
    `
      SELECT
        reimbursement_id,
        allocation_id,
        reimbursement_amount::text AS reimbursement_amount,
        reimbursed_at,
        payment_method,
        payment_provider,
        reference_number,
        notes,
        idempotency_key,
        idempotency_request_hash,
        created_by,
        created_at
      FROM personal_advance_reimbursements
      WHERE reimbursement_id = $1
      FOR UPDATE
    `,
    [reimbursementId],
  );

  return result.rows[0] || null;
}

async function createReimbursementReversal(
  {
    reimbursementId,
    reversalAmount,
    reversalReason,
    idempotencyKey,
    idempotencyRequestHash,
    createdBy,
  },
  db = pool,
) {
  const result = await db.query(
    `
      INSERT INTO reimbursement_reversals (
        reimbursement_id,
        reversal_amount,
        reversal_reason,
        reversed_at,
        idempotency_key,
        idempotency_request_hash,
        created_by
      )
      VALUES (
        $1,
        $2,
        $3,
        CURRENT_TIMESTAMP,
        $4,
        $5,
        $6
      )
      RETURNING
        reversal_id,
        reimbursement_id,
        reversal_amount::text AS reversal_amount,
        reversal_reason,
        reversed_at,
        idempotency_key,
        idempotency_request_hash,
        created_by,
        created_at
    `,
    [
      reimbursementId,
      reversalAmount,
      reversalReason,
      idempotencyKey,
      idempotencyRequestHash,
      createdBy,
    ],
  );

  return result.rows[0];
}

async function findReimbursementReversalByIdempotencyKey(
  createdBy,
  idempotencyKey,
  db = pool,
) {
  const result = await db.query(
    `
      SELECT
        reversal_id,
        reimbursement_id,
        reversal_amount::text AS reversal_amount,
        reversal_reason,
        reversed_at,
        idempotency_key,
        idempotency_request_hash,
        created_by,
        created_at
      FROM reimbursement_reversals
      WHERE created_by = $1
        AND idempotency_key = $2
    `,
    [createdBy, idempotencyKey],
  );

  return result.rows[0] || null;
}

async function getRemainingReversibleAmountForReimbursement(
  reimbursementId,
  db = pool,
) {
  const result = await db.query(
    `
      WITH reversal_total AS (
        SELECT
          COALESCE(SUM(reversal_amount), 0) AS total_reversed
        FROM reimbursement_reversals
        WHERE reimbursement_id = $1
      ),

      correction_total AS (
        SELECT
          COALESCE(SUM(rrc.correction_amount), 0) AS total_corrected
        FROM reimbursement_reversal_corrections rrc
        JOIN reimbursement_reversals rr
          ON rr.reversal_id = rrc.reversal_id
        WHERE rr.reimbursement_id = $1
      )

      SELECT
        (
          pr.reimbursement_amount
          - rt.total_reversed
          + ct.total_corrected
        )::text AS remaining_reversible_amount

      FROM personal_advance_reimbursements pr
      CROSS JOIN reversal_total rt
      CROSS JOIN correction_total ct

      WHERE pr.reimbursement_id = $1
    `,
    [reimbursementId],
  );

  return result.rows[0]?.remaining_reversible_amount ?? null;
}

async function getRestorableReimbursementUseCashMovements(
  reimbursementId,
  db = pool,
) {
  const result = await db.query(
    `
      WITH restore_effects AS (
        SELECT
          use_movement.cash_movement_id
            AS use_movement_id,

          SUM(
            restore.movement_amount
            -
            COALESCE(
              (
                SELECT
                  SUM(reconsume.movement_amount)
                FROM finance_cash_source_movements reconsume
                WHERE reconsume.related_cash_movement_id =
                  restore.cash_movement_id
                  AND reconsume.movement_type =
                    'REIMBURSEMENT_RECONSUME'
              ),
              0
            )
          ) AS net_restored

        FROM finance_cash_source_movements use_movement

        JOIN finance_cash_source_movements restore
          ON restore.related_cash_movement_id =
            use_movement.cash_movement_id
          AND restore.movement_type =
            'REIMBURSEMENT_RESTORE'

        WHERE use_movement.reimbursement_id = $1
          AND use_movement.movement_type =
            'REIMBURSEMENT_USE'

        GROUP BY
          use_movement.cash_movement_id
      )

      SELECT
        use_movement.cash_movement_id,
        use_movement.donation_id,

        use_movement.movement_amount::text
          AS original_amount,

        (
          use_movement.movement_amount
          -
          COALESCE(
            restore_effects.net_restored,
            0
          )
        )::text AS restorable_amount,

        use_movement.source_restriction_type,
        use_movement.source_restriction_category,
        use_movement.source_restricted_expense_id,
        use_movement.created_at

      FROM finance_cash_source_movements use_movement

      LEFT JOIN restore_effects
        ON restore_effects.use_movement_id =
          use_movement.cash_movement_id

      WHERE use_movement.reimbursement_id = $1
        AND use_movement.movement_type =
          'REIMBURSEMENT_USE'

        AND (
          use_movement.movement_amount
          -
          COALESCE(
            restore_effects.net_restored,
            0
          )
        ) > 0

      ORDER BY
        use_movement.created_at DESC,
        use_movement.cash_movement_id DESC
    `,
    [reimbursementId],
  );

  return result.rows;
}

async function createReimbursementReversalCorrection(
  {
    reversalId,
    correctionAmount,
    correctionReason,
    idempotencyKey,
    idempotencyRequestHash,
    createdBy,
  },
  db = pool,
) {
  const result = await db.query(
    `
      INSERT INTO reimbursement_reversal_corrections (
        reversal_id,
        correction_amount,
        correction_reason,
        corrected_at,
        idempotency_key,
        idempotency_request_hash,
        created_by
      )
      VALUES (
        $1,
        $2,
        $3,
        CURRENT_TIMESTAMP,
        $4,
        $5,
        $6
      )
      RETURNING
        correction_id,
        reversal_id,
        correction_amount::text AS correction_amount,
        correction_reason,
        corrected_at,
        idempotency_key,
        idempotency_request_hash,
        created_by,
        created_at
    `,
    [
      reversalId,
      correctionAmount,
      correctionReason,
      idempotencyKey,
      idempotencyRequestHash,
      createdBy,
    ],
  );

  return result.rows[0];
}

async function findReimbursementReversalCorrectionByIdempotencyKey(
  createdBy,
  idempotencyKey,
  db = pool,
) {
  const result = await db.query(
    `
      SELECT
        correction_id,
        reversal_id,
        correction_amount::text AS correction_amount,
        correction_reason,
        corrected_at,
        idempotency_key,
        idempotency_request_hash,
        created_by,
        created_at
      FROM reimbursement_reversal_corrections
      WHERE created_by = $1
        AND idempotency_key = $2
    `,
    [createdBy, idempotencyKey],
  );

  return result.rows[0] || null;
}

async function getRemainingCorrectableAmountForReversal(reversalId, db = pool) {
  const result = await db.query(
    `
      SELECT
        (
          rr.reversal_amount
          -
          COALESCE(
            SUM(rrc.correction_amount),
            0
          )
        )::text AS remaining_correctable_amount

      FROM reimbursement_reversals rr

      LEFT JOIN reimbursement_reversal_corrections rrc
        ON rrc.reversal_id = rr.reversal_id

      WHERE rr.reversal_id = $1

      GROUP BY
        rr.reversal_id,
        rr.reversal_amount
    `,
    [reversalId],
  );

  return result.rows[0]?.remaining_correctable_amount ?? null;
}

async function getReconsumableReimbursementRestoreCashMovements(
  reversalId,
  db = pool,
) {
  const result = await db.query(
    `
      SELECT
        restore.cash_movement_id,
        restore.donation_id,

        restore.movement_amount::text
          AS original_restore_amount,

        (
          restore.movement_amount
          -
          COALESCE(
            SUM(reconsume.movement_amount),
            0
          )
        )::text AS reconsumable_amount,

        restore.source_restriction_type,
        restore.source_restriction_category,
        restore.source_restricted_expense_id,

        restore.created_at

      FROM finance_cash_source_movements restore

      LEFT JOIN finance_cash_source_movements reconsume
        ON reconsume.related_cash_movement_id =
          restore.cash_movement_id
        AND reconsume.movement_type =
          'REIMBURSEMENT_RECONSUME'

      WHERE restore.reversal_id = $1
        AND restore.movement_type =
          'REIMBURSEMENT_RESTORE'

      GROUP BY
        restore.cash_movement_id,
        restore.donation_id,
        restore.movement_amount,
        restore.source_restriction_type,
        restore.source_restriction_category,
        restore.source_restricted_expense_id,
        restore.created_at

      HAVING
        restore.movement_amount
        -
        COALESCE(
          SUM(reconsume.movement_amount),
          0
        ) > 0

      ORDER BY
        restore.created_at ASC,
        restore.cash_movement_id ASC
    `,
    [reversalId],
  );

  return result.rows;
}

async function findReimbursementReversalByIdForUpdate(reversalId, db = pool) {
  const result = await db.query(
    `
      SELECT
        reversal_id,
        reimbursement_id,
        reversal_amount::text AS reversal_amount,
        reversal_reason,
        reversed_at,
        idempotency_key,
        idempotency_request_hash,
        created_by,
        created_at
      FROM reimbursement_reversals
      WHERE reversal_id = $1
      FOR UPDATE
    `,
    [reversalId],
  );

  return result.rows[0] || null;
}

async function getReimbursementsByAllocationId(allocationId, db = pool) {
  const result = await db.query(
    `
      SELECT
        reimbursement_id,
        allocation_id,
        reimbursement_amount::text AS reimbursement_amount,
        reimbursed_at,
        payment_method,
        payment_provider,
        reference_number,
        notes,
        created_by,
        created_at
      FROM personal_advance_reimbursements
      WHERE allocation_id = $1
      ORDER BY reimbursed_at DESC, reimbursement_id DESC
    `,
    [allocationId],
  );

  return result.rows;
}

async function getReimbursementReversalsByReimbursementId(
  reimbursementId,
  db = pool,
) {
  const result = await db.query(
    `
      SELECT
        reversal_id,
        reimbursement_id,
        reversal_amount::text AS reversal_amount,
        reversal_reason,
        reversed_at,
        created_by,
        created_at
      FROM reimbursement_reversals
      WHERE reimbursement_id = $1
      ORDER BY reversed_at DESC, reversal_id DESC
    `,
    [reimbursementId],
  );

  return result.rows;
}

async function findReimbursementById(reimbursementId, db = pool) {
  const result = await db.query(
    `
      SELECT
        reimbursement_id,
        allocation_id,
        reimbursement_amount::text AS reimbursement_amount,
        reimbursed_at,
        payment_method,
        payment_provider,
        reference_number,
        notes,
        idempotency_key,
        idempotency_request_hash,
        created_by,
        created_at
      FROM personal_advance_reimbursements
      WHERE reimbursement_id = $1
    `,
    [reimbursementId],
  );

  return result.rows[0] || null;
}

async function getReimbursementReversalCorrectionsByReversalId(
  reversalId,
  db = pool,
) {
  const result = await db.query(
    `
      SELECT
        correction_id,
        reversal_id,
        correction_amount::text AS correction_amount,
        correction_reason,
        corrected_at,
        created_by,
        created_at
      FROM reimbursement_reversal_corrections
      WHERE reversal_id = $1
      ORDER BY corrected_at DESC, correction_id DESC
    `,
    [reversalId],
  );

  return result.rows;
}

async function findReimbursementReversalById(reversalId, db = pool) {
  const result = await db.query(
    `
      SELECT
        reversal_id,
        reimbursement_id,
        reversal_amount::text AS reversal_amount,
        reversal_reason,
        reversed_at,
        idempotency_key,
        idempotency_request_hash,
        created_by,
        created_at
      FROM reimbursement_reversals
      WHERE reversal_id = $1
    `,
    [reversalId],
  );

  return result.rows[0] || null;
}
export {
  hasReimbursementHistoryForAllocation,
  getEffectiveReimbursedAmountForAllocation,
  createPersonalAdvanceReimbursement,
  findReimbursementByIdempotencyKey,
  findReimbursementByIdForUpdate,
  createReimbursementReversal,
  findReimbursementReversalByIdempotencyKey,
  getRemainingReversibleAmountForReimbursement,
  getRestorableReimbursementUseCashMovements,
  createReimbursementReversalCorrection,
  findReimbursementReversalCorrectionByIdempotencyKey,
  getRemainingCorrectableAmountForReversal,
  getReconsumableReimbursementRestoreCashMovements,
  findReimbursementReversalByIdForUpdate,
  getReimbursementsByAllocationId,
  getReimbursementReversalsByReimbursementId,
  findReimbursementById,
  getReimbursementReversalCorrectionsByReversalId,
  findReimbursementReversalById,
};
