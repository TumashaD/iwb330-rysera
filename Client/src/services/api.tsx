import axios from "axios";

// Create an instance of axios
const api = axios.create({
  baseURL: import.meta.env.VITE_MIDDLEWARE_BASE_URL, // Your backend URL
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Optionally, you can add request interceptors for auth tokens, etc.
api.interceptors.request.use(
  (config) => {
    // Add x-api-key header
    const accessToken = import.meta.env.VITE_MIDDLEWARE_ACCESS_TOKEN; // Assuming the API key is stored in environment variables
    if (accessToken) {
      config.headers["Authorization"] = `Bearer ${accessToken}`;
    }
    // Add this line to log the headers
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
// Add a response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
