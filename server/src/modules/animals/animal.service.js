import {
  getNextAnimalCodeNumber,
  insertAnimal,
  findAnimals,
  findAnimalById,
  updateAnimalRecord,
} from "./animal.repository.js";

import {
  validateCreateAnimalInput,
  validateAnimalListQuery,
  validateAnimalId,
  validateUpdateAnimalInput,
} from "./animal.validation.js";

async function generateAnimalCode(species) {
  const nextNumber = await getNextAnimalCodeNumber(species);

  const paddedNumber = String(nextNumber).padStart(3, "0");

  return `M&P-${species}-${paddedNumber}`;
}

async function createAnimal(animalData, createdBy) {
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

  const animalCode = await generateAnimalCode(species);

  const status = "ACTIVE";
  const adoptionStatus = "NOT_READY";

  const createdAnimal = await insertAnimal({
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
  });

  return {
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
export { createAnimal, getAnimals, getAnimalById, updateAnimal };
