import pool from "../../../config/db.js";

import {
  validateCreateExpenseFundingInput,
  validateVoidExpenseFundingInput,
  validateFundingAllocationCorrectionInput,
} from "../validations/expenseFunding.validation.js";

import {
  validateUuid,
  validateIdempotencyKey,
} from "../validations/finance.validation.utils.js";

import {
  createRequestHash,
  toCents,
  fromCents,
} from "../utils/finance.utils.js";

import { findExpenseByIdForUpdate } from "../repositories/expense.repository.js";

import {
  createExpenseFundingAllocation,
  findExpenseFundingAllocationByIdempotencyKey,
  getActiveFundingTotalForExpense,
  findExpenseFundingAllocationById,
  getExpenseFundingAllocationsByExpenseId,
  voidExpenseFundingAllocation,
  findExpenseFundingAllocationByIdForUpdate,
  createFundingAllocationCorrection,
  findFundingAllocationCorrectionByIdempotencyKey,
  updateExpenseFundingAllocation,
  getFundingAllocationCorrectionsByAllocationId,
} from "../repositories/expenseFunding.repository.js";

import {
  createFinanceCashSourceMovement,
  lockActiveMonetaryDonationsForCashUse,
  getEligibleCashSourceBucketsForExpense,
  getRestorableAllocationUseCashMovements,
} from "../repositories/financeCashMovement.repository.js";

import {
  hasReimbursementHistoryForAllocation,
  getEffectiveReimbursedAmountForAllocation,
} from "../repositories/reimbursement.repository.js";

import { findExpenseById } from "../repositories/expense.repository.js";

import {
  createDonation,
  findDonationByIdForUpdate,
  voidDonation,
} from "../repositories/donation.repository.js";

function mapExpenseFundingAllocation(allocation) {
  if (!allocation) return null;

  return {
    allocationId: allocation.allocation_id,
    expenseId: allocation.expense_id,

    fundingType: allocation.funding_type,
    allocationAmount: Number(allocation.allocation_amount),
    fundedAt: allocation.funded_at,

    paymentMethod: allocation.payment_method,
    paymentProvider: allocation.payment_provider,
    referenceNumber: allocation.reference_number,

    advancedByUserId: allocation.advanced_by_user_id,
    contributedByUserId: allocation.contributed_by_user_id,

    directPaidByUserId: allocation.direct_paid_by_user_id,
    outsidePayerName: allocation.outside_payer_name,
    directPaymentDonationId: allocation.direct_payment_donation_id,

    notes: allocation.notes,

    voidReason: allocation.void_reason,
    voidedBy: allocation.voided_by,
    voidedAt: allocation.voided_at,

    createdBy: allocation.created_by,
    updatedBy: allocation.updated_by,
    createdAt: allocation.created_at,
    updatedAt: allocation.updated_at,
  };
}

async function consumeCashBucketsForAllocation(
  buckets,
  allocationAmount,
  allocationId,
  createdBy,
  client,
) {
  let remainingCents = toCents(allocationAmount);

  for (const bucket of buckets) {
    if (remainingCents <= 0) break;

    const availableCents = toCents(bucket.available_amount);

    const centsToUse = Math.min(remainingCents, availableCents);

    if (centsToUse <= 0) continue;

    const amountToUse = fromCents(centsToUse);

    await createFinanceCashSourceMovement(
      {
        donationId: bucket.donation_id,
        movementType: "ALLOCATION_USE",
        movementAmount: amountToUse,

        sourceRestrictionType: bucket.restriction_type,

        sourceRestrictionCategory: bucket.restriction_category,

        sourceRestrictedExpenseId: bucket.restricted_expense_id,

        allocationId,

        reimbursementId: null,
        reversalId: null,
        correctionId: null,
        relatedCashMovementId: null,

        createdBy,
      },
      client,
    );

    remainingCents -= centsToUse;
  }

  if (remainingCents > 0) {
    const error = new Error("Insufficient eligible shelter funds");
    error.statusCode = 409;
    throw error;
  }
}

