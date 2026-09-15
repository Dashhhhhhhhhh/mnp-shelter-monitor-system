import apiClient from "../../../api/apiClient";

async function createCageAssignment(data) {
  const response = await apiClient.post("/cage-assignments", data);
  return response.data;
}

async function getCurrentAssignments() {
  const response = await apiClient.get("/cage-assignments/current");
  return response.data;
}

async function removeCageAssignment(assignmentId) {
  const response = await apiClient.post(
    `/cage-assignments/${assignmentId}/remove`,
  );

  return response.data;
}

async function getCageAssignmentHistory(cageId) {
  const response = await apiClient.get(`/cages/${cageId}/assignments`);

  return response.data;
}

async function getAnimalCageHistory(animalId) {
  const response = await apiClient.get(`/animals/${animalId}/cage-history`);

  return response.data;
}

async function moveAnimal(animalId, data) {
  const response = await apiClient.post(`/animals/${animalId}/move`, data);

  return response.data;
}

export {
  createCageAssignment,
  getCurrentAssignments,
  removeCageAssignment,
  getCageAssignmentHistory,
  getAnimalCageHistory,
  moveAnimal,
};
