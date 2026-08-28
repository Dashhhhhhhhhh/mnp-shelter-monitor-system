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

function validateMedicationId(medicationId) {
  return validateUuid(medicationId, "medication ID");
}

function validateAnimalId(animalId) {
  return validateUuid(animalId, "animal ID");
}

function validateMedicalRecordId(medicalRecordId) {
  return validateUuid(medicalRecordId, "medical record ID");
}

function validateRequiredText(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    const error = new Error(`${fieldName} is required`);
    error.statusCode = 400;
    throw error;
  }

  return value.trim();
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

function validateRequiredLimitedText(value, fieldName, maxLength) {
  const normalized = validateRequiredText(value, fieldName);

  if (normalized.length > maxLength) {
    const error = new Error(
      `${fieldName} must not exceed ${maxLength} characters`,
    );
    error.statusCode = 400;
    throw error;
  }

  return normalized;
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

function validateMedicationName(medicationName) {
  return validateRequiredLimitedText(medicationName, "Medication name", 150);
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

function validateStartDate(startDate) {
  return validateDate(startDate, "Start date");
}

function validateEndDate(endDate) {
  return validateDate(endDate, "End date");
}

function validateCreateMedicationInput(data) {
  if (
    Object.prototype.hasOwnProperty.call(data, "status") ||
    Object.prototype.hasOwnProperty.call(data, "statusReason")
  ) {
    const error = new Error("Medication status cannot be set during creation");
    error.statusCode = 400;
    throw error;
  }
  
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error("Medication data must be an object");
    error.statusCode = 400;
    throw error;
  }

  const {
    animalId,
    medicalRecordId,
    medicationName,
    dosage,
    frequency,
    startDate,
    endDate,
    instructions,
  } = data;

  const validAnimalId = validateAnimalId(animalId);

  const validMedicalRecordId =
    medicalRecordId === undefined || medicalRecordId === null
      ? null
      : validateMedicalRecordId(medicalRecordId);

  const validMedicationName = validateMedicationName(medicationName);

  const validStartDate = validateStartDate(startDate);

  const validEndDate =
    endDate === undefined || endDate === null ? null : validateEndDate(endDate);

  if (validEndDate && validEndDate < validStartDate) {
    const error = new Error("End date cannot be earlier than start date");
    error.statusCode = 400;
    throw error;
  }

  return {
    animalId: validAnimalId,
    medicalRecordId: validMedicalRecordId,
    medicationName: validMedicationName,

    dosage: validateOptionalLimitedText(dosage, "Dosage", 100),

    frequency: validateOptionalLimitedText(frequency, "Frequency", 100),

    startDate: validStartDate,
    endDate: validEndDate,

    instructions: validateOptionalText(instructions, "Instructions"),
  };
}

function validateUpdateMedicationInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error("Medication update data must be an object");
    error.statusCode = 400;
    throw error;
  }

  // Status changes must use /complete or /discontinue
  if (
    Object.prototype.hasOwnProperty.call(data, "status") ||
    Object.prototype.hasOwnProperty.call(data, "statusReason")
  ) {
    const error = new Error(
      "Medication status cannot be updated through this endpoint",
    );
    error.statusCode = 400;
    throw error;
  }

  const hasAnimalId = Object.prototype.hasOwnProperty.call(data, "animalId");

  const hasMedicalRecordId = Object.prototype.hasOwnProperty.call(
    data,
    "medicalRecordId",
  );

  const hasMedicationName = Object.prototype.hasOwnProperty.call(
    data,
    "medicationName",
  );

  const hasDosage = Object.prototype.hasOwnProperty.call(data, "dosage");

  const hasFrequency = Object.prototype.hasOwnProperty.call(data, "frequency");

  const hasStartDate = Object.prototype.hasOwnProperty.call(data, "startDate");

  const hasEndDate = Object.prototype.hasOwnProperty.call(data, "endDate");

  const hasInstructions = Object.prototype.hasOwnProperty.call(
    data,
    "instructions",
  );

  if (
    !hasAnimalId &&
    !hasMedicalRecordId &&
    !hasMedicationName &&
    !hasDosage &&
    !hasFrequency &&
    !hasStartDate &&
    !hasEndDate &&
    !hasInstructions
  ) {
    const error = new Error("At least one medication field must be provided");
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

  if (hasMedicationName) {
    result.medicationName = validateMedicationName(data.medicationName);
  }

  if (hasDosage) {
    result.dosage = validateOptionalLimitedText(data.dosage, "Dosage", 100);
  }

  if (hasFrequency) {
    result.frequency = validateOptionalLimitedText(
      data.frequency,
      "Frequency",
      100,
    );
  }

  if (hasStartDate) {
    result.startDate = validateStartDate(data.startDate);
  }

  if (hasEndDate) {
    result.endDate =
      data.endDate === null ? null : validateEndDate(data.endDate);
  }

  if (hasInstructions) {
    result.instructions = validateOptionalText(
      data.instructions,
      "Instructions",
    );
  }

  // This catches the case where BOTH dates are included in the PATCH.
  if (result.startDate && result.endDate && result.endDate < result.startDate) {
    const error = new Error("End date cannot be earlier than start date");
    error.statusCode = 400;
    throw error;
  }

  return result;
}

function validateDiscontinueMedicationInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error(
      "Medication discontinuation data must be an object",
    );
    error.statusCode = 400;
    throw error;
  }

  const reason = validateRequiredText(data.reason, "Discontinuation reason");

  return {
    reason,
  };
}

export {
  validateMedicationId,
  validateAnimalId,
  validateMedicalRecordId,
  validateCreateMedicationInput,
  validateUpdateMedicationInput,
  validateDiscontinueMedicationInput,
};
