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
export { hasCashMovementsForDonation, getCashMovementsByDonationId };
