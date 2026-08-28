const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUuid(value, fieldName) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    const error = new Error(`Invalid ${fieldName}`);
    error.statusCode = 400;
    throw error;
  }

  return value;
}

function validatePreventiveCareId(preventiveCareId) {
  return validateUuid(preventiveCareId, "preventive care ID");
}

function validateAnimalId(animalId) {
  return validateUuid(animalId, "animal ID");
}

function validateMedicalRecordId(medicalRecordId) {
  return validateUuid(medicalRecordId, "medical record ID");
}

const ALLOWED_CARE_TYPES = ["VACCINATION", "DEWORMING"];

function validateCareType(careType) {
  const normalized =
    typeof careType === "string" ? careType.trim().toUpperCase() : null;

  if (!normalized || !ALLOWED_CARE_TYPES.includes(normalized)) {
    const error = new Error("Care type must be VACCINATION or DEWORMING");
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function validateOptionalText(value, fieldName) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    const error = new Error(`${fieldName} must be a string or null`);
    error.statusCode = 400;
    throw error;
  }

  return value.trim() || null;
}

function validateOptionalLimitedText(value, fieldName, maxLength) {
  const normalized = validateOptionalText(value, fieldName);

  if (normalized && normalized.length > maxLength) {
    const error = new Error(
      `${fieldName} must not exceed ${maxLength} characters`,
    );
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function validateDate(value, fieldName) {
  if (typeof value !== "string") {
    const error = new Error(`${fieldName} must be in YYYY-MM-DD format`);
    error.statusCode = 400;
    throw error;
  }

  const trimmed = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const error = new Error(`${fieldName} must be in YYYY-MM-DD format`);
    error.statusCode = 400;
    throw error;
  }

  const [year, month, day] = trimmed.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    const error = new Error(`${fieldName} must be a valid calendar date`);
    error.statusCode = 400;
    throw error;
  }

  return trimmed;
}

function validateDateGiven(dateGiven) {
  return validateDate(dateGiven, "Date given");
}

function validateNextDueDate(nextDueDate) {
  return validateDate(nextDueDate, "Next due date");
}

function validateCreatePreventiveCareInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error("Preventive care data must be an object");
    error.statusCode = 400;
    throw error;
  }

  const {
    animalId,
    medicalRecordId,
    careType,
    dateGiven,
    productName,
    dose,
    nextDueDate,
    clinic,
    vetName,
    notes,
  } = data;

  const validAnimalId = validateAnimalId(animalId);

  const validMedicalRecordId =
    medicalRecordId === undefined || medicalRecordId === null
      ? null
      : validateMedicalRecordId(medicalRecordId);

  const validCareType = validateCareType(careType);

  const validDateGiven = validateDateGiven(dateGiven);

  const validNextDueDate =
    nextDueDate === undefined || nextDueDate === null
      ? null
      : validateNextDueDate(nextDueDate);

  if (validNextDueDate && validNextDueDate < validDateGiven) {
    const error = new Error("Next due date cannot be earlier than date given");
    error.statusCode = 400;
    throw error;
  }

  return {
    animalId: validAnimalId,
    medicalRecordId: validMedicalRecordId,
    careType: validCareType,
    dateGiven: validDateGiven,

    productName: validateOptionalLimitedText(productName, "Product name", 150),

    dose: validateOptionalLimitedText(dose, "Dose", 100),

    nextDueDate: validNextDueDate,

    clinic: validateOptionalLimitedText(clinic, "Clinic", 150),

    vetName: validateOptionalLimitedText(vetName, "Vet name", 100),

    notes: validateOptionalText(notes, "Notes"),
  };
}

function validateUpdatePreventiveCareInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error("Preventive care update data must be an object");
    error.statusCode = 400;
    throw error;
  }

  const hasAnimalId = Object.prototype.hasOwnProperty.call(data, "animalId");

  const hasMedicalRecordId = Object.prototype.hasOwnProperty.call(
    data,
    "medicalRecordId",
  );

  const hasCareType = Object.prototype.hasOwnProperty.call(data, "careType");

  const hasDateGiven = Object.prototype.hasOwnProperty.call(data, "dateGiven");

  const hasProductName = Object.prototype.hasOwnProperty.call(
    data,
    "productName",
  );

  const hasDose = Object.prototype.hasOwnProperty.call(data, "dose");

  const hasNextDueDate = Object.prototype.hasOwnProperty.call(
    data,
    "nextDueDate",
  );

  const hasClinic = Object.prototype.hasOwnProperty.call(data, "clinic");

  const hasVetName = Object.prototype.hasOwnProperty.call(data, "vetName");

  const hasNotes = Object.prototype.hasOwnProperty.call(data, "notes");

  if (
    !hasAnimalId &&
    !hasMedicalRecordId &&
    !hasCareType &&
    !hasDateGiven &&
    !hasProductName &&
    !hasDose &&
    !hasNextDueDate &&
    !hasClinic &&
    !hasVetName &&
    !hasNotes
  ) {
    const error = new Error(
      "At least one preventive care field must be provided",
    );
    error.statusCode = 400;
    throw error;
  }

  const result = {};

  if (hasAnimalId) {
    result.animalId = validateAnimalId(data.animalId);
  }

  if (hasMedicalRecordId) {
    result.medicalRecordId =
      data.medicalRecordId === null
        ? null
        : validateMedicalRecordId(data.medicalRecordId);
  }

  if (hasCareType) {
    result.careType = validateCareType(data.careType);
  }

  if (hasDateGiven) {
    result.dateGiven = validateDateGiven(data.dateGiven);
  }

  if (hasProductName) {
    result.productName = validateOptionalLimitedText(
      data.productName,
      "Product name",
      150,
    );
  }

  if (hasDose) {
    result.dose = validateOptionalLimitedText(data.dose, "Dose", 100);
  }

  if (hasNextDueDate) {
    result.nextDueDate =
      data.nextDueDate === null ? null : validateNextDueDate(data.nextDueDate);
  }

  if (hasClinic) {
    result.clinic = validateOptionalLimitedText(data.clinic, "Clinic", 150);
  }

  if (hasVetName) {
    result.vetName = validateOptionalLimitedText(data.vetName, "Vet name", 100);
  }

  if (hasNotes) {
    result.notes = validateOptionalText(data.notes, "Notes");
  }

  // Handles the case where BOTH dates are supplied in the PATCH.
  if (
    result.dateGiven &&
    result.nextDueDate &&
    result.nextDueDate < result.dateGiven
  ) {
    const error = new Error("Next due date cannot be earlier than date given");
    error.statusCode = 400;
    throw error;
  }

  return result;
}

export {
  validatePreventiveCareId,
  validateAnimalId,
  validateMedicalRecordId,
  validateCreatePreventiveCareInput,
  validateUpdatePreventiveCareInput,
};
