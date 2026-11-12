import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import api from "@/api/axios";
import type { ApiErrorResponse } from "@/types/api";
import type { RootState } from "@/store";
import { endSession, notify } from "@/store/thunks/helpers";
import { fetchUsers, userListParams } from "./userAction";
import type {
  ApiRestoreUserResponse,
  RestoreUserParams,
  RestoreUserResult,
} from "./restoreUserType";

/**
 * PATCH /users/{id} — pulihkan user yang di-soft delete.
 * Setelah berhasil, daftar pengguna dimuat ulang dengan filter & halaman aktif.
 */
export const restoreUser = createAsyncThunk<
  RestoreUserResult,
  RestoreUserParams,
  { state: RootState; rejectValue: string }
>(
  "restoreUser/restoreUser",
  async ({ id }, { dispatch, getState, rejectWithValue }) => {
    try {
      const response = await api.patch<ApiRestoreUserResponse>(
        `/users/${encodeURIComponent(id)}`,
      );
      notify(dispatch, "Pengguna dipulihkan");

      void dispatch(fetchUsers(userListParams(getState())));

      return { id, response: response.data };
    } catch (error: unknown) {
      const err = error as AxiosError<ApiErrorResponse>;
      const message =
        err.response?.data?.error_message || "Gagal memulihkan pengguna";
      if (err.response?.status === 401) endSession(dispatch, message);
      else notify(dispatch, "Gagal memulihkan pengguna", "error", message);
      return rejectWithValue(message);
    }
  },
  {
    // cegah klik ganda saat request masih berjalan
    condition: (_, { getState }) => !getState().restoreUser.loading,
  },
);
