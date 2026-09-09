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

async function createExpenseFundingAllocation(
  {
    expenseId,
    fundingType,
    allocationAmount,
    fundedAt,
    paymentMethod,
    paymentProvider,
    referenceNumber,
    advancedByUserId,
    contributedByUserId,
    directPaidByUserId,
    outsidePayerName,
    directPaymentDonationId,
    notes,
    idempotencyKey,
    idempotencyRequestHash,
    createdBy,
  },
  db = pool,
) {
  const result = await db.query(
    `
      INSERT INTO expense_funding_allocations (
        expense_id,
        funding_type,
        allocation_amount,
        funded_at,
        payment_method,
        payment_provider,
        reference_number,
        advanced_by_user_id,
        contributed_by_user_id,
        direct_paid_by_user_id,
        outside_payer_name,
        direct_payment_donation_id,
        notes,
        idempotency_key,
        idempotency_request_hash,
        created_by
      )
      VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15, $16
      )
      RETURNING
        allocation_id,
        expense_id,
        funding_type,
        allocation_amount::text AS allocation_amount,
        funded_at,
        payment_method,
        payment_provider,
        reference_number,
        advanced_by_user_id,
        contributed_by_user_id,
        direct_paid_by_user_id,
        outside_payer_name,
        direct_payment_donation_id,
        notes,
        void_reason,
        voided_by,
        voided_at,
        created_by,
        updated_by,
        created_at,
        updated_at
    `,
    [
      expenseId,
      fundingType,
      allocationAmount,
      fundedAt,
      paymentMethod,
      paymentProvider,
      referenceNumber,
      advancedByUserId,
      contributedByUserId,
      directPaidByUserId,
      outsidePayerName,
      directPaymentDonationId,
      notes,
      idempotencyKey,
      idempotencyRequestHash,
      createdBy,
    ],
  );

  return result.rows[0];
}

async function getActiveFundingTotalForExpense(expenseId, db = pool) {
  const result = await db.query(
    `
      SELECT
        COALESCE(SUM(allocation_amount), 0)::text
          AS active_funding_total
      FROM expense_funding_allocations
      WHERE expense_id = $1
        AND voided_at IS NULL
    `,
    [expenseId],
  );

  return result.rows[0].active_funding_total;
}

async function findExpenseFundingAllocationByIdempotencyKey(
  createdBy,
  idempotencyKey,
  db = pool,
) {
  const result = await db.query(
    `
      SELECT
        allocation_id,
        expense_id,
        funding_type,
        allocation_amount::text AS allocation_amount,
        funded_at,
        payment_method,
        payment_provider,
        reference_number,
        advanced_by_user_id,
        contributed_by_user_id,
        direct_paid_by_user_id,
        outside_payer_name,
        direct_payment_donation_id,
        notes,
        void_reason,
        voided_by,
        voided_at,
        idempotency_key,
        idempotency_request_hash,
        created_by,
        updated_by,
        created_at,
        updated_at
      FROM expense_funding_allocations
      WHERE created_by = $1
        AND idempotency_key = $2
    `,
    [createdBy, idempotencyKey],
  );

  return result.rows[0] || null;
}

async function findExpenseFundingAllocationByIdForUpdate(
  allocationId,
  db = pool,
) {
  const result = await db.query(
    `
      SELECT
        allocation_id,
        expense_id,
        funding_type,
        allocation_amount::text AS allocation_amount,
        funded_at,
        payment_method,
        payment_provider,
        reference_number,
        advanced_by_user_id,
        contributed_by_user_id,
        direct_paid_by_user_id,
        outside_payer_name,
        direct_payment_donation_id,
        notes,
        void_reason,
        voided_by,
        voided_at,
        idempotency_key,
        idempotency_request_hash,
        created_by,
        updated_by,
        created_at,
        updated_at
      FROM expense_funding_allocations
      WHERE allocation_id = $1
      FOR UPDATE
    `,
    [allocationId],
  );

  return result.rows[0] || null;
}

async function findExpenseFundingAllocationById(allocationId, db = pool) {
  const result = await db.query(
    `
      SELECT
        allocation_id,
        expense_id,
        funding_type,
        allocation_amount::text AS allocation_amount,
        funded_at,
        payment_method,
        payment_provider,
        reference_number,
        advanced_by_user_id,
        contributed_by_user_id,
        direct_paid_by_user_id,
        outside_payer_name,
        direct_payment_donation_id,
        notes,
        void_reason,
        voided_by,
        voided_at,
        created_by,
        updated_by,
        created_at,
        updated_at
      FROM expense_funding_allocations
      WHERE allocation_id = $1
    `,
    [allocationId],
  );

  return result.rows[0] || null;
}

async function getExpenseFundingAllocationsByExpenseId(expenseId, db = pool) {
  const result = await db.query(
    `
      SELECT
        allocation_id,
        expense_id,
        funding_type,
        allocation_amount::text AS allocation_amount,
        funded_at,
        payment_method,
        payment_provider,
        reference_number,
        advanced_by_user_id,
        contributed_by_user_id,
        direct_paid_by_user_id,
        outside_payer_name,
        direct_payment_donation_id,
        notes,
        void_reason,
        voided_by,
        voided_at,
        created_by,
        updated_by,
        created_at,
        updated_at
      FROM expense_funding_allocations
      WHERE expense_id = $1
      ORDER BY funded_at DESC, allocation_id DESC
    `,
    [expenseId],
  );

  return result.rows;
}

