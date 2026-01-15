import axios from "axios";

// ✅ Uses Cloudflare/Vercel env in production, falls back to localhost in dev
const baseURL =
  import.meta.env.VITE_API_URL?.trim() || "http://localhost:5001/api";

const axiosInstance = axios.create({
  baseURL,
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;