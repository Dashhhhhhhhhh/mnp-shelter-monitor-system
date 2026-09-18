import apiClient from "../../../api/apiClient";

async function createUser(userData) {
  const response = await apiClient.post("/users", userData);

  return response.data;
}

async function getActiveStaff() {
  const response = await apiClient.get("/users/staff");

  return response.data;
}
export { createUser, getActiveStaff };
