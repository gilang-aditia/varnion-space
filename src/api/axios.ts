/**
 * Instance axios untuk action Redux per modul (`src/features/<modul>/redux`).
 *
 *   const response = await api.get<ApiXxxResponse>("/path", { params });
 *   return response.data; // { status, success_code, data, meta? } — snake_case, apa adanya
 *
 * - `baseURL` dari `VITE_API_BASE_URL`
 * - Request interceptor: sisipkan `Authorization: Bearer <access token>`;
 *   bila access token sudah (hampir) kedaluwarsa → refresh dulu.
 * - Response interceptor: 401 → refresh token sekali lalu ulangi request.
 *   Endpoint auth memakai `{ skipRefresh: true }`.
 * - Error → `AxiosError<ApiErrorResponse>`; pesan backend ada di `err.response?.data?.error_message`.
 */
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { isTokenExpired } from "@/lib/jwt";
import { refreshAccessToken } from "./http/client";
import { getAuthToken } from "./token";

declare module "axios" {
  interface AxiosRequestConfig {
    /** true → jangan coba refresh token (dipakai endpoint auth: login, logout, refresh). */
    skipRefresh?: boolean;
    /** Internal: request ini sudah diulang setelah refresh. */
    _retry?: boolean;
  }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(BASE_URL.includes("devtunnels.ms") ? { "X-Tunnel-Skip-Anti-Phishing-Page": "true" } : {}),
  },
});

// Request: token + refresh proaktif
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (!config.skipRefresh && !config._retry && getAuthToken() && isTokenExpired(getAuthToken())) {
    await refreshAccessToken();
  }
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response: 401 → refresh sekali → ulangi request
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config;
    if (error.response?.status === 401 && config && !config.skipRefresh && !config._retry && getAuthToken()) {
      config._retry = true;
      if (await refreshAccessToken()) return api(config);
    }
    return Promise.reject(error);
  },
);

export default api;