async function restoreCashBucketsForAllocation(
  allocationId,
  createdBy,
  client,
) {
  const movements = await getRestorableAllocationUseCashMovements(
    allocationId,
    client,
  );

  for (const movement of movements) {
    await createFinanceCashSourceMovement(
      {
        donationId: movement.donation_id,
        movementType: "ALLOCATION_RESTORE",
        movementAmount: Number(movement.restorable_amount),

        sourceRestrictionType: movement.source_restriction_type,

        sourceRestrictionCategory: movement.source_restriction_category,

        sourceRestrictedExpenseId: movement.source_restricted_expense_id,

        allocationId,

        relatedCashMovementId: movement.cash_movement_id,

        createdBy,
      },
      client,
    );
  }
}

function buildFundingAllocationState(allocation) {
  const fundedAt = allocation.funded_at ?? allocation.fundedAt;

  return {
    expenseId: allocation.expense_id ?? allocation.expenseId,

    fundingType: allocation.funding_type ?? allocation.fundingType,

    allocationAmount: Number(
      allocation.allocation_amount ?? allocation.allocationAmount,
    ),

    fundedAt: new Date(fundedAt).toISOString(),

    paymentMethod: allocation.payment_method ?? allocation.paymentMethod,

    paymentProvider:
      allocation.payment_provider ?? allocation.paymentProvider ?? null,

    referenceNumber:
      allocation.reference_number ?? allocation.referenceNumber ?? null,

    advancedByUserId:
      allocation.advanced_by_user_id ?? allocation.advancedByUserId ?? null,

    contributedByUserId:
      allocation.contributed_by_user_id ??
      allocation.contributedByUserId ??
      null,

    directPaidByUserId:
      allocation.direct_paid_by_user_id ??
      allocation.directPaidByUserId ??
      null,

    outsidePayerName:
      allocation.outside_payer_name ?? allocation.outsidePayerName ?? null,

    directPaymentDonationId:
      allocation.direct_payment_donation_id ??
      allocation.directPaymentDonationId ??
      null,

    notes: allocation.notes ?? null,
  };
}

function mapFundingAllocationCorrection(correction) {
  if (!correction) return null;

  return {
    correctionId: correction.correction_id,
    allocationId: correction.allocation_id,
    oldState: correction.old_state,
    newState: correction.new_state,
    correctionReason: correction.correction_reason,
    correctedAt: correction.corrected_at,
    createdBy: correction.created_by,
    createdAt: correction.created_at,
  };
}

