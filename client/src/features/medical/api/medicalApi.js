import apiClient from "../../../api/apiClient";

async function getMedicalRecords() {
  const response = await apiClient.get("/medical-records");
  return response.data;
}

async function getMedicalRecordById(medicalRecordId) {
  const response = await apiClient.get(`/medical-records/${medicalRecordId}`);

  return response.data;
}

async function createMedicalRecord(data) {
  const response = await apiClient.post("/medical-records", data);

  return response.data;
}

async function updateMedicalRecord(medicalRecordId, data) {
  const response = await apiClient.patch(
    `/medical-records/${medicalRecordId}`,
    data,
  );

  return response.data;
}

async function getAnimalMedicalRecords(animalId) {
  const response = await apiClient.get(`/animals/${animalId}/medical-records`);

  return response.data;
}

export {
  getMedicalRecords,
  getMedicalRecordById,
  createMedicalRecord,
  updateMedicalRecord,
  getAnimalMedicalRecords,
};
