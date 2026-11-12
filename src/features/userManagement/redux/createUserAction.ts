import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import api from "@/api/axios";
import type { ApiErrorResponse } from "@/types/api";
import type { RootState } from "@/store";
import { endSession, notify } from "@/store/thunks/helpers";
import { fetchUsers, userListParams } from "./userAction";
import type {
  ApiCreateUserResponse,
  CreateUserPayload,
} from "./createUserType";

const DEFAULT_WORKSPACE_ID =
  import.meta.env.VITE_WORKSPACE_ID ?? "00000000-0000-0000-0000-000000000001";

/** Status error yang berasal dari input form → cukup ditampilkan di form, tanpa toast. */
const FORM_ERROR_STATUS = [400, 409, 422];

/**
 * POST /users — admin membuat user baru (opsional sekaligus assign peran workspace).
 * Setelah berhasil, daftar pengguna dimuat ulang dengan filter & halaman yang sedang aktif.
 * Pemanggil dapat `await dispatch(createUser(payload)).unwrap()`.
 */
export const createUser = createAsyncThunk<
  ApiCreateUserResponse,
  CreateUserPayload,
  { state: RootState; rejectValue: string }
>(
  "createUser/createUser",
  async (payload, { dispatch, getState, rejectWithValue }) => {
    try {
      const body: CreateUserPayload = {
        display_name: payload.display_name.trim(),
        email: payload.email.trim(),
        password: payload.password,
        ...(payload.role_code
          ? {
              role_code: payload.role_code,
              workspace_id: payload.workspace_id || DEFAULT_WORKSPACE_ID,
            }
          : {}),
      };
      const response = await api.post<ApiCreateUserResponse>("/users", body);

      notify(
        dispatch,
        "Pengguna ditambahkan",
        "success",
        response.data.data.display_name,
      );

      void dispatch(fetchUsers(userListParams(getState())));

      return response.data;
    } catch (error: unknown) {
      const err = error as AxiosError<ApiErrorResponse>;
      const message =
        err.response?.data?.error_message || "Gagal menambah pengguna";
      const status = err.response?.status;
      if (status === 401) endSession(dispatch, message);
      else if (!status || !FORM_ERROR_STATUS.includes(status))
        notify(dispatch, "Gagal menambah pengguna", "error", message);
      return rejectWithValue(message);
    }
  },
  {
    // cegah submit ganda saat request masih berjalan
    condition: (_, { getState }) => !getState().createUser.loading,
  },
);
