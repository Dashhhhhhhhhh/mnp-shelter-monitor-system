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

function validateMedicalRecordId(medicalRecordId) {
  return validateUuid(medicalRecordId, "medical record ID");
}

function validateAnimalId(animalId) {
  return validateUuid(animalId, "animal ID");
}

function validateObservationId(observationId) {
  return validateUuid(observationId, "observation ID");
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

const ALLOWED_MEDICAL_TYPES = ["VET_VISIT", "TREATMENT", "FOLLOW_UP", "OTHER"];

function validateMedicalType(medicalType) {
  const normalized =
    typeof medicalType === "string" ? medicalType.trim().toUpperCase() : null;

  if (!normalized || !ALLOWED_MEDICAL_TYPES.includes(normalized)) {
    const error = new Error(
      "Medical type must be VET_VISIT, TREATMENT, FOLLOW_UP, or OTHER",
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

function validateMedicalDate(medicalDate) {
  return validateDate(medicalDate, "Medical date");
}

function validateFollowUpDate(followUpDate) {
  return validateDate(followUpDate, "Follow-up date");
}

function validateRequiredText(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    const error = new Error(`${fieldName} is required`);
    error.statusCode = 400;
    throw error;
  }

  return value.trim();
}

function validateReason(reason) {
  return validateRequiredText(reason, "Reason");
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

function validateCreateMedicalRecordInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error("Medical record data must be an object");
    error.statusCode = 400;
    throw error;
  }

  const {
    animalId,
    observationId,
    medicalType,
    medicalDate,
    reason,
    clinic,
    vetName,
    diagnosis,
    treatment,
    followUpDate,
    notes,
  } = data;

  const validAnimalId = validateAnimalId(animalId);

  const validObservationId =
    observationId === undefined || observationId === null
      ? null
      : validateObservationId(observationId);

  const validMedicalType = validateMedicalType(medicalType);

  const validMedicalDate = validateMedicalDate(medicalDate);

  const validReason = validateReason(reason);

  const validFollowUpDate =
    followUpDate === undefined || followUpDate === null
      ? null
      : validateFollowUpDate(followUpDate);

  if (validFollowUpDate && validFollowUpDate < validMedicalDate) {
    const error = new Error(
      "Follow-up date cannot be earlier than medical date",
    );
    error.statusCode = 400;
    throw error;
  }

  return {
    animalId: validAnimalId,
    observationId: validObservationId,
    medicalType: validMedicalType,
    medicalDate: validMedicalDate,
    reason: validReason,

    clinic: validateOptionalLimitedText(clinic, "Clinic", 150),
    vetName: validateOptionalLimitedText(vetName, "Vet name", 100),

    diagnosis: validateOptionalText(diagnosis, "Diagnosis"),
    treatment: validateOptionalText(treatment, "Treatment"),
    followUpDate: validFollowUpDate,
    notes: validateOptionalText(notes, "Notes"),
  };
}

function validateUpdateMedicalRecordInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error("Medical record update data must be an object");
    error.statusCode = 400;
    throw error;
  }

  const hasAnimalId = Object.prototype.hasOwnProperty.call(data, "animalId");

  const hasObservationId = Object.prototype.hasOwnProperty.call(
    data,
    "observationId",
  );

  const hasMedicalType = Object.prototype.hasOwnProperty.call(
    data,
    "medicalType",
  );

  const hasMedicalDate = Object.prototype.hasOwnProperty.call(
    data,
    "medicalDate",
  );

  const hasReason = Object.prototype.hasOwnProperty.call(data, "reason");

  const hasClinic = Object.prototype.hasOwnProperty.call(data, "clinic");

  const hasVetName = Object.prototype.hasOwnProperty.call(data, "vetName");

  const hasDiagnosis = Object.prototype.hasOwnProperty.call(data, "diagnosis");

  const hasTreatment = Object.prototype.hasOwnProperty.call(data, "treatment");

  const hasFollowUpDate = Object.prototype.hasOwnProperty.call(
    data,
    "followUpDate",
  );

  const hasNotes = Object.prototype.hasOwnProperty.call(data, "notes");

  if (
    !hasAnimalId &&
    !hasObservationId &&
    !hasMedicalType &&
    !hasMedicalDate &&
    !hasReason &&
    !hasClinic &&
    !hasVetName &&
    !hasDiagnosis &&
    !hasTreatment &&
    !hasFollowUpDate &&
    !hasNotes
  ) {
    const error = new Error(
      "At least one medical record field must be provided",
    );
    error.statusCode = 400;
    throw error;
  }

  const result = {};

  if (hasAnimalId) {
    result.animalId = validateAnimalId(data.animalId);
  }

  if (hasObservationId) {
    result.observationId =
      data.observationId === null
        ? null
        : validateObservationId(data.observationId);
  }

  if (hasMedicalType) {
    result.medicalType = validateMedicalType(data.medicalType);
  }

  if (hasMedicalDate) {
    result.medicalDate = validateMedicalDate(data.medicalDate);
  }

  if (hasReason) {
    result.reason = validateReason(data.reason);
  }

  if (hasClinic) {
    result.clinic = validateOptionalLimitedText(data.clinic, "Clinic", 150);
  }

  if (hasVetName) {
    result.vetName = validateOptionalLimitedText(data.vetName, "Vet name", 100);
  }

  if (hasDiagnosis) {
    result.diagnosis = validateOptionalText(data.diagnosis, "Diagnosis");
  }

  if (hasTreatment) {
    result.treatment = validateOptionalText(data.treatment, "Treatment");
  }

  if (hasFollowUpDate) {
    result.followUpDate =
      data.followUpDate === null
        ? null
        : validateFollowUpDate(data.followUpDate);
  }

  if (hasNotes) {
    result.notes = validateOptionalText(data.notes, "Notes");
  }

  if (
    result.medicalDate &&
    result.followUpDate &&
    result.followUpDate < result.medicalDate
  ) {
    const error = new Error(
      "Follow-up date cannot be earlier than medical date",
    );
    error.statusCode = 400;
    throw error;
  }

  return result;
}

export {
  validateMedicalRecordId,
  validateAnimalId,
  validateObservationId,
  validateCreateMedicalRecordInput,
  validateUpdateMedicalRecordInput,
};
