import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import api from "@/api/axios";
import type { ApiErrorResponse } from "@/types/api";
import type { RootState } from "@/store";
import { endSession, notify } from "@/store/thunks/helpers";
import type {
  ApiUserDetailResponse,
  FetchUserDetailParams,
} from "./userDetailType";

/** GET /users/{id} — detail profil user termasuk peran workspace & permission. */
export const fetchUserDetail = createAsyncThunk<
  ApiUserDetailResponse,
  FetchUserDetailParams,
  { state: RootState; rejectValue: string }
>(
  "userDetail/fetchUserDetail",
  async ({ id }, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.get<ApiUserDetailResponse>(
        `/users/${encodeURIComponent(id)}`,
      );
      return response.data;
    } catch (error: unknown) {
      const err = error as AxiosError<ApiErrorResponse>;
      const message =
        err.response?.status === 404
          ? "Pengguna tidak ditemukan"
          : err.response?.data?.error_message || "Gagal memuat detail pengguna";
      if (err.response?.status === 401) endSession(dispatch, message);
      else notify(dispatch, "Gagal memuat detail pengguna", "error", message);
      return rejectWithValue(message);
    }
  },
  {
    // user yang sama masih dimuat (mis. effect StrictMode / klik ganda) → lewati
    condition: ({ id }, { getState }) => {
      const { loading, pendingId } = getState().userDetail;
      return !(loading && pendingId === id);
    },
  },
);
