import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true,
});

let unauthorizedHandler = null;

function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

apiClient.interceptors.response.use(
  (response) => response,

  (error) => {
    if (error.response?.status === 401) {
      unauthorizedHandler?.();
    }

    return Promise.reject(error);
  },
);

export { setUnauthorizedHandler };

export default apiClient;
