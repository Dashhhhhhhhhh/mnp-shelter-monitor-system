import pool from "../../../config/db.js";
import crypto from "crypto";

async function createExpense(
  {
    expenseDate,
    category,
    description,
    amount,
    animalId,
    medicalRecordId,
    receipt,
    notes,
    createdBy,
    idempotencyKey,
    idempotencyRequestHash,
  },
  db = pool,
) {
  const result = await db.query(
    `
      INSERT INTO expenses (
        expense_date,
        category,
        description,
        amount,
        animal_id,
        medical_record_id,
        receipt,
        notes,
        created_by,
        idempotency_key,
        idempotency_request_hash
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11
      )
      RETURNING
        expense_id,
        expense_date::text AS expense_date,
        category,
        description,
        amount::text AS amount,
        animal_id,
        medical_record_id,
        receipt,
        notes,
        created_by,
        updated_by,
        created_at,
        updated_at,
        void_reason,
        voided_by,
        voided_at,
        idempotency_key,
        idempotency_request_hash
    `,
    [
      expenseDate,
      category,
      description,
      amount,
      animalId,
      medicalRecordId,
      receipt,
      notes,
      createdBy,
      idempotencyKey,
      idempotencyRequestHash,
    ],
  );

  return result.rows[0];
}

async function findExpenseByIdempotencyKey(
  createdBy,
  idempotencyKey,
  db = pool,
) {
  const result = await db.query(
    `
      SELECT
        expense_id,
        expense_date::text AS expense_date,
        category,
        description,
        amount::text AS amount,
        animal_id,
        medical_record_id,
        receipt,
        notes,
        created_by,
        updated_by,
        created_at,
        updated_at,
        void_reason,
        voided_by,
        voided_at,
        idempotency_key,
        idempotency_request_hash
      FROM expenses
      WHERE created_by = $1
        AND idempotency_key = $2
    `,
    [createdBy, idempotencyKey],
  );

  return result.rows[0] || null;
}

async function findExpenseById(expenseId, db = pool) {
  const result = await db.query(
    `
      SELECT
        expense_id,
        expense_date::text AS expense_date,
        category,
        description,
        amount::text AS amount,
        animal_id,
        medical_record_id,
        receipt,
        notes,
        created_by,
        updated_by,
        created_at,
        updated_at,
        void_reason,
        voided_by,
        voided_at,
        idempotency_key,
        idempotency_request_hash
      FROM expenses
      WHERE expense_id = $1
    `,
    [expenseId],
  );

  return result.rows[0] || null;
}

async function findExpenseByIdForUpdate(expenseId, db = pool) {
  const result = await db.query(
    `
      SELECT
        expense_id,
        expense_date::text AS expense_date,
        category,
        description,
        amount::text AS amount,
        animal_id,
        medical_record_id,
        receipt,
        notes,
        created_by,
        updated_by,
        created_at,
        updated_at,
        void_reason,
        voided_by,
        voided_at,
        idempotency_key,
        idempotency_request_hash
      FROM expenses
      WHERE expense_id = $1
      FOR UPDATE
    `,
    [expenseId],
  );

  return result.rows[0] || null;
}

