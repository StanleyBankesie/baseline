import axios from "axios";

const portalApi = axios.create({
  baseURL: "/api/portal",
  withCredentials: true,
  timeout: 30000,
});

portalApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("portal_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

portalApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (window.location.pathname.startsWith("/portal") && window.location.pathname !== "/portal/login") {
        localStorage.removeItem("portal_token");
        localStorage.removeItem("portal_user");
        localStorage.removeItem("portal_employee");
        window.location.href = "/portal/login";
      }
    }
    return Promise.reject(error);
  }
);

export default portalApi;