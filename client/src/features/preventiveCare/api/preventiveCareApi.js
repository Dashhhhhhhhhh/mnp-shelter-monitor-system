import apiClient from "../../../api/apiClient";

async function getAnimalPreventiveCare(animalId) {
  const response = await apiClient.get(`/animals/${animalId}/preventive-care`);

  return response.data;
}

async function createPreventiveCare(data) {
  const response = await apiClient.post("/preventive-care", data);

  return response.data;
}

async function updatePreventiveCare(preventiveCareId, data) {
  const response = await apiClient.patch(
    `/preventive-care/${preventiveCareId}`,
    data,
  );

  return response.data;
}

export { getAnimalPreventiveCare, createPreventiveCare, updatePreventiveCare };
