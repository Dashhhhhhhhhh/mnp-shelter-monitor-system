import crypto from "crypto";

import {
  getNextAnimalCodeNumber,
  insertAnimal,
  findAnimals,
  findAnimalById,
  updateAnimalRecord,
  archiveAnimalRecord,
  findAnimalByIdempotencyKey,
} from "./animal.repository.js";

import {
  validateCreateAnimalInput,
  validateAnimalListQuery,
  validateAnimalId,
  validateUpdateAnimalInput,
} from "./animal.validation.js";

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

function createAnimalRequestHash(data) {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

async function generateAnimalCode(species) {
  const nextNumber = await getNextAnimalCodeNumber(species);

  const paddedNumber = String(nextNumber).padStart(3, "0");

  return `M&P-${species}-${paddedNumber}`;
}

async function createAnimal(animalData, createdBy, idempotencyKey) {
  const validIdempotencyKey = validateIdempotencyKey(idempotencyKey);

  const {
    species,
    sex,
    lifeStage,
    animalName,
    breed,
    collarColor,
    birthDate,
    birthDateIsEstimated,
    healthStatus,
  } = validateCreateAnimalInput(animalData);

  const status = "ACTIVE";
  const adoptionStatus = "NOT_READY";

  const idempotencyRequestHash = createAnimalRequestHash({
    species,
    sex,
    lifeStage,
    animalName,
    breed,
    collarColor,
    birthDate,
    birthDateIsEstimated,
    healthStatus,
  });

  // Check for a normal replay BEFORE generating an animal code.
  const existingAnimal = await findAnimalByIdempotencyKey(
    createdBy,
    validIdempotencyKey,
  );

  if (existingAnimal) {
    if (existingAnimal.idempotency_request_hash !== idempotencyRequestHash) {
      const error = new Error(
        "Idempotency key has already been used for a different animal request",
      );
      error.statusCode = 409;
      throw error;
    }

    return {
      animal: {
        animalId: existingAnimal.animal_id,
        animalCode: existingAnimal.animal_code,
        animalName: existingAnimal.animal_name,
        species: existingAnimal.species,
        breed: existingAnimal.breed,
        lifeStage: existingAnimal.life_stage,
        sex: existingAnimal.sex,
        collarColor: existingAnimal.collar_color,
        birthDate: existingAnimal.birth_date,
        birthDateIsEstimated: existingAnimal.birth_date_is_estimated,
        status: existingAnimal.status,
        healthStatus: existingAnimal.health_status,
        adoptionStatus: existingAnimal.adoption_status,
        createdBy: existingAnimal.created_by,
        createdAt: existingAnimal.created_at,
      },
      isReplay: true,
    };
  }

  let createdAnimal;
  let isReplay = false;

  try {
    // Only generate a code when no existing replay was found.
    const animalCode = await generateAnimalCode(species);

    createdAnimal = await insertAnimal({
      animalCode,
      animalName,
      species,
      breed,
      lifeStage,
      sex,
      collarColor,
      birthDate,
      birthDateIsEstimated,
      status,
      healthStatus,
      adoptionStatus,
      createdBy,
      idempotencyKey: validIdempotencyKey,
      idempotencyRequestHash,
    });
  } catch (error) {
    // Still needed for simultaneous/concurrent requests.
    if (
      error.code !== "23505" ||
      error.constraint !== "uq_animals_created_by_idempotency_key"
    ) {
      throw error;
    }

    const concurrentExistingAnimal = await findAnimalByIdempotencyKey(
      createdBy,
      validIdempotencyKey,
    );

    if (!concurrentExistingAnimal) {
      throw error;
    }

    if (
      concurrentExistingAnimal.idempotency_request_hash !==
      idempotencyRequestHash
    ) {
      const conflictError = new Error(
        "Idempotency key has already been used for a different animal request",
      );
      conflictError.statusCode = 409;
      throw conflictError;
    }

    createdAnimal = concurrentExistingAnimal;
    isReplay = true;
  }

  return {
    animal: {
      animalId: createdAnimal.animal_id,
      animalCode: createdAnimal.animal_code,
      animalName: createdAnimal.animal_name,
      species: createdAnimal.species,
      breed: createdAnimal.breed,
      lifeStage: createdAnimal.life_stage,
      sex: createdAnimal.sex,
      collarColor: createdAnimal.collar_color,
      birthDate: createdAnimal.birth_date,
      birthDateIsEstimated: createdAnimal.birth_date_is_estimated,
      status: createdAnimal.status,
      healthStatus: createdAnimal.health_status,
      adoptionStatus: createdAnimal.adoption_status,
      createdBy: createdAnimal.created_by,
      createdAt: createdAnimal.created_at,
    },
    isReplay,
  };
}

async function getAnimals(query) {
  const filters = validateAnimalListQuery(query);

  const { animals, totalItems } = await findAnimals(filters);

  const totalPages = Math.ceil(totalItems / filters.limit);

  const formattedAnimals = animals.map((animal) => ({
    animalId: animal.animal_id,
    animalCode: animal.animal_code,
    animalName: animal.animal_name,
    species: animal.species,
    breed: animal.breed,
    lifeStage: animal.life_stage,
    sex: animal.sex,
    collarColor: animal.collar_color,
    birthDate: animal.birth_date,
    birthDateIsEstimated: animal.birth_date_is_estimated,
    status: animal.status,
    healthStatus: animal.health_status,
    adoptionStatus: animal.adoption_status,
    createdAt: animal.created_at,
    updatedAt: animal.updated_at,
  }));

  return {
    animals: formattedAnimals,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      totalItems,
      totalPages,
    },
  };
}

