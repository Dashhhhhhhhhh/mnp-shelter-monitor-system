import apiClient from "../../../api/apiClient";

async function getCages() {
  const response = await apiClient.get("/cages");

  return response.data;
}

async function getCageById(cageId) {
  const response = await apiClient.get(`/cages/${cageId}`);

  return response.data;
}

async function createCage(data, idempotencyKey) {
  const response = await apiClient.post("/cages", data, {
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
  });

  return response.data;
}

async function updateCage(cageId, data) {
  const response = await apiClient.patch(`/cages/${cageId}`, data);

  return response.data;
}

export {
  getCages,
  getCageById,
  createCage,
  updateCage,
};