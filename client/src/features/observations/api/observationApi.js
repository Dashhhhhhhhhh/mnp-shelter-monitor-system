import apiClient from "../../../api/apiClient";

async function getObservations(params = {}) {
  const response = await apiClient.get("/observations", {
    params,
  });

  return response.data;
}

async function createObservation(data) {
  const response = await apiClient.post("/observations/", data);

  return response.data;
}

async function updateObservation(observationId, data) {
  const response = await apiClient.patch(
    `/observations/${observationId}`,
    data,
  );

  return response.data;
}

async function claimObservation(observationId) {
  const response = await apiClient.post(`/observations/${observationId}/claim`);

  return response.data;
}

async function monitorObservation(observationId) {
  const response = await apiClient.post(
    `/observations/${observationId}/monitor`,
  );

  return response.data;
}

async function resolveObservation(observationId) {
  const response = await apiClient.post(
    `/observations/${observationId}/resolve`,
  );

  return response.data;
}

async function escalateObservation(observationId) {
  const response = await apiClient.post(
    `/observations/${observationId}/escalate`,
  );

  return response.data;
}

async function takeOverObservation(observationId) {
  const response = await apiClient.post(
    `/observations/${observationId}/take-over`,
  );

  return response.data;
}

async function getObservationById(observationId) {
  const response = await apiClient.get(`/observations/${observationId}`);

  return response.data;
}

export {
  getObservations,
  createObservation,
  updateObservation,
  claimObservation,
  monitorObservation,
  resolveObservation,
  escalateObservation,
  takeOverObservation,
  getObservationById,
};
