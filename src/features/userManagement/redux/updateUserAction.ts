import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import api from "@/api/axios";
import type { ApiErrorResponse } from "@/types/api";
import type { RootState } from "@/store";
import { endSession, notify } from "@/store/thunks/helpers";
import type {
  ApiUpdateUserResponse,
  UpdateUserParams,
  UpdateUserPayload,
} from "./updateUserType";

/** Status error yang berasal dari input form → cukup ditampilkan di form, tanpa toast. */
const FORM_ERROR_STATUS = [400, 409, 422];

/**
 * PUT /users/{id} — admin memperbarui nama tampilan, kata sandi, dan/atau status user.
 * Field kosong / tidak diisi tidak dikirim. Hasilnya otomatis disinkronkan ke
 * `userList` dan `userDetail` (lihat extraReducers masing-masing slice).
 * Pemanggil dapat `await dispatch(updateUser({ id, payload })).unwrap()`.
 */
export const updateUser = createAsyncThunk<
  ApiUpdateUserResponse,
  UpdateUserParams,
  { state: RootState; rejectValue: string }
>(
  "updateUser/updateUser",
  async ({ id, payload }, { dispatch, rejectWithValue }) => {
    try {
      const body: UpdateUserPayload = {
        ...(payload.display_name?.trim()
          ? { display_name: payload.display_name.trim() }
          : {}),
        ...(payload.password ? { password: payload.password } : {}),
        ...(payload.status ? { status: payload.status } : {}),
      };
      const response = await api.put<ApiUpdateUserResponse>(
        `/users/${encodeURIComponent(id)}`,
        body,
      );
      notify(
        dispatch,
        "Pengguna diperbarui",
        "success",
        response.data.data.display_name,
      );
      return response.data;
    } catch (error: unknown) {
      const err = error as AxiosError<ApiErrorResponse>;
      const message =
        err.response?.data?.error_message || "Gagal memperbarui pengguna";
      const status = err.response?.status;
      if (status === 401) endSession(dispatch, message);
      else if (!status || !FORM_ERROR_STATUS.includes(status))
        notify(dispatch, "Gagal memperbarui pengguna", "error", message);
      return rejectWithValue(message);
    }
  },
  {
    // cegah submit ganda saat request masih berjalan
    condition: (_, { getState }) => !getState().updateUser.loading,
  },
);
