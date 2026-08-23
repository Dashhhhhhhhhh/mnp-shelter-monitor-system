import {
  getNextAnimalCodeNumber,
  insertAnimal,
  findAnimals,
} from "./animal.repository.js";
import {
  validateCreateAnimalInput,
  validateAnimalListQuery,
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

export { createAnimal, getAnimals };
