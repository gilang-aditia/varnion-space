import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import api from "@/api/axios";
import type { ApiErrorResponse } from "@/types/api";
import type { RootState } from "@/store";
import { endSession, notify } from "@/store/thunks/helpers";
import { refreshWorkspaceList } from "./workspaceAction";
import type {
  ApiRestoreWorkspaceResponse,
  RestoreWorkspaceParams,
  RestoreWorkspaceResult,
} from "./restoreWorkspaceType";

/**
 * PATCH /workspaces/{id} — pulihkan workspace yang di-soft delete
 * (backend mengosongkan `deleted_at`). Setelah berhasil, daftar dimuat ulang.
 */
export const restoreWorkspace = createAsyncThunk<
  RestoreWorkspaceResult,
  RestoreWorkspaceParams,
  { state: RootState; rejectValue: string }
>(
  "restoreWorkspace/restoreWorkspace",
  async ({ id }, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.patch<ApiRestoreWorkspaceResponse>(
        `/workspaces/${encodeURIComponent(id)}`,
      );
      notify(dispatch, "Workspace dipulihkan");

      dispatch(refreshWorkspaceList());

      return { id, response: response.data };
    } catch (error: unknown) {
      const err = error as AxiosError<ApiErrorResponse>;
      const message =
        err.response?.data?.error_message || "Gagal memulihkan workspace";
      if (err.response?.status === 401) endSession(dispatch, message);
      else notify(dispatch, "Gagal memulihkan workspace", "error", message);
      return rejectWithValue(message);
    }
  },
  {
    // cegah klik ganda saat request masih berjalan
    condition: (_, { getState }) => !getState().restoreWorkspace.loading,
  },
);
