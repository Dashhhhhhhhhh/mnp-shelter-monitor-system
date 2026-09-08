const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hasAtMostTwoDecimalPlaces(value) {
  return Number(value.toFixed(2)) === value;
}

function validateEnum(value, fieldName, allowedValues) {
  if (typeof value !== "string") {
    const error = new Error(`${fieldName} is required`);
    error.statusCode = 400;
    throw error;
  }

  const normalized = value.trim().toUpperCase();

  if (!allowedValues.includes(normalized)) {
    const error = new Error(
      `${fieldName} must be one of: ${allowedValues.join(", ")}`,
    );
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function validateMoneyAmount(value, fieldName) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    const error = new Error(`${fieldName} must be a number greater than 0`);
    error.statusCode = 400;
    throw error;
  }

  if (!hasAtMostTwoDecimalPlaces(value)) {
    const error = new Error(
      `${fieldName} must not have more than 2 decimal places`,
    );
    error.statusCode = 400;
    throw error;
  }

  if (value > 9999999999.99) {
    const error = new Error(`${fieldName} is too large`);
    error.statusCode = 400;
    throw error;
  }

  return value;
}

function validateUuid(value, fieldName) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    const error = new Error(`Invalid ${fieldName}`);
    error.statusCode = 400;
    throw error;
  }

  return value;
}

function validateOptionalUuid(value, fieldName) {
  if (value === undefined || value === null) {
    return null;
  }

  return validateUuid(value, fieldName);
}

function validateOptionalText(value, fieldName, maxLength = null) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    const error = new Error(`${fieldName} must be a string or null`);
    error.statusCode = 400;
    throw error;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (maxLength !== null && normalized.length > maxLength) {
    const error = new Error(
      `${fieldName} must not exceed ${maxLength} characters`,
    );
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function validateIdempotencyKey(idempotencyKey) {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (typeof idempotencyKey !== "string" || !uuidPattern.test(idempotencyKey)) {
    const error = new Error("A valid Idempotency-Key header is required");
    error.statusCode = 400;
    throw error;
  }

  return idempotencyKey;
}

function validateDateTime(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    const error = new Error(`${fieldName} is required`);
    error.statusCode = 400;
    throw error;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${fieldName} must be a valid date and time`);
    error.statusCode = 400;
    throw error;
  }

  if (date.getTime() > Date.now()) {
    const error = new Error(`${fieldName} cannot be in the future`);
    error.statusCode = 400;
    throw error;
  }

  return date.toISOString();
}

export {
  validateEnum,
  validateMoneyAmount,
  validateUuid,
  validateOptionalUuid,
  validateOptionalText,
  validateIdempotencyKey,
  validateDateTime,
};
