const ALLOWED_SPECIES_GROUPS = ["CAT", "DOG"];

const ALLOWED_GENDER_GROUPS = ["MALE", "FEMALE", "MIXED"];

const ALLOWED_CAGE_TYPES = ["NORMAL", "ISOLATION", "TEMPORARY"];

const ALLOWED_CAGE_STATUSES = ["ACTIVE", "INACTIVE", "PLANNED"];

function validateCageId(cageId) {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (typeof cageId !== "string" || !uuidPattern.test(cageId)) {
    const error = new Error("Invalid cage ID");
    error.statusCode = 400;
    throw error;
  }

  return cageId;
}

function validateCreateCageInput(cageData) {
  if (!cageData || typeof cageData !== "object" || Array.isArray(cageData)) {
    const error = new Error("Cage data must be an object");
    error.statusCode = 400;
    throw error;
  }

  const {
    speciesGroup,
    genderGroup,
    recommendedCapacity,
    cageType,
    status,
    location,
  } = cageData;

  if (!speciesGroup) {
    const error = new Error("Species group is required");
    error.statusCode = 400;
    throw error;
  }

  if (
    typeof speciesGroup !== "string" ||
    !ALLOWED_SPECIES_GROUPS.includes(speciesGroup.toUpperCase())
  ) {
    const error = new Error("Species group must be CAT, DOG");
    error.statusCode = 400;
    throw error;
  }

  if (!genderGroup) {
    const error = new Error("Gender group is required");
    error.statusCode = 400;
    throw error;
  }

  if (
    typeof genderGroup !== "string" ||
    !ALLOWED_GENDER_GROUPS.includes(genderGroup.toUpperCase())
  ) {
    const error = new Error("Gender group must be MALE, FEMALE, or MIXED");
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isInteger(recommendedCapacity) || recommendedCapacity <= 0) {
    const error = new Error("Recommended capacity must be a positive integer");
    error.statusCode = 400;
    throw error;
  }

  if (
    cageType !== undefined &&
    (typeof cageType !== "string" ||
      !ALLOWED_CAGE_TYPES.includes(cageType.toUpperCase()))
  ) {
    const error = new Error(
      "Cage type must be NORMAL, ISOLATION, or TEMPORARY",
    );
    error.statusCode = 400;
    throw error;
  }

  if (
    status !== undefined &&
    (typeof status !== "string" ||
      !ALLOWED_CAGE_STATUSES.includes(status.toUpperCase()))
  ) {
    const error = new Error("Cage status must be ACTIVE, INACTIVE, or PLANNED");
    error.statusCode = 400;
    throw error;
  }

  if (
    location !== undefined &&
    location !== null &&
    typeof location !== "string"
  ) {
    const error = new Error("Location must be a string or null");
    error.statusCode = 400;
    throw error;
  }

  if (typeof location === "string" && location.trim().length > 100) {
    const error = new Error("Location must not exceed 100 characters");
    error.statusCode = 400;
    throw error;
  }

  return {
    speciesGroup: speciesGroup.toUpperCase(),
    genderGroup: genderGroup.toUpperCase(),
    recommendedCapacity,
    cageType: cageType?.toUpperCase() || "NORMAL",
    status: status?.toUpperCase() || "ACTIVE",
    location: typeof location === "string" ? location.trim() || null : null,
  };
}

function validateUpdateCageInput(cageData) {
  if (!cageData || typeof cageData !== "object" || Array.isArray(cageData)) {
    const error = new Error("Cage data must be an object");
    error.statusCode = 400;
    throw error;
  }

  const updates = {};

  if (Object.prototype.hasOwnProperty.call(cageData, "speciesGroup")) {
    if (
      typeof cageData.speciesGroup !== "string" ||
      !ALLOWED_SPECIES_GROUPS.includes(cageData.speciesGroup.toUpperCase())
    ) {
      const error = new Error("Species group must be CAT, DOG, or MIXED");
      error.statusCode = 400;
      throw error;
    }

    updates.speciesGroup = cageData.speciesGroup.toUpperCase();
  }

  if (Object.prototype.hasOwnProperty.call(cageData, "genderGroup")) {
    if (
      typeof cageData.genderGroup !== "string" ||
      !ALLOWED_GENDER_GROUPS.includes(cageData.genderGroup.toUpperCase())
    ) {
      const error = new Error("Gender group must be MALE, FEMALE, or MIXED");
      error.statusCode = 400;
      throw error;
    }

    updates.genderGroup = cageData.genderGroup.toUpperCase();
  }

  if (Object.prototype.hasOwnProperty.call(cageData, "recommendedCapacity")) {
    if (
      !Number.isInteger(cageData.recommendedCapacity) ||
      cageData.recommendedCapacity <= 0
    ) {
      const error = new Error(
        "Recommended capacity must be a positive integer",
      );
      error.statusCode = 400;
      throw error;
    }

    updates.recommendedCapacity = cageData.recommendedCapacity;
  }

  if (Object.prototype.hasOwnProperty.call(cageData, "cageType")) {
    if (
      typeof cageData.cageType !== "string" ||
      !ALLOWED_CAGE_TYPES.includes(cageData.cageType.toUpperCase())
    ) {
      const error = new Error(
        "Cage type must be NORMAL, ISOLATION, or TEMPORARY",
      );
      error.statusCode = 400;
      throw error;
    }

    updates.cageType = cageData.cageType.toUpperCase();
  }

  if (Object.prototype.hasOwnProperty.call(cageData, "status")) {
    if (
      typeof cageData.status !== "string" ||
      !ALLOWED_CAGE_STATUSES.includes(cageData.status.toUpperCase())
    ) {
      const error = new Error(
        "Cage status must be ACTIVE, INACTIVE, or PLANNED",
      );
      error.statusCode = 400;
      throw error;
    }

    updates.status = cageData.status.toUpperCase();
  }

  if (Object.prototype.hasOwnProperty.call(cageData, "location")) {
    if (cageData.location !== null && typeof cageData.location !== "string") {
      const error = new Error("Location must be a string or null");
      error.statusCode = 400;
      throw error;
    }

    if (
      typeof cageData.location === "string" &&
      cageData.location.trim().length > 100
    ) {
      const error = new Error("Location must not exceed 100 characters");
      error.statusCode = 400;
      throw error;
    }

    updates.location =
      typeof cageData.location === "string"
        ? cageData.location.trim() || null
        : null;
  }

  if (Object.keys(updates).length === 0) {
    const error = new Error("At least one editable cage field is required");
    error.statusCode = 400;
    throw error;
  }

  return updates;
}

export { validateCageId, validateCreateCageInput, validateUpdateCageInput };
