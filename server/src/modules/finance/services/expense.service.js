import pool from "../../../config/db.js";

import { createRequestHash } from "../utils/finance.utils.js";

import {
  validateCreateExpenseInput,
  validateExpenseListQuery,
  validateVoidExpenseInput,
  validateExpenseAmountCorrectionInput,
} from "../validations/expense.validation.js";

import {
  validateIdempotencyKey,
  validateUuid,
} from "../validations/finance.validation.utils.js";

import {
  createExpense,
  findExpenseByIdempotencyKey,
  findExpenseById,
  findExpenseByIdForUpdate,
  getExpenses,
  voidExpense,
  hasActiveFundingAllocationsForExpense,
  createExpenseAmountCorrection,
  findExpenseAmountCorrectionByIdempotencyKey,
  updateExpenseAmount,
  getActiveFundingTotalForExpense,
  getExpenseAmountCorrectionsByExpenseId,
} from "../repositories/expense.repository.js";

function mapExpense(expense) {
  if (!expense) return null;

  return {
    expenseId: expense.expense_id,
    expenseDate: expense.expense_date,
    category: expense.category,
    description: expense.description,

    amount:
      expense.amount === null || expense.amount === undefined
        ? null
        : Number(expense.amount),

    animalId: expense.animal_id,
    medicalRecordId: expense.medical_record_id,
    receipt: expense.receipt,
    notes: expense.notes,

    createdBy: expense.created_by,
    updatedBy: expense.updated_by ?? null,
    createdAt: expense.created_at,
    updatedAt: expense.updated_at,

    voidReason: expense.void_reason ?? null,
    voidedBy: expense.voided_by ?? null,
    voidedAt: expense.voided_at ?? null,
  };
}

function mapExpenseAmountCorrection(correction) {
  if (!correction) return null;

  return {
    correctionId: correction.correction_id,
    expenseId: correction.expense_id,
    oldAmount: Number(correction.old_amount),
    newAmount: Number(correction.new_amount),
    correctionReason: correction.correction_reason,
    correctedAt: correction.corrected_at,
    createdBy: correction.created_by,
    createdAt: correction.created_at,
  };
}

