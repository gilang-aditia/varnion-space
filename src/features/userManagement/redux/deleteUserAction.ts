import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import api from "@/api/axios";
import type { ApiErrorResponse } from "@/types/api";
import type { RootState } from "@/store";
import { endSession, notify } from "@/store/thunks/helpers";
import { fetchUsers, userListParams } from "./userAction";
import type {
  ApiDeleteUserResponse,
  DeleteUserParams,
  DeleteUserResult,
} from "./deleteUserType";

/**
 * DELETE /users/{id}?hard=true|false
 * - soft delete (default) → bisa dipulihkan dengan `restoreUser`
 * - hard delete → permanen
 * Setelah berhasil, daftar pengguna dimuat ulang dengan filter & halaman aktif.
 */
export const deleteUser = createAsyncThunk<
  DeleteUserResult,
  DeleteUserParams,
  { state: RootState; rejectValue: string }
>(
  "deleteUser/deleteUser",
  async ({ id, hard = false }, { dispatch, getState, rejectWithValue }) => {
    const fallback = hard
      ? "Gagal menghapus pengguna secara permanen"
      : "Gagal menghapus pengguna";
    try {
      const response = await api.delete<ApiDeleteUserResponse>(
        `/users/${encodeURIComponent(id)}`,
        {
          params: { hard },
        },
      );

      notify(
        dispatch,
        hard ? "Pengguna dihapus permanen" : "Pengguna dihapus",
        hard ? "info" : "success",
        hard
          ? "Data pengguna tidak dapat dipulihkan."
          : "Pengguna dipindahkan ke daftar Terhapus dan masih dapat dipulihkan.",
      );

      void dispatch(fetchUsers(userListParams(getState())));

      return { id, hard, response: response.data };
    } catch (error: unknown) {
      const err = error as AxiosError<ApiErrorResponse>;
      const message = err.response?.data?.error_message || fallback;
      if (err.response?.status === 401) endSession(dispatch, message);
      else notify(dispatch, fallback, "error", message);
      return rejectWithValue(message);
    }
  },
  {
    // cegah klik ganda saat request masih berjalan
    condition: (_, { getState }) => !getState().deleteUser.loading,
  },
);
