import pool from "../../../config/db.js";

async function hasFundingAllocationForDirectPaymentDonation(
  donationId,
  db = pool,
) {
  const result = await db.query(
    `
    SELECT EXISTS (
      SELECT 1
      FROM expense_funding_allocations
      WHERE direct_payment_donation_id = $1
    ) AS has_linked_allocation
    `,
    [donationId],
  );

  return result.rows[0].has_linked_allocation;
}

export { hasFundingAllocationForDirectPaymentDonation };
