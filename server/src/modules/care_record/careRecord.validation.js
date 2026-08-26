const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_CARE_PERIODS = ["AM", "PM", "EXTRA"];

const ALLOWED_CARE_TYPES = ["FEEDING", "CLEANING", "RELIEF_BREAK"];

const ALLOWED_CLEANING_TYPES = ["LITTER_BOX", "FULL_CAGE"];

function validateUuid(value, fieldName) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    const error = new Error(`Invalid ${fieldName}`);
    error.statusCode = 400;
    throw error;
  }

  return value;
}

function validateCareRecordId(careRecordId) {
  return validateUuid(careRecordId, "care record ID");
}

function validateCageId(cageId) {
  return validateUuid(cageId, "cage ID");
}

function validateDate(date, fieldName) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const error = new Error(`${fieldName} must use YYYY-MM-DD format`);
    error.statusCode = 400;
    throw error;
  }

  const [year, month, day] = date.split("-").map(Number);

  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    const error = new Error(`${fieldName} must be a valid calendar date`);
    error.statusCode = 400;
    throw error;
  }

  return date;
}

function validateNotes(notes) {
  if (notes !== undefined && notes !== null && typeof notes !== "string") {
    const error = new Error("Notes must be a string or null");
    error.statusCode = 400;
    throw error;
  }

  if (typeof notes === "string") {
    return notes.trim() || null;
  }

  return null;
}

function validateCareDate(careDate) {
  if (typeof careDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(careDate)) {
    const error = new Error("Care date must use YYYY-MM-DD format");
    error.statusCode = 400;
    throw error;
  }

  const [year, month, day] = careDate.split("-").map(Number);

  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    const error = new Error("Care date must be a valid calendar date");
    error.statusCode = 400;
    throw error;
  }

  return careDate;
}

function validateCreateCareRecordInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error("Care record data must be an object");
    error.statusCode = 400;
    throw error;
  }

  const { cageId, careDate, carePeriod, careType, cleaningType, notes } = data;

  const validCageId = validateCageId(cageId);
  const validCareDate = validateCareDate(careDate);

  if (
    typeof carePeriod !== "string" ||
    !ALLOWED_CARE_PERIODS.includes(carePeriod.toUpperCase())
  ) {
    const error = new Error("Care period must be AM, PM, or EXTRA");
    error.statusCode = 400;
    throw error;
  }

  if (
    typeof careType !== "string" ||
    !ALLOWED_CARE_TYPES.includes(careType.toUpperCase())
  ) {
    const error = new Error(
      "Care type must be FEEDING, CLEANING, or RELIEF_BREAK",
    );
    error.statusCode = 400;
    throw error;
  }

  const normalizedCareType = careType.toUpperCase();

  let normalizedCleaningType = null;

  if (normalizedCareType === "CLEANING") {
    if (
      typeof cleaningType !== "string" ||
      !ALLOWED_CLEANING_TYPES.includes(cleaningType.toUpperCase())
    ) {
      const error = new Error(
        "Cleaning type must be LITTER_BOX or FULL_CAGE when care type is CLEANING",
      );
      error.statusCode = 400;
      throw error;
    }

    normalizedCleaningType = cleaningType.toUpperCase();
  } else if (cleaningType !== undefined && cleaningType !== null) {
    const error = new Error(
      "Cleaning type must be null unless care type is CLEANING",
    );
    error.statusCode = 400;
    throw error;
  }

  return {
    cageId: validCageId,
    careDate: validCareDate,
    carePeriod: carePeriod.toUpperCase(),
    careType: normalizedCareType,
    cleaningType: normalizedCleaningType,
    notes: validateNotes(notes),
  };
}

export {
  validateCareRecordId,
  validateCageId,
  validateCreateCareRecordInput,
  validateCareDate,
};
