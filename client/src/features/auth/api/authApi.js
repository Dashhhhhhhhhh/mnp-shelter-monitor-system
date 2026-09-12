import apiClient from "../../../api/apiClient";

async function login(credentials) {
  const response = await apiClient.post("/auth/login", credentials);

  return response.data;
}

async function getMe() {
  const response = await apiClient.get("/auth/me");

  return response.data;
}

async function logout() {
  const response = await apiClient.post("/auth/logout");

  return response.data;
}

export { login, getMe, logout };
