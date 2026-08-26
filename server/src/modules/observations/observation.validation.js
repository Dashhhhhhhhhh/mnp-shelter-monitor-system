const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_OBSERVATION_TYPES = [
  "NOT_EATING",
  "VOMITING",
  "DIARRHEA",
  "INJURY",
  "LIMPING",
  "FIGHTING",
  "EYE_NOSE_DISCHARGE",
  "UNUSUAL_BEHAVIOR",
  "CAGE_CONCERN",
  "OTHER",
];

const ALLOWED_URGENCIES = ["NORMAL", "NEEDS_ATTENTION", "URGENT"];

function validateUuid(value, fieldName) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    const error = new Error(`Invalid ${fieldName}`);
    error.statusCode = 400;
    throw error;
  }

  return value;
}

function validateObservationId(observationId) {
  return validateUuid(observationId, "observation ID");
}

function validateCageId(cageId) {
  return validateUuid(cageId, "cage ID");
}

function validateAnimalId(animalId) {
  return validateUuid(animalId, "animal ID");
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

function validatePhoto(photo) {
  if (photo !== undefined && photo !== null && typeof photo !== "string") {
    const error = new Error("Photo must be a string or null");
    error.statusCode = 400;
    throw error;
  }

  if (typeof photo === "string") {
    return photo.trim() || null;
  }

  return null;
}

function validateCreateObservationInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error("Observation data must be an object");
    error.statusCode = 400;
    throw error;
  }

  const { cageId, animalId, observationType, urgency, notes, photo } = data;

  const validCageId = validateCageId(cageId);

  let validAnimalId = null;

  if (animalId !== undefined && animalId !== null) {
    validAnimalId = validateAnimalId(animalId);
  }

  const normalizedObservationType =
    typeof observationType === "string"
      ? observationType.trim().toUpperCase()
      : null;

  const normalizedUrgency =
    typeof urgency === "string" ? urgency.trim().toUpperCase() : null;

  if (!normalizedUrgency || !ALLOWED_URGENCIES.includes(normalizedUrgency)) {
    const error = new Error(
      "Urgency must be NORMAL, NEEDS_ATTENTION, or URGENT",
    );
    error.statusCode = 400;
    throw error;
  }

  return {
    cageId: validCageId,
    animalId: validAnimalId,
    observationType: observationType.toUpperCase(),
    urgency: normalizedUrgency,
    notes: validateNotes(notes),
    photo: validatePhoto(photo),
  };
}

function validateUpdateObservationInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error("Observation update data must be an object");
    error.statusCode = 400;
    throw error;
  }

  const hasCageId = Object.prototype.hasOwnProperty.call(data, "cageId");

  const hasAnimalId = Object.prototype.hasOwnProperty.call(data, "animalId");

  const hasObservationType = Object.prototype.hasOwnProperty.call(
    data,
    "observationType",
  );

  const hasUrgency = Object.prototype.hasOwnProperty.call(data, "urgency");

  const hasNotes = Object.prototype.hasOwnProperty.call(data, "notes");

  const hasPhoto = Object.prototype.hasOwnProperty.call(data, "photo");

  if (
    !hasCageId &&
    !hasAnimalId &&
    !hasObservationType &&
    !hasUrgency &&
    !hasNotes &&
    !hasPhoto
  ) {
    const error = new Error("At least one observation field must be provided");
    error.statusCode = 400;
    throw error;
  }

  const result = {};

  if (hasCageId) {
    result.cageId = validateCageId(data.cageId);
  }

  if (hasAnimalId) {
    result.animalId =
      data.animalId === null ? null : validateAnimalId(data.animalId);
  }

  if (hasObservationType) {
    const normalizedObservationType =
      typeof data.observationType === "string"
        ? data.observationType.trim().toUpperCase()
        : null;

    if (
      !normalizedObservationType ||
      !ALLOWED_OBSERVATION_TYPES.includes(normalizedObservationType)
    ) {
      const error = new Error("Invalid observation type");
      error.statusCode = 400;
      throw error;
    }

    result.observationType = normalizedObservationType;
  }

  if (hasUrgency) {
    const normalizedUrgency =
      typeof data.urgency === "string"
        ? data.urgency.trim().toUpperCase()
        : null;

    if (!normalizedUrgency || !ALLOWED_URGENCIES.includes(normalizedUrgency)) {
      const error = new Error(
        "Urgency must be NORMAL, NEEDS_ATTENTION, or URGENT",
      );
      error.statusCode = 400;
      throw error;
    }

    result.urgency = normalizedUrgency;
  }

  if (hasNotes) {
    result.notes = validateNotes(data.notes);
  }

  if (hasPhoto) {
    result.photo = validatePhoto(data.photo);
  }

  return result;
}

export {
  validateObservationId,
  validateCageId,
  validateAnimalId,
  validateCreateObservationInput,
  validateUpdateObservationInput,
};