async function getAnimalById(animalId) {
  const validAnimalId = validateAnimalId(animalId);

  const animal = await findAnimalById(validAnimalId);

  if (!animal) {
    const error = new Error("Animal not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    animalId: animal.animal_id,
    animalCode: animal.animal_code,
    animalName: animal.animal_name,
    species: animal.species,
    breed: animal.breed,
    lifeStage: animal.life_stage,
    sex: animal.sex,
    collarColor: animal.collar_color,
    birthDate: animal.birth_date,
    birthDateIsEstimated: animal.birth_date_is_estimated,
    status: animal.status,
    healthStatus: animal.health_status,
    adoptionStatus: animal.adoption_status,
    createdBy: animal.created_by,
    updatedBy: animal.updated_by,
    createdAt: animal.created_at,
    updatedAt: animal.updated_at,
  };
}

async function updateAnimal(animalId, animalData, updatedBy) {
  const validAnimalId = validateAnimalId(animalId);

  const existingAnimal = await findAnimalById(validAnimalId);

  if (!existingAnimal) {
    const error = new Error("Animal not found");
    error.statusCode = 404;
    throw error;
  }

  const updates = validateUpdateAnimalInput(animalData);

  // Species is not editable, so use the existing species
  if (
    (existingAnimal.species === "CAT" && updates.lifeStage === "PUPPY") ||
    (existingAnimal.species === "DOG" && updates.lifeStage === "KITTEN")
  ) {
    const error = new Error(
      "Life stage is not valid for this animal's species",
    );
    error.statusCode = 400;
    throw error;
  }

  // Check the FINAL birth-date state after the PATCH
  const finalBirthDate = Object.prototype.hasOwnProperty.call(
    updates,
    "birthDate",
  )
    ? updates.birthDate
    : existingAnimal.birth_date;

  const finalBirthDateIsEstimated = Object.prototype.hasOwnProperty.call(
    updates,
    "birthDateIsEstimated",
  )
    ? updates.birthDateIsEstimated
    : existingAnimal.birth_date_is_estimated;

  if (!finalBirthDate && finalBirthDateIsEstimated) {
    const error = new Error(
      "Birth date cannot be marked as estimated without a birth date",
    );
    error.statusCode = 400;
    throw error;
  }

  const updatedAnimal = await updateAnimalRecord(
    validAnimalId,
    updates,
    updatedBy,
  );

  return {
    animalId: updatedAnimal.animal_id,
    animalCode: updatedAnimal.animal_code,
    animalName: updatedAnimal.animal_name,
    species: updatedAnimal.species,
    breed: updatedAnimal.breed,
    lifeStage: updatedAnimal.life_stage,
    sex: updatedAnimal.sex,
    collarColor: updatedAnimal.collar_color,
    birthDate: updatedAnimal.birth_date,
    birthDateIsEstimated: updatedAnimal.birth_date_is_estimated,
    status: updatedAnimal.status,
    healthStatus: updatedAnimal.health_status,
    adoptionStatus: updatedAnimal.adoption_status,
    createdBy: updatedAnimal.created_by,
    updatedBy: updatedAnimal.updated_by,
    createdAt: updatedAnimal.created_at,
    updatedAt: updatedAnimal.updated_at,
  };
}

async function archiveAnimal(animalId, archivedBy) {
  const validAnimalId = validateAnimalId(animalId);

  const archivedAnimal = await archiveAnimalRecord(validAnimalId, archivedBy);

  if (!archivedAnimal) {
    const error = new Error("Animal not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    animalId: archivedAnimal.animal_id,
    animalCode: archivedAnimal.animal_code,
    animalName: archivedAnimal.animal_name,
    isArchived: archivedAnimal.is_archived,
    archivedAt: archivedAnimal.archived_at,
    archivedBy: archivedAnimal.archived_by,
  };
}
export { createAnimal, getAnimals, getAnimalById, updateAnimal, archiveAnimal };