async function voidExpenseFundingAllocation(
  allocationId,
  voidedBy,
  voidReason,
  db = pool,
) {
  const result = await db.query(
    `
      UPDATE expense_funding_allocations
      SET
        void_reason = $2,
        voided_by = $3,
        voided_at = CURRENT_TIMESTAMP,
        updated_by = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE allocation_id = $1
        AND voided_at IS NULL
      RETURNING
        allocation_id,
        expense_id,
        funding_type,
        allocation_amount::text AS allocation_amount,
        funded_at,
        payment_method,
        payment_provider,
        reference_number,
        advanced_by_user_id,
        contributed_by_user_id,
        direct_paid_by_user_id,
        outside_payer_name,
        direct_payment_donation_id,
        notes,
        void_reason,
        voided_by,
        voided_at,
        created_by,
        updated_by,
        created_at,
        updated_at
    `,
    [allocationId, voidReason, voidedBy],
  );

  return result.rows[0] || null;
}

async function getAllocationUseCashMovements(allocationId, db = pool) {
  const result = await db.query(
    `
      SELECT
        cash_movement_id,
        donation_id,
        movement_type,
        movement_amount::text AS movement_amount,
        source_restriction_type,
        source_restriction_category,
        source_restricted_expense_id,
        allocation_id,
        related_cash_movement_id,
        created_by,
        created_at
      FROM finance_cash_source_movements
      WHERE allocation_id = $1
        AND movement_type = 'ALLOCATION_USE'
      ORDER BY created_at ASC, cash_movement_id ASC
    `,
    [allocationId],
  );

  return result.rows;
}

async function createFundingAllocationCorrection(
  {
    allocationId,
    oldState,
    newState,
    correctionReason,
    idempotencyKey,
    idempotencyRequestHash,
    createdBy,
  },
  db = pool,
) {
  const result = await db.query(
    `
      INSERT INTO funding_allocation_corrections (
        allocation_id,
        old_state,
        new_state,
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
        $4,
        CURRENT_TIMESTAMP,
        $5,
        $6,
        $7
      )
      RETURNING
        correction_id,
        allocation_id,
        old_state,
        new_state,
        correction_reason,
        corrected_at,
        idempotency_key,
        idempotency_request_hash,
        created_by,
        created_at
    `,
    [
      allocationId,
      oldState,
      newState,
      correctionReason,
      idempotencyKey,
      idempotencyRequestHash,
      createdBy,
    ],
  );

  return result.rows[0];
}

async function findFundingAllocationCorrectionByIdempotencyKey(
  createdBy,
  idempotencyKey,
  db = pool,
) {
  const result = await db.query(
    `
      SELECT
        correction_id,
        allocation_id,
        old_state,
        new_state,
        correction_reason,
        corrected_at,
        idempotency_key,
        idempotency_request_hash,
        created_by,
        created_at
      FROM funding_allocation_corrections
      WHERE created_by = $1
        AND idempotency_key = $2
    `,
    [createdBy, idempotencyKey],
  );

  return result.rows[0] || null;
}

async function updateExpenseFundingAllocation(
  allocationId,
  {
    allocationAmount,
    fundedAt,
    paymentMethod,
    paymentProvider,
    referenceNumber,
    advancedByUserId,
    contributedByUserId,
    directPaidByUserId,
    outsidePayerName,
    notes,
  },
  updatedBy,
  db = pool,
) {
  const result = await db.query(
    `
      UPDATE expense_funding_allocations
      SET
        allocation_amount = $2,
        funded_at = $3,
        payment_method = $4,
        payment_provider = $5,
        reference_number = $6,
        advanced_by_user_id = $7,
        contributed_by_user_id = $8,
        direct_paid_by_user_id = $9,
        outside_payer_name = $10,
        notes = $11,
        updated_by = $12,
        updated_at = CURRENT_TIMESTAMP
      WHERE allocation_id = $1
      RETURNING
        allocation_id,
        expense_id,
        funding_type,
        allocation_amount::text AS allocation_amount,
        funded_at,
        payment_method,
        payment_provider,
        reference_number,
        advanced_by_user_id,
        contributed_by_user_id,
        direct_paid_by_user_id,
        outside_payer_name,
        direct_payment_donation_id,
        notes,
        void_reason,
        voided_by,
        voided_at,
        created_by,
        updated_by,
        created_at,
        updated_at
    `,
    [
      allocationId,
      allocationAmount,
      fundedAt,
      paymentMethod,
      paymentProvider,
      referenceNumber,
      advancedByUserId,
      contributedByUserId,
      directPaidByUserId,
      outsidePayerName,
      notes,
      updatedBy,
    ],
  );

  return result.rows[0] || null;
}

async function getFundingAllocationCorrectionsByAllocationId(
  allocationId,
  db = pool,
) {
  const result = await db.query(
    `
      SELECT
        correction_id,
        allocation_id,
        old_state,
        new_state,
        correction_reason,
        corrected_at,
        created_by,
        created_at
      FROM funding_allocation_corrections
      WHERE allocation_id = $1
      ORDER BY corrected_at DESC, correction_id DESC
    `,
    [allocationId],
  );

  return result.rows;
}
export {
  hasFundingAllocationForDirectPaymentDonation,
  createExpenseFundingAllocation,
  findExpenseFundingAllocationByIdempotencyKey,
  findExpenseFundingAllocationByIdForUpdate,
  getExpenseFundingAllocationsByExpenseId,
  findExpenseFundingAllocationById,
  getActiveFundingTotalForExpense,
  voidExpenseFundingAllocation,
  getAllocationUseCashMovements,
  createFundingAllocationCorrection,
  findFundingAllocationCorrectionByIdempotencyKey,
  updateExpenseFundingAllocation,
  getFundingAllocationCorrectionsByAllocationId,
};