async function getExpenses(filters, db = pool) {
  const {
    limit,
    offset,
    sortBy,
    sortOrder,
    category,
    animalId,
    medicalRecordId,
    isVoided,
    search,
    dateFrom,
    dateTo,
  } = filters;

  const conditions = [];
  const values = [];

  function addCondition(condition, value) {
    values.push(value);
    conditions.push(condition.replace("?", `$${values.length}`));
  }

  if (category != null) {
    addCondition("category = ?", category);
  }

  if (animalId != null) {
    addCondition("animal_id = ?", animalId);
  }

  if (medicalRecordId != null) {
    addCondition("medical_record_id = ?", medicalRecordId);
  }

  if (isVoided === true) {
    conditions.push("voided_at IS NOT NULL");
  }

  if (isVoided === false) {
    conditions.push("voided_at IS NULL");
  }

  if (search != null) {
    values.push(search);

    const searchPlaceholder = `$${values.length}`;

    conditions.push(
      `(description ILIKE '%' || ${searchPlaceholder} || '%'
        OR COALESCE(notes, '') ILIKE '%' || ${searchPlaceholder} || '%')`,
    );
  }

  if (dateFrom != null) {
    addCondition("expense_date >= ?", dateFrom);
  }

  if (dateTo != null) {
    addCondition("expense_date <= ?", dateTo);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sortColumns = {
    expenseDate: "expense_date",
    amount: "amount",
    createdAt: "created_at",
    category: "category",
    description: "description",
  };

  const sortColumn = sortColumns[sortBy];

  const countResult = await db.query(
    `
      SELECT COUNT(*)::int AS total
      FROM expenses
      ${whereClause}
    `,
    values,
  );

  const queryValues = [...values, limit, offset];

  const limitPlaceholder = `$${values.length + 1}`;
  const offsetPlaceholder = `$${values.length + 2}`;

  const result = await db.query(
    `
      SELECT
        expense_id,
        expense_date::text AS expense_date,
        category,
        description,
        amount::text AS amount,
        animal_id,
        medical_record_id,
        receipt,
        notes,
        created_by,
        updated_by,
        created_at,
        updated_at,
        void_reason,
        voided_by,
        voided_at
      FROM expenses
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}, expense_id ${sortOrder}
      LIMIT ${limitPlaceholder}
      OFFSET ${offsetPlaceholder}
    `,
    queryValues,
  );

  return {
    expenses: result.rows,
    total: countResult.rows[0].total,
  };
}

async function voidExpense(expenseId, voidedBy, voidReason, db = pool) {
  const result = await db.query(
    `
      UPDATE expenses
      SET
        void_reason = $2,
        voided_by = $3,
        voided_at = CURRENT_TIMESTAMP,
        updated_by = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE expense_id = $1
        AND voided_at IS NULL
      RETURNING
        expense_id,
        expense_date::text AS expense_date,
        category,
        description,
        amount::text AS amount,
        animal_id,
        medical_record_id,
        receipt,
        notes,
        created_by,
        updated_by,
        created_at,
        updated_at,
        void_reason,
        voided_by,
        voided_at
    `,
    [expenseId, voidReason, voidedBy],
  );

  return result.rows[0] || null;
}

async function hasActiveFundingAllocationsForExpense(expenseId, db = pool) {
  const result = await db.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM expense_funding_allocations
        WHERE expense_id = $1
          AND voided_at IS NULL
      ) AS has_active_allocations
    `,
    [expenseId],
  );

  return result.rows[0].has_active_allocations;
}

async function createExpenseAmountCorrection(
  {
    expenseId,
    oldAmount,
    newAmount,
    correctionReason,
    idempotencyKey,
    idempotencyRequestHash,
    createdBy,
  },
  db = pool,
) {
  const result = await db.query(
    `
      INSERT INTO expense_amount_corrections (
        expense_id,
        old_amount,
        new_amount,
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
        expense_id,
        old_amount::text AS old_amount,
        new_amount::text AS new_amount,
        correction_reason,
        corrected_at,
        idempotency_key,
        idempotency_request_hash,
        created_by,
        created_at
    `,
    [
      expenseId,
      oldAmount,
      newAmount,
      correctionReason,
      idempotencyKey,
      idempotencyRequestHash,
      createdBy,
    ],
  );

  return result.rows[0];
}
async function findExpenseAmountCorrectionByIdempotencyKey(
  createdBy,
  idempotencyKey,
  db = pool,
) {
  const result = await db.query(
    `
      SELECT
        correction_id,
        expense_id,
        old_amount::text AS old_amount,
        new_amount::text AS new_amount,
        correction_reason,
        corrected_at,
        idempotency_key,
        idempotency_request_hash,
        created_by,
        created_at
      FROM expense_amount_corrections
      WHERE created_by = $1
        AND idempotency_key = $2
    `,
    [createdBy, idempotencyKey],
  );

  return result.rows[0] || null;
}

async function updateExpenseAmount(expenseId, newAmount, updatedBy, db = pool) {
  const result = await db.query(
    `
      UPDATE expenses
      SET
        amount = $2,
        updated_by = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE expense_id = $1
      RETURNING
        expense_id,
        expense_date::text AS expense_date,
        category,
        description,
        amount::text AS amount,
        animal_id,
        medical_record_id,
        receipt,
        notes,
        created_by,
        updated_by,
        created_at,
        updated_at,
        void_reason,
        voided_by,
        voided_at
    `,
    [expenseId, newAmount, updatedBy],
  );

  return result.rows[0] || null;
}

async function getActiveFundingTotalForExpense(expenseId, db = pool) {
  const result = await db.query(
    `
      SELECT
        COALESCE(SUM(allocation_amount), 0)::text AS active_funding_total
      FROM expense_funding_allocations
      WHERE expense_id = $1
        AND voided_at IS NULL
    `,
    [expenseId],
  );

  return result.rows[0].active_funding_total;
}

async function getExpenseAmountCorrectionsByExpenseId(expenseId, db = pool) {
  const result = await db.query(
    `
      SELECT
        correction_id,
        expense_id,
        old_amount::text AS old_amount,
        new_amount::text AS new_amount,
        correction_reason,
        corrected_at,
        created_by,
        created_at
      FROM expense_amount_corrections
      WHERE expense_id = $1
      ORDER BY corrected_at DESC, correction_id DESC
    `,
    [expenseId],
  );

  return result.rows;
}

export {
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
};