async function createExpenseService(data, createdBy, idempotencyKey) {
  const validIdempotencyKey = validateIdempotencyKey(idempotencyKey);

  const validated = validateCreateExpenseInput(data);

  const idempotencyRequestHash = createRequestHash({
    expenseDate: validated.expenseDate,
    category: validated.category,
    description: validated.description,
    amount: validated.amount,
    animalId: validated.animalId,
    medicalRecordId: validated.medicalRecordId,
    receipt: validated.receipt,
    notes: validated.notes,
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingExpense = await findExpenseByIdempotencyKey(
      createdBy,
      validIdempotencyKey,
      client,
    );

    if (existingExpense) {
      if (existingExpense.idempotency_request_hash !== idempotencyRequestHash) {
        const error = new Error(
          "Idempotency key has already been used for a different expense request",
        );
        error.statusCode = 409;
        throw error;
      }

      await client.query("COMMIT");

      return {
        expense: mapExpense(existingExpense),
        isReplay: true,
      };
    }

    const createdExpense = await createExpense(
      {
        ...validated,
        createdBy,
        idempotencyKey: validIdempotencyKey,
        idempotencyRequestHash,
      },
      client,
    );

    await client.query("COMMIT");

    return {
      expense: mapExpense(createdExpense),
      isReplay: false,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    if (
      error.code === "23505" &&
      error.constraint === "uq_expenses_created_by_idempotency_key"
    ) {
      const concurrentExistingExpense = await findExpenseByIdempotencyKey(
        createdBy,
        validIdempotencyKey,
      );

      if (
        !concurrentExistingExpense ||
        concurrentExistingExpense.idempotency_request_hash !==
          idempotencyRequestHash
      ) {
        const conflictError = new Error(
          "Idempotency key has already been used for a different expense request",
        );
        conflictError.statusCode = 409;
        throw conflictError;
      }

      return {
        expense: mapExpense(concurrentExistingExpense),
        isReplay: true,
      };
    }

    if (error.code === "23503" && error.constraint === "fk_expenses_animal") {
      const notFoundError = new Error("Animal not found");
      notFoundError.statusCode = 404;
      throw notFoundError;
    }

    if (
      error.code === "23503" &&
      error.constraint === "fk_expenses_medical_record"
    ) {
      const notFoundError = new Error("Medical record not found");
      notFoundError.statusCode = 404;
      throw notFoundError;
    }
    throw error;
  } finally {
    client.release();
  }
}
async function getExpensesService(query) {
  const validated = validateExpenseListQuery(query);

  const { expenses, total } = await getExpenses(validated);

  const totalPages = Math.ceil(total / validated.limit);

  return {
    expenses: expenses.map(mapExpense),
    pagination: {
      page: validated.page,
      limit: validated.limit,
      total,
      totalPages,
    },
  };
}

async function getExpenseByIdService(expenseId) {
  const validExpenseId = validateUuid(expenseId, "expense ID");

  const expense = await findExpenseById(validExpenseId);

  if (!expense) {
    const error = new Error("Expense not found");
    error.statusCode = 404;
    throw error;
  }

  return mapExpense(expense);
}

async function voidExpenseService(expenseId, data, voidedBy) {
  const validExpenseId = validateUuid(expenseId, "expense ID");

  const validated = validateVoidExpenseInput(data);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const expense = await findExpenseByIdForUpdate(validExpenseId, client);

    if (!expense) {
      const error = new Error("Expense not found");
      error.statusCode = 404;
      throw error;
    }

    if (expense.voided_at !== null) {
      const error = new Error("Expense is already voided");
      error.statusCode = 409;
      throw error;
    }

    const hasActiveFunding = await hasActiveFundingAllocationsForExpense(
      validExpenseId,
      client,
    );

    if (hasActiveFunding) {
      const error = new Error(
        "Expense cannot be voided while active funding allocations exist",
      );
      error.statusCode = 409;
      throw error;
    }

    const voidedExpense = await voidExpense(
      validExpenseId,
      voidedBy,
      validated.voidReason,
      client,
    );

    if (!voidedExpense) {
      const error = new Error("Expense could not be voided");
      error.statusCode = 409;
      throw error;
    }

    await client.query("COMMIT");

    return mapExpense(voidedExpense);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function createExpenseAmountCorrectionService(
  expenseId,
  data,
  createdBy,
  idempotencyKey,
) {
  const validExpenseId = validateUuid(expenseId, "expense ID");

  const validIdempotencyKey = validateIdempotencyKey(idempotencyKey);

  const validated = validateExpenseAmountCorrectionInput(data);

  const idempotencyRequestHash = createRequestHash({
    expenseId: validExpenseId,
    newAmount: validated.newAmount,
    correctionReason: validated.correctionReason,
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingCorrection =
      await findExpenseAmountCorrectionByIdempotencyKey(
        createdBy,
        validIdempotencyKey,
        client,
      );

    if (existingCorrection) {
      if (
        existingCorrection.idempotency_request_hash !== idempotencyRequestHash
      ) {
        const error = new Error(
          "Idempotency key has already been used for a different expense amount correction request",
        );
        error.statusCode = 409;
        throw error;
      }

      await client.query("COMMIT");

      return {
        correction: mapExpenseAmountCorrection(existingCorrection),
        isReplay: true,
      };
    }

    const expense = await findExpenseByIdForUpdate(validExpenseId, client);

    if (!expense) {
      const error = new Error("Expense not found");
      error.statusCode = 404;
      throw error;
    }

    if (expense.voided_at !== null) {
      const error = new Error("Voided expenses cannot have amount corrections");
      error.statusCode = 409;
      throw error;
    }

    const currentAmount = Number(expense.amount);

    if (validated.newAmount === currentAmount) {
      const error = new Error(
        "New expense amount must be different from the current amount",
      );
      error.statusCode = 409;
      throw error;
    }

    const activeFundingTotal = Number(
      await getActiveFundingTotalForExpense(validExpenseId, client),
    );

    if (validated.newAmount < activeFundingTotal) {
      const error = new Error(
        "New expense amount cannot be less than the active funded amount",
      );
      error.statusCode = 409;
      throw error;
    }

    const createdCorrection = await createExpenseAmountCorrection(
      {
        expenseId: validExpenseId,
        oldAmount: currentAmount,
        newAmount: validated.newAmount,
        correctionReason: validated.correctionReason,
        correctedAt: validated.correctedAt,
        idempotencyKey: validIdempotencyKey,
        idempotencyRequestHash,
        createdBy,
      },
      client,
    );

    const updatedExpense = await updateExpenseAmount(
      validExpenseId,
      validated.newAmount,
      createdBy,
      client,
    );

    await client.query("COMMIT");

    return {
      correction: mapExpenseAmountCorrection(createdCorrection),
      expense: mapExpense(updatedExpense),
      isReplay: false,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    if (
      error.code === "23505" &&
      error.constraint === "uq_expense_amount_correction_idempotency"
    ) {
      const concurrentExistingCorrection =
        await findExpenseAmountCorrectionByIdempotencyKey(
          createdBy,
          validIdempotencyKey,
        );

      if (
        !concurrentExistingCorrection ||
        concurrentExistingCorrection.idempotency_request_hash !==
          idempotencyRequestHash
      ) {
        const conflictError = new Error(
          "Idempotency key has already been used for a different expense amount correction request",
        );
        conflictError.statusCode = 409;
        throw conflictError;
      }

      return {
        correction: mapExpenseAmountCorrection(concurrentExistingCorrection),
        isReplay: true,
      };
    }

    throw error;
  } finally {
    client.release();
  }
}

async function getExpenseAmountCorrectionsService(expenseId) {
  const validExpenseId = validateUuid(expenseId, "Expense ID");

  const expense = await findExpenseById(validExpenseId);

  if (!expense) {
    const error = new Error("Expense not found");
    error.statusCode = 404;
    throw error;
  }

  const corrections =
    await getExpenseAmountCorrectionsByExpenseId(validExpenseId);

  return corrections.map(mapExpenseAmountCorrection);
}

export {
  createExpenseService,
  getExpensesService,
  getExpenseByIdService,
  voidExpenseService,
  createExpenseAmountCorrectionService,
  getExpenseAmountCorrectionsService,
};
