import apiClient from "../../../api/apiClient";

async function getAnimals(params = {}) {
  const response = await apiClient.get("/animals", {
    params,
  });

  return response.data;
}

async function getAnimalById(animalId) {
  const response = await apiClient.get(`/animals/${animalId}`);

  return response.data;
}

async function updateAnimal(animalId, data) {
  const response = await apiClient.patch(`/animals/${animalId}`, data);

  return response.data;
}

async function createAnimal(data, idempotencyKey) {
  const response = await apiClient.post("/animals", data, {
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
  });

  return response.data;
}

async function archiveAnimal(animalId) {
  const response = await apiClient.patch(`/animals/${animalId}/archive`);

  return response.data;
}

export { getAnimals, getAnimalById, updateAnimal, createAnimal, archiveAnimal };
