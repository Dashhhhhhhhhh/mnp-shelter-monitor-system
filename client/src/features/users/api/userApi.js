import apiClient from "../../../api/apiClient";

async function createUser(userData) {
  const response = await apiClient.post("/users", userData);

  return response.data;
}

export { createUser };
