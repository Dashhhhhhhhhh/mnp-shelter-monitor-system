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

export {
  hasReimbursementHistoryForAllocation,
  getEffectiveReimbursedAmountForAllocation,
};
