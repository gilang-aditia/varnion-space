import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import api from "@/api/axios";
import type { ApiErrorResponse } from "@/types/api";
import type { RootState } from "@/store";
import { endSession, notify } from "@/store/thunks/helpers";
import { refreshWorkspaceList } from "./workspaceAction";
import type {
  ApiUpdateWorkspaceResponse,
  UpdateWorkspaceParams,
  UpdateWorkspacePayload,
  UpdateWorkspaceResult,
} from "./updateWorkspaceType";

/** Status error yang berasal dari input form → cukup ditampilkan di form, tanpa toast. */
const FORM_ERROR_STATUS = [400, 409, 422];

/**
 * PUT /workspaces/{id} — perbarui nama, deskripsi, dan status workspace.
 * Hasilnya disinkronkan ke daftar beranda & detail (lihat extraReducers), lalu
 * daftar dimuat ulang agar tetap sesuai filter yang aktif (mis. status berubah).
 */
export const updateWorkspace = createAsyncThunk<
  UpdateWorkspaceResult,
  UpdateWorkspaceParams,
  { state: RootState; rejectValue: string }
>(
  "updateWorkspace/updateWorkspace",
  async ({ id, payload }, { dispatch, rejectWithValue }) => {
    try {
      const body: UpdateWorkspacePayload = {
        name: payload.name.trim(),
        description: payload.description.trim(),
        status: payload.status,
      };
      const response = await api.put<ApiUpdateWorkspaceResponse>(
        `/workspaces/${encodeURIComponent(id)}`,
        body,
      );

      notify(dispatch, "Workspace diperbarui", "success", body.name);

      dispatch(refreshWorkspaceList());

      return { id, payload: body, response: response.data };
    } catch (error: unknown) {
      const err = error as AxiosError<ApiErrorResponse>;
      const message =
        err.response?.data?.error_message || "Gagal memperbarui workspace";
      const status = err.response?.status;
      if (status === 401) endSession(dispatch, message);
      else if (!status || !FORM_ERROR_STATUS.includes(status))
        notify(dispatch, "Gagal memperbarui workspace", "error", message);
      return rejectWithValue(message);
    }
  },
  {
    // cegah submit ganda saat request masih berjalan
    condition: (_, { getState }) => !getState().updateWorkspace.loading,
  },
);
