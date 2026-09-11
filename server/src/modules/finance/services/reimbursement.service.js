import pool from "../../../config/db.js";

import {
  validateUuid,
  validateIdempotencyKey,
} from "../validations/finance.validation.utils.js";

import {
  validateCreateReimbursementInput,
  validateCreateReimbursementReversalInput,
  validateCreateReimbursementReversalCorrectionInput,
} from "../validations/reimbursement.validation.js";

import {
  createRequestHash,
  toCents,
  fromCents,
} from "../utils/finance.utils.js";

import {
  createPersonalAdvanceReimbursement,
  findReimbursementByIdempotencyKey,
  getEffectiveReimbursedAmountForAllocation,
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
} from "../repositories/reimbursement.repository.js";

import {
  findExpenseFundingAllocationByIdForUpdate,
  findExpenseFundingAllocationById,
} from "../repositories/expenseFunding.repository.js";

import { findExpenseByIdForUpdate } from "../repositories/expense.repository.js";

import {
  createFinanceCashSourceMovement,
  lockActiveMonetaryDonationsForCashUse,
  getEligibleCashSourceBucketsForExpense,
  getRestorableAllocationUseCashMovements,
} from "../repositories/financeCashMovement.repository.js";

function mapPersonalAdvanceReimbursement(reimbursement) {
  if (!reimbursement) return null;

  return {
    reimbursementId: reimbursement.reimbursement_id,
    allocationId: reimbursement.allocation_id,

    reimbursementAmount: Number(reimbursement.reimbursement_amount),

    reimbursedAt: reimbursement.reimbursed_at,

    paymentMethod: reimbursement.payment_method,
    paymentProvider: reimbursement.payment_provider,
    referenceNumber: reimbursement.reference_number,

    notes: reimbursement.notes,

    createdBy: reimbursement.created_by,
    createdAt: reimbursement.created_at,
  };
}

function mapReimbursementReversal(reversal) {
  if (!reversal) return null;

  return {
    reversalId: reversal.reversal_id,
    reimbursementId: reversal.reimbursement_id,
    reversalAmount: Number(reversal.reversal_amount),
    reversalReason: reversal.reversal_reason,
    reversedAt: reversal.reversed_at,
    createdBy: reversal.created_by,
    createdAt: reversal.created_at,
  };
}

function mapReimbursementReversalCorrection(correction) {
  if (!correction) return null;

  return {
    correctionId: correction.correction_id,
    reversalId: correction.reversal_id,
    correctionAmount: Number(correction.correction_amount),
    correctionReason: correction.correction_reason,
    correctedAt: correction.corrected_at,
    createdBy: correction.created_by,
    createdAt: correction.created_at,
  };
}

