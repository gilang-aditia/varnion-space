import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import api from "@/api/axios";
import type { ApiErrorResponse } from "@/types/api";
import type { RootState } from "@/store";
import { endSession, notify } from "@/store/thunks/helpers";
import type { ApiUserListResponse, FetchUsersParams } from "./userType";

/** `"all"` / string kosong → tidak dikirim ke backend. */
const filterValue = (value?: string) =>
  value && value !== "all" ? value : undefined;

/** Parameter daftar pengguna yang sedang aktif (halaman, filter, tampilan terhapus). */
export const userListParams = (state: RootState): FetchUsersParams => {
  const { currentPage, limit, search, status, role, deleted } = state.userList;
  return { page: currentPage, per_page: limit, search, status, role, deleted };
};

/** GET /users?page=&per_page=&search=&status=&role=&deleted= */
export const fetchUsers = createAsyncThunk<
  ApiUserListResponse,
  FetchUsersParams,
  { state: RootState; rejectValue: string }
>(
  "users/fetchUsers",
  async (params, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.get<ApiUserListResponse>("/users", {
        params: {
          page: params.page,
          per_page: params.per_page,
          search: params.search?.trim() || undefined,
          status: filterValue(params.status),
          role: filterValue(params.role),
          // default backend false → hanya dikirim saat melihat daftar terhapus
          deleted: params.deleted || undefined,
        },
      });
      return response.data;
    } catch (error: unknown) {
      const err = error as AxiosError<ApiErrorResponse>;
      const message =
        err.response?.data?.error_message || "Gagal memuat daftar pengguna";
      if (err.response?.status === 401) endSession(dispatch, message);
      else notify(dispatch, "Gagal memuat daftar pengguna", "error", message);
      return rejectWithValue(message);
    }
  },
  {
    // request dengan parameter yang sama masih berjalan (mis. effect StrictMode / klik ganda) → lewati
    condition: (params, { getState }) => {
      const { loading, pendingParamsKey } = getState().userList;
      return !(loading && pendingParamsKey === JSON.stringify(params));
    },
  },
);
