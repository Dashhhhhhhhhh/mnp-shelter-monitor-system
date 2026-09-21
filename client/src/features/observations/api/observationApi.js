import apiClient from "../../../api/apiClient";

async function getObservations() {
  const response = await apiClient.get(`/observations`);

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

export { getObservations, createObservation, updateObservation };
