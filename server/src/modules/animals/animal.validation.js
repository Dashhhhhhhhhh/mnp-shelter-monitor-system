function validateCreateAnimalInput(animalData) {
  if (!animalData.species || !animalData.sex || !animalData.lifeStage) {
    const error = new Error("Species, sex, and life stage are required");
    error.statusCode = 400;
    throw error;
  }

  if (
    typeof animalData.species !== "string" ||
    typeof animalData.sex !== "string" ||
    typeof animalData.lifeStage !== "string"
  ) {
    const error = new Error("Species, sex, and life stage must be strings");
    error.statusCode = 400;
    throw error;
  }

  const species = animalData.species.trim().toUpperCase();
  const sex = animalData.sex.trim().toUpperCase();
  const lifeStage = animalData.lifeStage.trim().toUpperCase();

  const allowedSpecies = ["CAT", "DOG"];

  if (!allowedSpecies.includes(species)) {
    const error = new Error("Species must be CAT or DOG");
    error.statusCode = 400;
    throw error;
  }

  const allowedSex = ["MALE", "FEMALE"];

  if (!allowedSex.includes(sex)) {
    const error = new Error("Sex must be MALE or FEMALE");
    error.statusCode = 400;
    throw error;
  }

  const allowedLifeStages = ["KITTEN", "PUPPY", "ADULT", "OTHER"];

  if (!allowedLifeStages.includes(lifeStage)) {
    const error = new Error(
      "Life stage must be KITTEN, PUPPY, ADULT, or OTHER",
    );
    error.statusCode = 400;
    throw error;
  }

  if (
    (species === "CAT" && lifeStage === "PUPPY") ||
    (species === "DOG" && lifeStage === "KITTEN")
  ) {
    const error = new Error("Life stage is not valid for the selected species");
    error.statusCode = 400;
    throw error;
  }

  let animalName = null;

  if (animalData.animalName != null) {
    if (typeof animalData.animalName !== "string") {
      const error = new Error("Animal name must be a string");
      error.statusCode = 400;
      throw error;
    }

    animalName = animalData.animalName.trim() || null;

    if (animalName && animalName.length > 50) {
      const error = new Error("Animal name must not exceed 50 characters");
      error.statusCode = 400;
      throw error;
    }
  }

  let breed = null;

  if (animalData.breed != null) {
    if (typeof animalData.breed !== "string") {
      const error = new Error("Breed must be a string");
      error.statusCode = 400;
      throw error;
    }

    breed = animalData.breed.trim() || null;

    if (breed && breed.length > 100) {
      const error = new Error("Breed must not exceed 100 characters");
      error.statusCode = 400;
      throw error;
    }
  }

  let collarColor = null;

  if (animalData.collarColor != null) {
    if (typeof animalData.collarColor !== "string") {
      const error = new Error("Collar color must be a string");
      error.statusCode = 400;
      throw error;
    }

    collarColor = animalData.collarColor.trim() || null;

    if (collarColor && collarColor.length > 20) {
      const error = new Error("Collar color must not exceed 20 characters");
      error.statusCode = 400;
      throw error;
    }
  }

  let birthDate = null;

  if (animalData.birthDate) {
    if (typeof animalData.birthDate !== "string") {
      const error = new Error("Birth date must be in YYYY-MM-DD format");
      error.statusCode = 400;
      throw error;
    }

    birthDate = animalData.birthDate.trim();

    const birthDatePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (!birthDatePattern.test(birthDate)) {
      const error = new Error("Birth date must be in YYYY-MM-DD format");
      error.statusCode = 400;
      throw error;
    }

    const parsedDate = new Date(`${birthDate}T00:00:00Z`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== birthDate
    ) {
      const error = new Error("Birth date is invalid");
      error.statusCode = 400;
      throw error;
    }

    const today = new Date().toISOString().slice(0, 10);

    if (birthDate > today) {
      const error = new Error("Birth date cannot be in the future");
      error.statusCode = 400;
      throw error;
    }
  }

  let birthDateIsEstimated = false;

  if (animalData.birthDateIsEstimated != null) {
    if (typeof animalData.birthDateIsEstimated !== "boolean") {
      const error = new Error("Birth date estimated value must be boolean");
      error.statusCode = 400;
      throw error;
    }

    birthDateIsEstimated = animalData.birthDateIsEstimated;
  }

  if (!birthDate && birthDateIsEstimated) {
    const error = new Error(
      "Birth date cannot be marked as estimated without a birth date",
    );
    error.statusCode = 400;
    throw error;
  }

  const allowedHealthStatuses = [
    "HEALTHY",
    "SICK",
    "INJURED",
    "UNDER_OBSERVATION",
    "UNKNOWN",
  ];

  let healthStatus = "UNKNOWN";

  if (animalData.healthStatus != null) {
    if (typeof animalData.healthStatus !== "string") {
      const error = new Error("Health status must be a string");
      error.statusCode = 400;
      throw error;
    }

    healthStatus = animalData.healthStatus.trim().toUpperCase();

    if (!allowedHealthStatuses.includes(healthStatus)) {
      const error = new Error("Invalid health status");
      error.statusCode = 400;
      throw error;
    }
  }

  return {
    species,
    sex,
    lifeStage,
    animalName,
    breed,
    collarColor,
    birthDate,
    birthDateIsEstimated,
    healthStatus,
  };
}

