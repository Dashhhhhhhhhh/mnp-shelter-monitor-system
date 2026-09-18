import apiClient from "../../../api/apiClient";

async function getCareRecordsByDate(date) {
  const response = await apiClient.get("/care-records", {
    params: { date },
  });

  return response.data;
}

async function createCareRecord(careRecord) {
  const response = await apiClient.post("/care-records", careRecord);

  return response.data;
}

async function completeCareRecord(careRecordId, completionData) {
  const response = await apiClient.post(
    `/care-records/${careRecordId}/complete`,
    completionData,
  );

  return response.data;
}

async function getCareRecordsForCage(cageId) {
  const response = await apiClient.get(`/cages/${cageId}/care-records`);
  return response.data;
}

export {
  getCareRecordsByDate,
  createCareRecord,
  completeCareRecord,
  getCareRecordsForCage,
};