async function consumeCashBucketsForReimbursement(
  buckets,
  reimbursementAmount,
  reimbursementId,
  createdBy,
  client,
) {
  let remainingCents = toCents(reimbursementAmount);

  for (const bucket of buckets) {
    if (remainingCents <= 0) break;

    const availableCents = toCents(bucket.available_amount);

    const centsToUse = Math.min(remainingCents, availableCents);

    if (centsToUse <= 0) continue;

    const amountToUse = fromCents(centsToUse);

    await createFinanceCashSourceMovement(
      {
        donationId: bucket.donation_id,

        movementType: "REIMBURSEMENT_USE",

        movementAmount: amountToUse,

        sourceRestrictionType: bucket.restriction_type,

        sourceRestrictionCategory: bucket.restriction_category,

        sourceRestrictedExpenseId: bucket.restricted_expense_id,

        allocationId: null,
        reimbursementId,
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
    const error = new Error(
      "Insufficient eligible shelter funds for reimbursement",
    );
    error.statusCode = 409;
    throw error;
  }
}

async function createPersonalAdvanceReimbursementService(
  allocationId,
  data,
  createdBy,
  idempotencyKey,
) {
  const validAllocationId = validateUuid(allocationId, "Allocation ID");

  const validIdempotencyKey = validateIdempotencyKey(idempotencyKey);

  const validated = validateCreateReimbursementInput(data);

  const idempotencyRequestHash = createRequestHash({
    allocationId: validAllocationId,
    reimbursementAmount: validated.reimbursementAmount,
    reimbursedAt: validated.reimbursedAt,
    paymentMethod: validated.paymentMethod,
    paymentProvider: validated.paymentProvider,
    referenceNumber: validated.referenceNumber,
    notes: validated.notes,
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Idempotency
    const existingReimbursement = await findReimbursementByIdempotencyKey(
      createdBy,
      validIdempotencyKey,
      client,
    );

    if (existingReimbursement) {
      if (
        existingReimbursement.idempotency_request_hash !==
        idempotencyRequestHash
      ) {
        const error = new Error(
          "Idempotency key has already been used with a different reimbursement request",
        );
        error.statusCode = 409;
        throw error;
      }

      await client.query("COMMIT");

      return {
        reimbursement: mapPersonalAdvanceReimbursement(existingReimbursement),
        isReplay: true,
      };
    }

    // 2. Lock the funding allocation
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
      const error = new Error(
        "Voided funding allocations cannot be reimbursed",
      );
      error.statusCode = 409;
      throw error;
    }

    if (allocation.funding_type !== "PERSONAL_ADVANCE") {
      const error = new Error(
        "Only personal advance allocations can be reimbursed",
      );
      error.statusCode = 409;
      throw error;
    }

    // 3. Reimbursement cannot happen before the advance
    if (new Date(validated.reimbursedAt) < new Date(allocation.funded_at)) {
      const error = new Error(
        "Reimbursement date cannot be before the personal advance funding date",
      );
      error.statusCode = 409;
      throw error;
    }

    // 4. Calculate current outstanding payable
    const effectiveReimbursedAmount = Number(
      await getEffectiveReimbursedAmountForAllocation(
        validAllocationId,
        client,
      ),
    );

    const outstandingAmount =
      Number(allocation.allocation_amount) - effectiveReimbursedAmount;

    if (validated.reimbursementAmount > outstandingAmount) {
      const error = new Error(
        "Reimbursement amount exceeds the outstanding personal advance amount",
      );
      error.statusCode = 409;
      throw error;
    }

    // 5. Lock the related expense
    const expense = await findExpenseByIdForUpdate(
      allocation.expense_id,
      client,
    );

    if (!expense) {
      const error = new Error("Expense not found");
      error.statusCode = 404;
      throw error;
    }

    // 6. Lock shelter monetary cash
    await lockActiveMonetaryDonationsForCashUse(client);

    // Find cash that is eligible for the expense
    // originally funded by this personal advance.
    const eligibleCashBuckets = await getEligibleCashSourceBucketsForExpense(
      allocation.expense_id,
      expense.category,
      client,
    );

    // 7. Create immutable reimbursement record
    const reimbursement = await createPersonalAdvanceReimbursement(
      {
        allocationId: validAllocationId,
        reimbursementAmount: validated.reimbursementAmount,
        reimbursedAt: validated.reimbursedAt,
        paymentMethod: validated.paymentMethod,
        paymentProvider: validated.paymentProvider,
        referenceNumber: validated.referenceNumber,
        notes: validated.notes,

        idempotencyKey: validIdempotencyKey,
        idempotencyRequestHash,

        createdBy,
      },
      client,
    );

    // 8. Reimbursement actually spends shelter cash
    await consumeCashBucketsForReimbursement(
      eligibleCashBuckets,
      validated.reimbursementAmount,
      reimbursement.reimbursement_id,
      createdBy,
      client,
    );

    await client.query("COMMIT");

    return {
      reimbursement: mapPersonalAdvanceReimbursement(reimbursement),
      isReplay: false,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    // Concurrent idempotency protection
    if (error.code === "23505") {
      const concurrentReimbursement = await findReimbursementByIdempotencyKey(
        createdBy,
        validIdempotencyKey,
      );

      if (concurrentReimbursement) {
        if (
          concurrentReimbursement.idempotency_request_hash !==
          idempotencyRequestHash
        ) {
          const conflictError = new Error(
            "Idempotency key has already been used with a different reimbursement request",
          );
          conflictError.statusCode = 409;
          throw conflictError;
        }

        return {
          reimbursement: mapPersonalAdvanceReimbursement(
            concurrentReimbursement,
          ),
          isReplay: true,
        };
      }
    }

    throw error;
  } finally {
    client.release();
  }
}

async function restoreCashForReimbursementReversal(
  movements,
  reversalAmount,
  reimbursementId,
  reversalId,
  createdBy,
  client,
) {
  let remainingCents = toCents(reversalAmount);

  for (const movement of movements) {
    if (remainingCents <= 0) break;

    const restorableCents = toCents(movement.restorable_amount);

    const centsToRestore = Math.min(remainingCents, restorableCents);

    if (centsToRestore <= 0) continue;

    const amountToRestore = fromCents(centsToRestore);

    await createFinanceCashSourceMovement(
      {
        donationId: movement.donation_id,

        movementType: "REIMBURSEMENT_RESTORE",

        movementAmount: amountToRestore,

        sourceRestrictionType: movement.source_restriction_type,

        sourceRestrictionCategory: movement.source_restriction_category,

        sourceRestrictedExpenseId: movement.source_restricted_expense_id,

        allocationId: null,
        reimbursementId: null,
        reversalId,
        correctionId: null,

        relatedCashMovementId: movement.cash_movement_id,

        createdBy,
      },
      client,
    );

    remainingCents -= centsToRestore;
  }

  if (remainingCents > 0) {
    const error = new Error(
      "Reversal amount exceeds the currently restorable reimbursement cash",
    );
    error.statusCode = 409;
    throw error;
  }
}

async function createReimbursementReversalService(
  reimbursementId,
  data,
  createdBy,
  idempotencyKey,
) {
  const validReimbursementId = validateUuid(
    reimbursementId,
    "Reimbursement ID",
  );

  const validIdempotencyKey = validateIdempotencyKey(idempotencyKey);

  const validated = validateCreateReimbursementReversalInput(data);

  const idempotencyRequestHash = createRequestHash({
    reimbursementId: validReimbursementId,
    reversalAmount: validated.reversalAmount,
    reversalReason: validated.reversalReason,
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Idempotency
    const existingReversal = await findReimbursementReversalByIdempotencyKey(
      createdBy,
      validIdempotencyKey,
      client,
    );

    if (existingReversal) {
      if (
        existingReversal.idempotency_request_hash !== idempotencyRequestHash
      ) {
        const error = new Error(
          "Idempotency key has already been used with a different reimbursement reversal request",
        );
        error.statusCode = 409;
        throw error;
      }

      await client.query("COMMIT");

      return {
        reversal: mapReimbursementReversal(existingReversal),
        isReplay: true,
      };
    }

    // 2. Lock reimbursement
    const reimbursement = await findReimbursementByIdForUpdate(
      validReimbursementId,
      client,
    );

    if (!reimbursement) {
      const error = new Error("Reimbursement not found");
      error.statusCode = 404;
      throw error;
    }

    // 3. Lock the PERSONAL_ADVANCE allocation too
    //
    // Reimbursement creation also locks this allocation.
    // This keeps reimbursement creation and reversals
    // serialized against the same payable.
    const allocation = await findExpenseFundingAllocationByIdForUpdate(
      reimbursement.allocation_id,
      client,
    );

    if (!allocation) {
      const error = new Error("Expense funding allocation not found");
      error.statusCode = 404;
      throw error;
    }

    if (allocation.funding_type !== "PERSONAL_ADVANCE") {
      const error = new Error(
        "Reimbursement is not linked to a personal advance allocation",
      );
      error.statusCode = 409;
      throw error;
    }

    // 4. Calculate how much can still be reversed
    const remainingReversibleAmount = Number(
      await getRemainingReversibleAmountForReimbursement(
        validReimbursementId,
        client,
      ),
    );

    if (validated.reversalAmount > remainingReversibleAmount) {
      const error = new Error(
        "Reversal amount exceeds the remaining reversible reimbursement amount",
      );
      error.statusCode = 409;
      throw error;
    }
    // 5. Create immutable reversal record
    const reversal = await createReimbursementReversal(
      {
        reimbursementId: validReimbursementId,
        reversalAmount: validated.reversalAmount,
        reversalReason: validated.reversalReason,

        idempotencyKey: validIdempotencyKey,
        idempotencyRequestHash,

        createdBy,
      },
      client,
    );

    // 6. Find reimbursement cash that is still restorable
    const restorableMovements =
      await getRestorableReimbursementUseCashMovements(
        validReimbursementId,
        client,
      );

    // 7. Restore only the reversal amount
    await restoreCashForReimbursementReversal(
      restorableMovements,
      validated.reversalAmount,
      validReimbursementId,
      reversal.reversal_id,
      createdBy,
      client,
    );

    await client.query("COMMIT");

    return {
      reversal: mapReimbursementReversal(reversal),
      isReplay: false,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      const concurrentReversal =
        await findReimbursementReversalByIdempotencyKey(
          createdBy,
          validIdempotencyKey,
        );

      if (concurrentReversal) {
        if (
          concurrentReversal.idempotency_request_hash !== idempotencyRequestHash
        ) {
          const conflictError = new Error(
            "Idempotency key has already been used with a different reimbursement reversal request",
          );
          conflictError.statusCode = 409;
          throw conflictError;
        }

        return {
          reversal: mapReimbursementReversal(concurrentReversal),
          isReplay: true,
        };
      }
    }

    throw error;
  } finally {
    client.release();
  }
}
async function createReimbursementReversalCorrectionService(
  reversalId,
  data,
  createdBy,
  idempotencyKey,
) {
  const validReversalId = validateUuid(reversalId, "Reversal ID");

  const validIdempotencyKey = validateIdempotencyKey(idempotencyKey);

  const validated = validateCreateReimbursementReversalCorrectionInput(data);

  const idempotencyRequestHash = createRequestHash({
    reversalId: validReversalId,
    correctionAmount: validated.correctionAmount,
    correctionReason: validated.correctionReason,
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Idempotency
    const existingCorrection =
      await findReimbursementReversalCorrectionByIdempotencyKey(
        createdBy,
        validIdempotencyKey,
        client,
      );

    if (existingCorrection) {
      if (
        existingCorrection.idempotency_request_hash !== idempotencyRequestHash
      ) {
        const error = new Error(
          "Idempotency key has already been used with a different reimbursement reversal correction request",
        );
        error.statusCode = 409;
        throw error;
      }

      await client.query("COMMIT");

      return {
        correction: mapReimbursementReversalCorrection(existingCorrection),
        isReplay: true,
      };
    }

    // 2. Lock reversal
    const reversal = await findReimbursementReversalByIdForUpdate(
      validReversalId,
      client,
    );

    if (!reversal) {
      const error = new Error("Reimbursement reversal not found");
      error.statusCode = 404;
      throw error;
    }

    // 3. Lock original reimbursement
    const reimbursement = await findReimbursementByIdForUpdate(
      reversal.reimbursement_id,
      client,
    );

    if (!reimbursement) {
      const error = new Error("Reimbursement not found");
      error.statusCode = 404;
      throw error;
    }

    // 4. Lock PERSONAL_ADVANCE allocation
    const allocation = await findExpenseFundingAllocationByIdForUpdate(
      reimbursement.allocation_id,
      client,
    );

    if (!allocation) {
      const error = new Error("Expense funding allocation not found");
      error.statusCode = 404;
      throw error;
    }

    if (allocation.funding_type !== "PERSONAL_ADVANCE") {
      const error = new Error(
        "Reimbursement is not linked to a personal advance allocation",
      );
      error.statusCode = 409;
      throw error;
    }

    // 5. Check remaining correctable amount
    const remainingCorrectableAmount = Number(
      await getRemainingCorrectableAmountForReversal(validReversalId, client),
    );

    if (validated.correctionAmount > remainingCorrectableAmount) {
      const error = new Error(
        "Correction amount exceeds the remaining correctable reversal amount",
      );
      error.statusCode = 409;
      throw error;
    }
    async function reconsumeCashForReversalCorrection(
      restoreMovements,
      eligibleCashBuckets,
      correctionAmount,
      correctionId,
      createdBy,
      client,
    ) {
      let remainingCents = toCents(correctionAmount);

      for (const restore of restoreMovements) {
        if (remainingCents <= 0) break;

        const matchingBucket = eligibleCashBuckets.find(
          (bucket) =>
            bucket.donation_id === restore.donation_id &&
            bucket.restriction_type === restore.source_restriction_type &&
            bucket.restriction_category ===
              restore.source_restriction_category &&
            bucket.restricted_expense_id ===
              restore.source_restricted_expense_id,
        );

        if (!matchingBucket) continue;

        const reconsumableCents = toCents(restore.reconsumable_amount);

        const currentlyAvailableCents = toCents(
          matchingBucket.available_amount,
        );

        const centsToReconsume = Math.min(
          remainingCents,
          reconsumableCents,
          currentlyAvailableCents,
        );

        if (centsToReconsume <= 0) continue;

        const amountToReconsume = fromCents(centsToReconsume);

        await createFinanceCashSourceMovement(
          {
            donationId: restore.donation_id,

            movementType: "REIMBURSEMENT_RECONSUME",

            movementAmount: amountToReconsume,

            sourceRestrictionType: restore.source_restriction_type,

            sourceRestrictionCategory: restore.source_restriction_category,

            sourceRestrictedExpenseId: restore.source_restricted_expense_id,

            allocationId: null,
            reimbursementId: null,
            reversalId: null,
            correctionId,

            relatedCashMovementId: restore.cash_movement_id,

            createdBy,
          },
          client,
        );

        remainingCents -= centsToReconsume;

        // Prevent another restore row from reusing
        // the same available bucket amount in this loop.
        matchingBucket.available_amount = fromCents(
          currentlyAvailableCents - centsToReconsume,
        );
      }

      if (remainingCents > 0) {
        const error = new Error(
          "Insufficient eligible shelter funds to apply the reversal correction",
        );
        error.statusCode = 409;
        throw error;
      }
    }

    // 6. Make sure the correction does not push
    // effective reimbursement above the current advance amount.
    const effectiveReimbursedAmount = Number(
      await getEffectiveReimbursedAmountForAllocation(
        allocation.allocation_id,
        client,
      ),
    );

    const correctedEffectiveReimbursedAmount =
      effectiveReimbursedAmount + validated.correctionAmount;

    if (
      correctedEffectiveReimbursedAmount > Number(allocation.allocation_amount)
    ) {
      const error = new Error(
        "Reversal correction would exceed the personal advance amount",
      );
      error.statusCode = 409;
      throw error;
    }

    // 7. Lock related expense
    const expense = await findExpenseByIdForUpdate(
      allocation.expense_id,
      client,
    );

    if (!expense) {
      const error = new Error("Expense not found");
      error.statusCode = 404;
      throw error;
    }

    // 8. Lock shelter cash
    await lockActiveMonetaryDonationsForCashUse(client);

    // Cash that this particular reversal restored
    // and has not already been reconsumed.
    const reconsumableRestoreMovements =
      await getReconsumableReimbursementRestoreCashMovements(
        validReversalId,
        client,
      );

    // Cash that is actually available and currently
    // eligible for this expense.
    const eligibleCashBuckets = await getEligibleCashSourceBucketsForExpense(
      allocation.expense_id,
      expense.category,
      client,
    );

    // 9. Create immutable reversal correction
    const correction = await createReimbursementReversalCorrection(
      {
        reversalId: validReversalId,
        correctionAmount: validated.correctionAmount,
        correctionReason: validated.correctionReason,

        idempotencyKey: validIdempotencyKey,
        idempotencyRequestHash,

        createdBy,
      },
      client,
    );

    // 10. Reapply the corrected reimbursement cash effect
    await reconsumeCashForReversalCorrection(
      reconsumableRestoreMovements,
      eligibleCashBuckets,
      validated.correctionAmount,
      correction.correction_id,
      createdBy,
      client,
    );

    await client.query("COMMIT");

    return {
      correction: mapReimbursementReversalCorrection(correction),
      isReplay: false,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      const concurrentCorrection =
        await findReimbursementReversalCorrectionByIdempotencyKey(
          createdBy,
          validIdempotencyKey,
        );

      if (concurrentCorrection) {
        if (
          concurrentCorrection.idempotency_request_hash !==
          idempotencyRequestHash
        ) {
          const conflictError = new Error(
            "Idempotency key has already been used with a different reimbursement reversal correction request",
          );
          conflictError.statusCode = 409;
          throw conflictError;
        }

        return {
          correction: mapReimbursementReversalCorrection(concurrentCorrection),
          isReplay: true,
        };
      }
    }

    throw error;
  } finally {
    client.release();
  }
}

async function getReimbursementsByAllocationIdService(allocationId) {
  const validAllocationId = validateUuid(allocationId, "Allocation ID");

  const allocation = await findExpenseFundingAllocationById(validAllocationId);

  if (!allocation) {
    const error = new Error("Expense funding allocation not found");
    error.statusCode = 404;
    throw error;
  }

  if (allocation.funding_type !== "PERSONAL_ADVANCE") {
    const error = new Error(
      "Only personal advance allocations have reimbursements",
    );
    error.statusCode = 409;
    throw error;
  }

  const reimbursements =
    await getReimbursementsByAllocationId(validAllocationId);

  return reimbursements.map(mapPersonalAdvanceReimbursement);
}

async function getReimbursementReversalsByReimbursementIdService(
  reimbursementId,
) {
  const validReimbursementId = validateUuid(
    reimbursementId,
    "Reimbursement ID",
  );

  const reimbursement = await findReimbursementById(validReimbursementId);

  if (!reimbursement) {
    const error = new Error("Reimbursement not found");
    error.statusCode = 404;
    throw error;
  }

  const reversals =
    await getReimbursementReversalsByReimbursementId(validReimbursementId);

  return reversals.map(mapReimbursementReversal);
}

async function getReimbursementReversalCorrectionsByReversalIdService(
  reversalId,
) {
  const validReversalId = validateUuid(reversalId, "Reversal ID");

  const reversal = await findReimbursementReversalById(validReversalId);

  if (!reversal) {
    const error = new Error("Reimbursement reversal not found");
    error.statusCode = 404;
    throw error;
  }

  const corrections =
    await getReimbursementReversalCorrectionsByReversalId(validReversalId);

  return corrections.map(mapReimbursementReversalCorrection);
}

async function getPersonalAdvanceReimbursementSummaryService(allocationId) {
  const validAllocationId = validateUuid(allocationId, "Allocation ID");

  const allocation = await findExpenseFundingAllocationById(validAllocationId);

  if (!allocation) {
    const error = new Error("Expense funding allocation not found");
    error.statusCode = 404;
    throw error;
  }

  if (allocation.funding_type !== "PERSONAL_ADVANCE") {
    const error = new Error(
      "Only personal advance allocations have reimbursement summaries",
    );
    error.statusCode = 409;
    throw error;
  }

  const advanceAmount = Number(allocation.allocation_amount);

  const effectiveReimbursedAmount = Number(
    await getEffectiveReimbursedAmountForAllocation(validAllocationId),
  );

  const outstandingAmount = advanceAmount - effectiveReimbursedAmount;

  return {
    allocationId: validAllocationId,
    advanceAmount,
    effectiveReimbursedAmount,
    outstandingAmount,
  };
}

export {
  createPersonalAdvanceReimbursementService,
  createReimbursementReversalService,
  createReimbursementReversalCorrectionService,
  getReimbursementsByAllocationIdService,
  getReimbursementReversalsByReimbursementIdService,
  getReimbursementReversalCorrectionsByReversalIdService,
  getPersonalAdvanceReimbursementSummaryService,
};