function validateAnimalListQuery(query) {
  const search = typeof query.search === "string" ? query.search.trim() : "";

  const species =
    typeof query.species === "string"
      ? query.species.trim().toUpperCase()
      : null;

  const sex =
    typeof query.sex === "string" ? query.sex.trim().toUpperCase() : null;

  const lifeStage =
    typeof query.lifeStage === "string"
      ? query.lifeStage.trim().toUpperCase()
      : null;

  const healthStatus =
    typeof query.healthStatus === "string"
      ? query.healthStatus.trim().toUpperCase()
      : null;

  const adoptionStatus =
    typeof query.adoptionStatus === "string"
      ? query.adoptionStatus.trim().toUpperCase()
      : null;

  const status =
    typeof query.status === "string" ? query.status.trim().toUpperCase() : null;

  const sortBy = typeof query.sortBy === "string" ? query.sortBy : "createdAt";

  const sortOrder =
    typeof query.sortOrder === "string"
      ? query.sortOrder.toLowerCase()
      : "desc";

  const page = Math.max(parseInt(query.page, 10) || 1, 1);

  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);

  const allowedSpecies = ["CAT", "DOG"];

  if (species && !allowedSpecies.includes(species)) {
    const error = new Error("Invalid species");
    error.statusCode = 400;
    throw error;
  }

  const allowedSex = ["MALE", "FEMALE"];

  if (sex && !allowedSex.includes(sex)) {
    const error = new Error("Invalid sex");
    error.statusCode = 400;
    throw error;
  }

  const allowedLifeStages = ["KITTEN", "PUPPY", "ADULT", "OTHER"];

  if (lifeStage && !allowedLifeStages.includes(lifeStage)) {
    const error = new Error("Invalid life stage");
    error.statusCode = 400;
    throw error;
  }

  if (
    (species === "CAT" && lifeStage === "PUPPY") ||
    (species === "DOG" && lifeStage === "KITTEN")
  ) {
    const error = new Error("Life stage is not valid for the selected species");
    error.statusCode = 400;
    throw error;
  }

  const allowedHealthStatuses = [
    "HEALTHY",
    "SICK",
    "INJURED",
    "UNDER_OBSERVATION",
    "UNKNOWN",
  ];

  if (healthStatus && !allowedHealthStatuses.includes(healthStatus)) {
    const error = new Error("Invalid health status");
    error.statusCode = 400;
    throw error;
  }

  const allowedAdoptionStatuses = [
    "NOT_READY",
    "AVAILABLE",
    "RESERVED",
    "ADOPTED",
    "RETURNED",
  ];

  if (adoptionStatus && !allowedAdoptionStatuses.includes(adoptionStatus)) {
    const error = new Error("Invalid adoption status");
    error.statusCode = 400;
    throw error;
  }

  const allowedStatuses = [
    "ACTIVE",
    "ADOPTED",
    "PASSED_AWAY",
    "MISSING",
    "ESCAPED",
  ];

  if (status && !allowedStatuses.includes(status)) {
    const error = new Error("Invalid animal status");
    error.statusCode = 400;
    throw error;
  }

  const allowedSortFields = [
    "createdAt",
    "animalName",
    "animalCode",
    "species",
    "lifeStage",
    "healthStatus",
    "adoptionStatus",
  ];

  if (!allowedSortFields.includes(sortBy)) {
    const error = new Error("Invalid sort field");
    error.statusCode = 400;
    throw error;
  }

  if (!["asc", "desc"].includes(sortOrder)) {
    const error = new Error("Sort order must be asc or desc");
    error.statusCode = 400;
    throw error;
  }

  return {
    search,
    species,
    sex,
    lifeStage,
    healthStatus,
    adoptionStatus,
    status,
    sortBy,
    sortOrder,
    page,
    limit,
  };
}

function validateAnimalId(animalId) {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(animalId)) {
    const error = new Error("Invalid animal ID");
    error.statusCode = 400;
    throw error;
  }

  return animalId;
}
export { validateCreateAnimalInput, validateAnimalListQuery, validateAnimalId };
