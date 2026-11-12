import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import api from "@/api/axios";
import type { ApiErrorResponse } from "@/types/api";
import type { RootState } from "@/store";
import { endSession, notify } from "@/store/thunks/helpers";
import { refreshWorkspaceList } from "./workspaceAction";
import type {
  ApiCreateWorkspaceResponse,
  CreateWorkspacePayload,
} from "./createWorkspaceType";

/** Status error yang berasal dari input form → cukup ditampilkan di form, tanpa toast. */
const FORM_ERROR_STATUS = [400, 409, 422];

/**
 * POST /workspaces — buat workspace baru.
 * Setelah berhasil, daftar workspace di beranda dimuat ulang dengan filter & halaman aktif.
 * Pemanggil dapat `await dispatch(createWorkspace(payload)).unwrap()`.
 */
export const createWorkspace = createAsyncThunk<
  ApiCreateWorkspaceResponse,
  CreateWorkspacePayload,
  { state: RootState; rejectValue: string }
>(
  "createWorkspace/createWorkspace",
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const body: CreateWorkspacePayload = {
        name: payload.name.trim(),
        description: payload.description.trim(),
      };
      const response = await api.post<ApiCreateWorkspaceResponse>(
        "/workspaces",
        body,
      );

      notify(
        dispatch,
        "Workspace dibuat",
        "success",
        response.data.data?.name ?? body.name,
      );

      dispatch(refreshWorkspaceList());

      return response.data;
    } catch (error: unknown) {
      const err = error as AxiosError<ApiErrorResponse>;
      const message =
        err.response?.data?.error_message || "Gagal membuat workspace";
      const status = err.response?.status;
      if (status === 401) endSession(dispatch, message);
      else if (!status || !FORM_ERROR_STATUS.includes(status))
        notify(dispatch, "Gagal membuat workspace", "error", message);
      return rejectWithValue(message);
    }
  },
  {
    // cegah submit ganda saat request masih berjalan
    condition: (_, { getState }) => !getState().createWorkspace.loading,
  },
);
