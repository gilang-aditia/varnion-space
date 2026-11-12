import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import api from "@/api/axios";
import type { ApiErrorResponse } from "@/types/api";
import type { RootState } from "@/store";
import { endSession, notify } from "@/store/thunks/helpers";
import { refreshWorkspaceList } from "./workspaceAction";
import type {
  ApiDeleteWorkspaceResponse,
  DeleteWorkspaceParams,
  DeleteWorkspaceResult,
} from "./deleteWorkspaceType";

/**
 * DELETE /workspaces/{id}?hard=true|false
 * - soft delete (default) → bisa dipulihkan dengan `restoreWorkspace`
 * - hard delete → permanen
 * Setelah berhasil, daftar workspace dimuat ulang dengan filter & halaman aktif.
 */
export const deleteWorkspace = createAsyncThunk<
  DeleteWorkspaceResult,
  DeleteWorkspaceParams,
  { state: RootState; rejectValue: string }
>(
  "deleteWorkspace/deleteWorkspace",
  async ({ id, hard = false }, { dispatch, rejectWithValue }) => {
    const fallback = hard
      ? "Gagal menghapus workspace secara permanen"
      : "Gagal menghapus workspace";
    try {
      const response = await api.delete<ApiDeleteWorkspaceResponse>(
        `/workspaces/${encodeURIComponent(id)}`,
        { params: { hard } },
      );

      notify(
        dispatch,
        hard ? "Workspace dihapus permanen" : "Workspace dihapus",
        hard ? "info" : "success",
        hard
          ? "Workspace beserta isinya tidak dapat dipulihkan."
          : "Workspace dipindahkan ke daftar Terhapus dan masih dapat dipulihkan.",
      );

      dispatch(refreshWorkspaceList());

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
    condition: (_, { getState }) => !getState().deleteWorkspace.loading,
  },
);
