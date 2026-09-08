import {
  validateEnum,
  validateMoneyAmount,
  validateOptionalUuid,
  validateOptionalText,
  validateDateTime,
} from "./finance.validation.utils.js";

const ALLOWED_EXPENSE_CATEGORIES = [
  "VET",
  "MEDICINE",
  "FOOD",
  "LITTER",
  "CAGE_SUPPLIES",
  "CLEANING_SUPPLIES",
  "TRANSPORTATION",
  "OTHER",
];

function validateExpenseCategory(category) {
  return validateEnum(category, "Expense category", ALLOWED_EXPENSE_CATEGORIES);
}

function getPhilippinesDateString() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = {};

  for (const part of parts) {
    values[part.type] = part.value;
  }

  return `${values.year}-${values.month}-${values.day}`;
}

function validateDate(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    const error = new Error(`${fieldName} is required`);
    error.statusCode = 400;
    throw error;
  }

  const trimmedValue = value.trim();

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!datePattern.test(trimmedValue)) {
    const error = new Error(`${fieldName} must be in YYYY-MM-DD format`);
    error.statusCode = 400;
    throw error;
  }

  const date = new Date(`${trimmedValue}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${fieldName} must be a valid date`);
    error.statusCode = 400;
    throw error;
  }

  const [year, month, day] = trimmedValue.split("-").map(Number);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    const error = new Error(`${fieldName} must be a valid date`);
    error.statusCode = 400;
    throw error;
  }

  const today = getPhilippinesDateString();

  if (trimmedValue > today) {
    const error = new Error(`${fieldName} cannot be in the future`);
    error.statusCode = 400;
    throw error;
  }

  return trimmedValue;
}

function validateCreateExpenseInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error("Expense data must be an object");
    error.statusCode = 400;
    throw error;
  }

  const expenseDate = validateDate(data.expenseDate, "Expense date");

  const category = validateExpenseCategory(data.category);

  if (typeof data.description !== "string" || !data.description.trim()) {
    const error = new Error("Expense description is required");
    error.statusCode = 400;
    throw error;
  }

  const description = data.description.trim();

  const amount = validateMoneyAmount(data.amount, "Expense amount");

  const animalId = validateOptionalUuid(data.animalId, "animal ID");

  const medicalRecordId = validateOptionalUuid(
    data.medicalRecordId,
    "medical record ID",
  );

  const receipt = validateOptionalText(data.receipt, "Receipt");

  const notes = validateOptionalText(data.notes, "Notes");

  return {
    expenseDate,
    category,
    description,
    amount,
    animalId,
    medicalRecordId,
    receipt,
    notes,
  };
}

function validateExpenseListQuery(query) {
  if (!query || typeof query !== "object" || Array.isArray(query)) {
    const error = new Error("Expense query must be an object");
    error.statusCode = 400;
    throw error;
  }

  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 20 : Number(query.limit);

  if (!Number.isInteger(page) || page < 1) {
    const error = new Error("Page must be a positive integer");
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    const error = new Error("Limit must be an integer between 1 and 100");
    error.statusCode = 400;
    throw error;
  }

  const allowedSortFields = [
    "expenseDate",
    "amount",
    "createdAt",
    "category",
    "description",
  ];

  const sortBy = query.sortBy ?? "expenseDate";

  if (!allowedSortFields.includes(sortBy)) {
    const error = new Error(
      `Sort by must be one of: ${allowedSortFields.join(", ")}`,
    );
    error.statusCode = 400;
    throw error;
  }

  const sortOrder =
    query.sortOrder === undefined
      ? "DESC"
      : String(query.sortOrder).trim().toUpperCase();

  if (!["ASC", "DESC"].includes(sortOrder)) {
    const error = new Error("Sort order must be ASC or DESC");
    error.statusCode = 400;
    throw error;
  }

  const category =
    query.category === undefined
      ? null
      : validateExpenseCategory(query.category);

  const animalId =
    query.animalId === undefined
      ? null
      : validateOptionalUuid(query.animalId, "animal ID");

  const medicalRecordId =
    query.medicalRecordId === undefined
      ? null
      : validateOptionalUuid(query.medicalRecordId, "medical record ID");

  let isVoided = null;

  if (query.isVoided !== undefined) {
    if (query.isVoided === "true") {
      isVoided = true;
    } else if (query.isVoided === "false") {
      isVoided = false;
    } else {
      const error = new Error("isVoided must be true or false");
      error.statusCode = 400;
      throw error;
    }
  }

  const search =
    query.search === undefined
      ? null
      : validateOptionalText(query.search, "Search", 255);

  const dateFrom =
    query.dateFrom === undefined
      ? null
      : validateDate(query.dateFrom, "Date from");

  const dateTo =
    query.dateTo === undefined ? null : validateDate(query.dateTo, "Date to");

  if (dateFrom && dateTo && dateFrom > dateTo) {
    const error = new Error("Date from cannot be after date to");
    error.statusCode = 400;
    throw error;
  }

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    sortBy,
    sortOrder,
    category,
    animalId,
    medicalRecordId,
    isVoided,
    search,
    dateFrom,
    dateTo,
  };
}

function validateVoidExpenseInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error("Expense void data must be an object");
    error.statusCode = 400;
    throw error;
  }

  if (typeof data.voidReason !== "string" || !data.voidReason.trim()) {
    const error = new Error("Void reason is required");
    error.statusCode = 400;
    throw error;
  }

  return {
    voidReason: data.voidReason.trim(),
  };
}

function validateExpenseAmountCorrectionInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error("Expense amount correction data must be an object");
    error.statusCode = 400;
    throw error;
  }

  const newAmount = validateMoneyAmount(data.newAmount, "New expense amount");

  if (
    typeof data.correctionReason !== "string" ||
    !data.correctionReason.trim()
  ) {
    const error = new Error("Correction reason is required");
    error.statusCode = 400;
    throw error;
  }

  const correctionReason = data.correctionReason.trim();

  return {
    newAmount,
    correctionReason,
  };
}

export {
  validateCreateExpenseInput,
  validateExpenseListQuery,
  validateVoidExpenseInput,
  validateExpenseAmountCorrectionInput,
};
