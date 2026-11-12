import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import api from "@/api/axios";
import type { ApiErrorResponse } from "@/types/api";
import { mapUser } from "@/lib/user-mapper";
import { usersActions } from "@/store/slices/usersSlice";
import { endSession, notify } from "@/store/thunks/helpers";
import type { ApiMeResponse, FetchMeParams } from "./meType";

/**
 * GET /auth/me → profil + roles/permissions user aktif.
 * 401 → sesi berakhir, kembali ke halaman login.
 */
export const fetchMe = createAsyncThunk<ApiMeResponse, FetchMeParams | void, { rejectValue: string }>(
  "me/fetchMe",
  async (params, { dispatch, rejectWithValue }) => {
    const silent = !!params?.silent;
    try {
      const response = await api.get<ApiMeResponse>("/auth/me");
      // profil juga masuk cache `users` agar nama/avatar di seluruh UI ikut terbarui
      dispatch(usersActions.upserted(mapUser(response.data.data)));
      if (!silent) notify(dispatch, "Profil diperbarui", "success", response.data.data.display_name);
      return response.data;
    } catch (error: unknown) {
      const err = error as AxiosError<ApiErrorResponse>;
      const message = err.response?.data?.error_message || "Gagal memuat profil";
      if (err.response?.status === 401) endSession(dispatch, "Silakan masuk kembali.");
      else if (!silent) notify(dispatch, "Gagal memuat profil", "error", message);
      return rejectWithValue(message);
    }
  },
);
