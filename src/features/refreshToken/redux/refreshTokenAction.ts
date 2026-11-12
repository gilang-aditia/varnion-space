import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import api from "@/api/axios";
import { getAuthTokens, setAuthTokens } from "@/api";
import type { ApiErrorResponse } from "@/types/api";
import { endSession, notify } from "@/store/thunks/helpers";
import type { ApiRefreshTokenResponse, RefreshTokenPayload } from "./refreshTokenType";

/**
 * POST /auth/refresh `{ refresh_token }` → simpan access token baru.
 * Bila backend juga mengirim `refresh_token` baru (yang lama sudah kedaluwarsa), ikut disimpan.
 *
 * Dipanggil otomatis oleh http client (lihat `setRefreshHandler` di `src/store/index.ts`):
 * - sebelum request, bila access token sudah (hampir) kedaluwarsa;
 * - saat server membalas 401 → refresh lalu request diulang sekali.
 *
 * Refresh token tidak ada / ditolak (400/401) → sesi berakhir, kembali ke halaman login.
 */
export const refreshAccessToken = createAsyncThunk<ApiRefreshTokenResponse, void, { rejectValue: string }>(
  "refreshToken/refreshAccessToken",
  async (_, { dispatch, rejectWithValue }) => {
    const current = getAuthTokens();
    if (!current?.refreshToken) {
      endSession(dispatch, "Silakan masuk kembali.");
      return rejectWithValue("Refresh token tidak tersedia.");
    }

    try {
      const payload: RefreshTokenPayload = { refresh_token: current.refreshToken };
      const response = await api.post<ApiRefreshTokenResponse>("/auth/refresh", payload, { skipRefresh: true });
      const { access_token, refresh_token } = response.data.data;
      setAuthTokens({
        accessToken: access_token,
        refreshToken: refresh_token ?? current.refreshToken,
        remember: current.remember,
      });
      return response.data;
    } catch (error: unknown) {
      const err = error as AxiosError<ApiErrorResponse>;
      const message = err.response?.data?.error_message || "Gagal memperbarui sesi";
      if (err.response?.status === 400 || err.response?.status === 401) {
        // mis. "invalid refresh token" → tidak bisa diperbarui lagi
        endSession(dispatch, `Silakan masuk kembali (${message}).`);
      } else {
        notify(dispatch, "Gagal memperbarui sesi", "error", message);
      }
      return rejectWithValue(message);
    }
  },
);