async function createExpenseFundingAllocationService(
  expenseId,
  data,
  createdBy,
  idempotencyKey,
) {
  // 1. Validate request
  const validExpenseId = validateUuid(expenseId, "Expense ID");

  const validIdempotencyKey = validateIdempotencyKey(idempotencyKey);

  const validated = validateCreateExpenseFundingInput(data);

  // 2. Create idempotency request fingerprint
  const idempotencyRequestHash = createRequestHash({
    expenseId: validExpenseId,
    fundingType: validated.fundingType,
    allocationAmount: validated.allocationAmount,
    fundedAt: validated.fundedAt,
    paymentMethod: validated.paymentMethod,
    paymentProvider: validated.paymentProvider,
    referenceNumber: validated.referenceNumber,
    advancedByUserId: validated.advancedByUserId,
    contributedByUserId: validated.contributedByUserId,
    directPaidByUserId: validated.directPaidByUserId,
    outsidePayerName: validated.outsidePayerName,
    notes: validated.notes,
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 3. Check idempotency
    const existingAllocation =
      await findExpenseFundingAllocationByIdempotencyKey(
        createdBy,
        validIdempotencyKey,
        client,
      );

    if (existingAllocation) {
      if (
        existingAllocation.idempotency_request_hash !== idempotencyRequestHash
      ) {
        const error = new Error(
          "Idempotency key has already been used for a different expense funding request",
        );
        error.statusCode = 409;
        throw error;
      }

      await client.query("COMMIT");

      return {
        allocation: mapExpenseFundingAllocation(existingAllocation),
        isReplay: true,
      };
    }

    // 4. Lock the expense
    const expense = await findExpenseByIdForUpdate(validExpenseId, client);

    if (!expense) {
      const error = new Error("Expense not found");
      error.statusCode = 404;
      throw error;
    }

    if (expense.voided_at !== null) {
      const error = new Error(
        "Voided expenses cannot receive funding allocations",
      );
      error.statusCode = 409;
      throw error;
    }

    // 5. Check how much of the expense is still fundable
    const currentFundingTotal = Number(
      await getActiveFundingTotalForExpense(validExpenseId, client),
    );

    const expenseAmount = Number(expense.amount);

    const remainingFundableAmount = expenseAmount - currentFundingTotal;

    if (validated.allocationAmount > remainingFundableAmount) {
      const error = new Error(
        "Funding allocation exceeds the remaining fundable expense amount",
      );
      error.statusCode = 409;
      throw error;
    }

    let createdAllocation = null;

    // 6A. PERSONAL_ADVANCE / PERSONAL_CONTRIBUTION
    if (
      validated.fundingType === "PERSONAL_ADVANCE" ||
      validated.fundingType === "PERSONAL_CONTRIBUTION"
    ) {
      createdAllocation = await createExpenseFundingAllocation(
        {
          expenseId: validExpenseId,
          fundingType: validated.fundingType,
          allocationAmount: validated.allocationAmount,
          fundedAt: validated.fundedAt,
          paymentMethod: validated.paymentMethod,
          paymentProvider: validated.paymentProvider,
          referenceNumber: validated.referenceNumber,

          advancedByUserId: validated.advancedByUserId,

          contributedByUserId: validated.contributedByUserId,

          directPaidByUserId: null,
          outsidePayerName: null,
          directPaymentDonationId: null,

          notes: validated.notes,

          idempotencyKey: validIdempotencyKey,
          idempotencyRequestHash,
          createdBy,
        },
        client,
      );
    }

    // 6B. SHELTER_FUNDS
    if (validated.fundingType === "SHELTER_FUNDS") {
      // Lock donation cash so another transaction
      // cannot spend the same money simultaneously.
      await lockActiveMonetaryDonationsForCashUse(client);

      // Find GENERAL + eligible RESTRICTED cash.
      const eligibleBuckets = await getEligibleCashSourceBucketsForExpense(
        validExpenseId,
        expense.category,
        client,
      );

      // Create the funding allocation.
      createdAllocation = await createExpenseFundingAllocation(
        {
          expenseId: validExpenseId,
          fundingType: validated.fundingType,
          allocationAmount: validated.allocationAmount,
          fundedAt: validated.fundedAt,
          paymentMethod: validated.paymentMethod,
          paymentProvider: validated.paymentProvider,
          referenceNumber: validated.referenceNumber,

          advancedByUserId: null,
          contributedByUserId: null,
          directPaidByUserId: null,
          outsidePayerName: null,
          directPaymentDonationId: null,

          notes: validated.notes,

          idempotencyKey: validIdempotencyKey,
          idempotencyRequestHash,
          createdBy,
        },
        client,
      );

      // Consume only enough eligible donation cash
      // to cover this allocation.
      await consumeCashBucketsForAllocation(
        eligibleBuckets,
        validated.allocationAmount,
        createdAllocation.allocation_id,
        createdBy,
        client,
      );
    }

    if (validated.fundingType === "DIRECT_PAYMENT") {
      const directPaymentDonationPayload = {
        donationType: "DIRECT_PAYMENT",

        // Same real-world event as the funding allocation
        donatedAt: validated.fundedAt,
        monetaryAmount: validated.allocationAmount,

        // Payment details must match the allocation
        paymentMethod: validated.paymentMethod,
        paymentProvider: validated.paymentProvider,
        referenceNumber: validated.referenceNumber,

        // Funding payer → Donation payer
        donorUserId: validated.directPaidByUserId,
        donorName: validated.outsidePayerName,

        donorContact: null,

        // DIRECT_PAYMENT cannot be anonymous
        isAnonymous: false,

        purpose: null,

        // DIRECT_PAYMENT does not enter shelter cash
        fundRestriction: null,
        restrictionCategory: null,
        restrictedExpenseId: null,

        notes: validated.notes,

        // Shelter did not receive the money
        receivedBy: null,
      };

      const directPaymentDonationIdempotencyKey = `dp:${createRequestHash({
        createdBy,
        fundingIdempotencyKey: validIdempotencyKey,
        fundingRequestHash: idempotencyRequestHash,
      })}`;

      const directPaymentDonationRequestHash = createRequestHash(
        directPaymentDonationPayload,
      );

      const createdDonation = await createDonation(
        {
          ...directPaymentDonationPayload,

          idempotencyKey: directPaymentDonationIdempotencyKey,

          idempotencyRequestHash: directPaymentDonationRequestHash,

          createdBy,
        },
        client,
      );

      createdAllocation = await createExpenseFundingAllocation(
        {
          expenseId: validExpenseId,

          fundingType: "DIRECT_PAYMENT",
          allocationAmount: validated.allocationAmount,
          fundedAt: validated.fundedAt,

          paymentMethod: validated.paymentMethod,
          paymentProvider: validated.paymentProvider,
          referenceNumber: validated.referenceNumber,

          advancedByUserId: null,
          contributedByUserId: null,

          directPaidByUserId: validated.directPaidByUserId,

          outsidePayerName: validated.outsidePayerName,

          directPaymentDonationId: createdDonation.donation_id,

          notes: validated.notes,

          idempotencyKey: validIdempotencyKey,
          idempotencyRequestHash,
          createdBy,
        },
        client,
      );
    }
    // 7. Everything succeeded
    await client.query("COMMIT");

    return {
      allocation: mapExpenseFundingAllocation(createdAllocation),
      isReplay: false,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    // Concurrent idempotency protection
    if (error.code === "23505") {
      const concurrentExistingAllocation =
        await findExpenseFundingAllocationByIdempotencyKey(
          createdBy,
          validIdempotencyKey,
        );

      if (concurrentExistingAllocation) {
        if (
          concurrentExistingAllocation.idempotency_request_hash !==
          idempotencyRequestHash
        ) {
          const conflictError = new Error(
            "Idempotency key has already been used for a different expense funding request",
          );
          conflictError.statusCode = 409;
          throw conflictError;
        }

        return {
          allocation: mapExpenseFundingAllocation(concurrentExistingAllocation),
          isReplay: true,
        };
      }
    }

    throw error;
  } finally {
    client.release();
  }
}

async function getExpenseFundingAllocationByIdService(allocationId) {
  const validAllocationId = validateUuid(allocationId, "Allocation ID");

  const allocation = await findExpenseFundingAllocationById(validAllocationId);

  if (!allocation) {
    const error = new Error("Expense funding allocation not found");
    error.statusCode = 404;
    throw error;
  }

  return mapExpenseFundingAllocation(allocation);
}

async function getExpenseFundingAllocationsByExpenseIdService(expenseId) {
  const validExpenseId = validateUuid(expenseId, "Expense ID");

  const expense = await findExpenseById(validExpenseId);

  if (!expense) {
    const error = new Error("Expense not found");
    error.statusCode = 404;
    throw error;
  }

  const allocations =
    await getExpenseFundingAllocationsByExpenseId(validExpenseId);

  return allocations.map(mapExpenseFundingAllocation);
}

async function voidExpenseFundingAllocationService(
  allocationId,
  data,
  voidedBy,
) {
  const validAllocationId = validateUuid(allocationId, "Allocation ID");

  const validated = validateVoidExpenseFundingInput(data);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const allocation = await findExpenseFundingAllocationByIdForUpdate(
      validAllocationId,
      client,
    );

    if (!allocation) {
      const error = new Error("Expense funding allocation not found");
      error.statusCode = 404;
      throw error;
    }

    if (allocation.voided_at !== null) {
      const error = new Error("Expense funding allocation is already voided");
      error.statusCode = 409;
      throw error;
    }

    // PERSONAL_ADVANCE
    if (allocation.funding_type === "PERSONAL_ADVANCE") {
      const hasReimbursementHistory =
        await hasReimbursementHistoryForAllocation(validAllocationId, client);

      if (hasReimbursementHistory) {
        const error = new Error(
          "Personal advance allocation cannot be voided because reimbursement history exists",
        );
        error.statusCode = 409;
        throw error;
      }
    }

    // SHELTER_FUNDS
    if (allocation.funding_type === "SHELTER_FUNDS") {
      await restoreCashBucketsForAllocation(
        validAllocationId,
        voidedBy,
        client,
      );
    }

    // DIRECT_PAYMENT
    if (allocation.funding_type === "DIRECT_PAYMENT") {
      const linkedDonation = await findDonationByIdForUpdate(
        allocation.direct_payment_donation_id,
        client,
      );

      if (!linkedDonation) {
        const error = new Error("Linked direct payment donation not found");
        error.statusCode = 409;
        throw error;
      }

      if (linkedDonation.donation_type !== "DIRECT_PAYMENT") {
        const error = new Error(
          "Linked donation is not a direct payment donation",
        );
        error.statusCode = 409;
        throw error;
      }

      if (linkedDonation.voided_at !== null) {
        const error = new Error(
          "Linked direct payment donation is already voided",
        );
        error.statusCode = 409;
        throw error;
      }

      await voidDonation(
        linkedDonation.donation_id,
        voidedBy,
        validated.voidReason,
        client,
      );
    }

    // Common final allocation void
    const voidedAllocation = await voidExpenseFundingAllocation(
      validAllocationId,
      voidedBy,
      validated.voidReason,
      client,
    );

    if (!voidedAllocation) {
      const error = new Error("Expense funding allocation could not be voided");
      error.statusCode = 409;
      throw error;
    }
    await client.query("COMMIT");

    return mapExpenseFundingAllocation(voidedAllocation);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function correctExpenseFundingAllocationService(
  allocationId,
  data,
  correctedBy,
  idempotencyKey,
) {
  const validAllocationId = validateUuid(allocationId, "Allocation ID");

  const validIdempotencyKey = validateIdempotencyKey(idempotencyKey);

  const client = await pool.connect();

  let idempotencyRequestHash = null;

  try {
    await client.query("BEGIN");

    // 1. Lock current allocation
    const allocation = await findExpenseFundingAllocationByIdForUpdate(
      validAllocationId,
      client,
    );

    if (!allocation) {
      const error = new Error("Expense funding allocation not found");
      error.statusCode = 404;
      throw error;
    }

    if (allocation.voided_at !== null) {
      const error = new Error("Voided funding allocations cannot be corrected");
      error.statusCode = 409;
      throw error;
    }

    // 2. Validate requested corrected state
    const validated = validateFundingAllocationCorrectionInput(
      data,
      allocation.funding_type,
    );

    // 3. Build trustworthy snapshots
    const oldState = buildFundingAllocationState(allocation);

    const newState = buildFundingAllocationState({
      expenseId: allocation.expense_id,
      directPaymentDonationId: allocation.direct_payment_donation_id,
      ...validated.newState,
    });

    // 4. Idempotency fingerprint
    idempotencyRequestHash = createRequestHash({
      allocationId: validAllocationId,
      newState,
      correctionReason: validated.correctionReason,
    });

    const existingCorrection =
      await findFundingAllocationCorrectionByIdempotencyKey(
        correctedBy,
        validIdempotencyKey,
        client,
      );

    if (existingCorrection) {
      if (
        existingCorrection.idempotency_request_hash !== idempotencyRequestHash
      ) {
        const error = new Error(
          "Idempotency key has already been used with a different request",
        );
        error.statusCode = 409;
        throw error;
      }

      await client.query("COMMIT");

      return {
        correction: mapFundingAllocationCorrection(existingCorrection),
        allocation: mapExpenseFundingAllocation(allocation),
        isReplay: true,
      };
    }

    // 5. Something must actually change
    if (JSON.stringify(oldState) === JSON.stringify(newState)) {
      const error = new Error(
        "Funding allocation correction must change at least one field",
      );
      error.statusCode = 409;
      throw error;
    }

    // DIRECT_PAYMENT uses void + recreate instead.
    if (allocation.funding_type === "DIRECT_PAYMENT") {
      const error = new Error(
        "Direct payment allocations cannot be corrected; void the allocation and create a new one instead",
      );
      error.statusCode = 409;
      throw error;
    }

    // 6. Lock related expense
    const expense = await findExpenseByIdForUpdate(
      allocation.expense_id,
      client,
    );

    if (!expense) {
      const error = new Error("Expense not found");
      error.statusCode = 404;
      throw error;
    }

    // 7. Prevent expense overfunding
    const currentFundingTotal = Number(
      await getActiveFundingTotalForExpense(allocation.expense_id, client),
    );

    const correctedFundingTotal =
      currentFundingTotal -
      oldState.allocationAmount +
      newState.allocationAmount;

    if (correctedFundingTotal > Number(expense.amount)) {
      const error = new Error(
        "Corrected allocation would exceed the expense amount",
      );
      error.statusCode = 409;
      throw error;
    }

    // 8. PERSONAL_ADVANCE rules
    if (allocation.funding_type === "PERSONAL_ADVANCE") {
      const effectiveReimbursedAmount = Number(
        await getEffectiveReimbursedAmountForAllocation(
          validAllocationId,
          client,
        ),
      );

      if (newState.allocationAmount < effectiveReimbursedAmount) {
        const error = new Error(
          "Personal advance amount cannot be less than the effective reimbursed amount",
        );
        error.statusCode = 409;
        throw error;
      }

      const hasReimbursementHistory =
        await hasReimbursementHistoryForAllocation(validAllocationId, client);

      if (
        hasReimbursementHistory &&
        newState.advancedByUserId !== oldState.advancedByUserId
      ) {
        const error = new Error(
          "Advanced by user cannot be changed after reimbursement history exists",
        );
        error.statusCode = 409;
        throw error;
      }
    }

    // 9. SHELTER_FUNDS must rebuild its cash effect
    if (
      allocation.funding_type === "SHELTER_FUNDS" &&
      newState.allocationAmount !== oldState.allocationAmount
    ) {
      await lockActiveMonetaryDonationsForCashUse(client);

      await restoreCashBucketsForAllocation(
        validAllocationId,
        correctedBy,
        client,
      );

      const eligibleCashBuckets = await getEligibleCashSourceBucketsForExpense(
        allocation.expense_id,
        expense.category,
        client,
      );

      await consumeCashBucketsForAllocation(
        eligibleCashBuckets,
        newState.allocationAmount,
        validAllocationId,
        correctedBy,
        client,
      );
    }
    // 10. Update current effective allocation
    const updatedAllocation = await updateExpenseFundingAllocation(
      validAllocationId,
      {
        allocationAmount: newState.allocationAmount,
        fundedAt: newState.fundedAt,
        paymentMethod: newState.paymentMethod,
        paymentProvider: newState.paymentProvider,
        referenceNumber: newState.referenceNumber,
        advancedByUserId: newState.advancedByUserId,
        contributedByUserId: newState.contributedByUserId,
        directPaidByUserId: newState.directPaidByUserId,
        outsidePayerName: newState.outsidePayerName,
        notes: newState.notes,
      },
      correctedBy,
      client,
    );

    // 11. Preserve immutable audit history
    const correction = await createFundingAllocationCorrection(
      {
        allocationId: validAllocationId,
        oldState,
        newState,
        correctionReason: validated.correctionReason,
        idempotencyKey: validIdempotencyKey,
        idempotencyRequestHash,
        createdBy: correctedBy,
      },
      client,
    );

    await client.query("COMMIT");

    return {
      correction: mapFundingAllocationCorrection(correction),
      allocation: mapExpenseFundingAllocation(updatedAllocation),
      isReplay: false,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    // Concurrent idempotency protection
    if (error.code === "23505") {
      const concurrentCorrection =
        await findFundingAllocationCorrectionByIdempotencyKey(
          correctedBy,
          validIdempotencyKey,
        );

      if (concurrentCorrection) {
        if (
          concurrentCorrection.idempotency_request_hash !==
          idempotencyRequestHash
        ) {
          const conflictError = new Error(
            "Idempotency key has already been used with a different request",
          );
          conflictError.statusCode = 409;
          throw conflictError;
        }

        const currentAllocation =
          await findExpenseFundingAllocationById(validAllocationId);

        return {
          correction: mapFundingAllocationCorrection(concurrentCorrection),
          allocation: mapExpenseFundingAllocation(currentAllocation),
          isReplay: true,
        };
      }
    }

    throw error;
  } finally {
    client.release();
  }
}

async function getFundingAllocationCorrectionsService(allocationId) {
  const validAllocationId = validateUuid(allocationId, "Allocation ID");

  const allocation = await findExpenseFundingAllocationById(validAllocationId);

  if (!allocation) {
    const error = new Error("Expense funding allocation not found");
    error.statusCode = 404;
    throw error;
  }

  const corrections =
    await getFundingAllocationCorrectionsByAllocationId(validAllocationId);

  return corrections.map(mapFundingAllocationCorrection);
}

export {
  createExpenseFundingAllocationService,
  getExpenseFundingAllocationByIdService,
  getExpenseFundingAllocationsByExpenseIdService,
  voidExpenseFundingAllocationService,
  correctExpenseFundingAllocationService,
  getFundingAllocationCorrectionsService,
};
