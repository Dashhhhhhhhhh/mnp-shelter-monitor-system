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

function validateAssignmentId(assignmentId) {
  return validateUuid(assignmentId, "assignment ID");
}

function validateAnimalId(animalId) {
  return validateUuid(animalId, "animal ID");
}

function validateCageId(cageId) {
  return validateUuid(cageId, "cage ID");
}

function validateCreateAssignmentInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error("Cage assignment data must be an object");
    error.statusCode = 400;
    throw error;
  }

  const { animalId, cageId, reason } = data;

  const validAnimalId = validateAnimalId(animalId);

  const validCageId = validateCageId(cageId);

  if (reason !== undefined && reason !== null && typeof reason !== "string") {
    const error = new Error("Reason must be a string or null");
    error.statusCode = 400;
    throw error;
  }

  return {
    animalId: validAnimalId,
    cageId: validCageId,
    reason: typeof reason === "string" ? reason.trim() || null : null,
  };
}

function validateMoveAnimalInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error("Move data must be an object");
    error.statusCode = 400;
    throw error;
  }

  const { cageId, reason } = data;

  const validCageId = validateCageId(cageId);

  if (reason !== undefined && reason !== null && typeof reason !== "string") {
    const error = new Error("Reason must be a string or null");
    error.statusCode = 400;
    throw error;
  }

  return {
    cageId: validCageId,
    reason: typeof reason === "string" ? reason.trim() || null : null,
  };
}

export {
  validateAssignmentId,
  validateAnimalId,
  validateCageId,
  validateCreateAssignmentInput,
  validateMoveAnimalInput,
};
