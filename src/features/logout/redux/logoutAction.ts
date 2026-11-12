import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import api from "@/api/axios";
import type { ApiErrorResponse } from "@/types/api";
import { endSession, notify } from "@/store/thunks/helpers";
import type { ApiLogoutResponse } from "./logoutType";

/**
 * POST /auth/logout → token dicabut di server, lalu sesi di browser dihapus:
 * access token, refresh token, flag "ingat saya" (cookie/localStorage),
 * metadata sesi, dan seluruh state Redux (`loggedOut`).
 *
 * Bila request gagal (jaringan, server error, token sudah kedaluwarsa), sesi di
 * browser TETAP dihapus agar user benar-benar keluar dari perangkat ini.
 */
export const logout = createAsyncThunk<ApiLogoutResponse, void, { rejectValue: string }>(
  "logout/logout",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.post<ApiLogoutResponse>("/auth/logout", undefined, { skipRefresh: true });
      endSession(dispatch);
      notify(dispatch, "Berhasil keluar", "success", response.data.data);
      return response.data;
    } catch (error: unknown) {
      const err = error as AxiosError<ApiErrorResponse>;
      const message = err.response?.data?.error_message || "Gagal keluar";
      endSession(dispatch);
      if (err.response?.status === 401) {
        // token sudah tidak berlaku di server → sesi memang sudah berakhir
        notify(dispatch, "Anda sudah keluar", "info", message);
      } else {
        notify(dispatch, "Gagal keluar dari server", "error", `${message} — sesi di perangkat ini tetap dihapus.`);
      }
      return rejectWithValue(message);
    }
  },
);
