import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import api from "@/api/axios";
import type { ApiErrorResponse } from "@/types/api";
import type { RootState } from "@/store";
import { endSession, notify } from "@/store/thunks/helpers";
import type {
  ApiWorkspaceDetailResponse,
  FetchWorkspaceDetailParams,
} from "./workspaceDetailType";

/** GET /workspaces/{id} — informasi workspace berdasarkan ID. */
export const fetchWorkspaceDetail = createAsyncThunk<
  ApiWorkspaceDetailResponse,
  FetchWorkspaceDetailParams,
  { state: RootState; rejectValue: string }
>(
  "workspaceDetail/fetchWorkspaceDetail",
  async ({ id }, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.get<ApiWorkspaceDetailResponse>(
        `/workspaces/${encodeURIComponent(id)}`,
      );
      return response.data;
    } catch (error: unknown) {
      const err = error as AxiosError<ApiErrorResponse>;
      const message =
        err.response?.status === 404
          ? "Workspace tidak ditemukan"
          : err.response?.data?.error_message ||
            "Gagal memuat detail workspace";
      if (err.response?.status === 401) endSession(dispatch, message);
      else notify(dispatch, "Gagal memuat detail workspace", "error", message);
      return rejectWithValue(message);
    }
  },
  {
    // workspace yang sama masih dimuat (mis. effect StrictMode / klik ganda) → lewati
    condition: ({ id }, { getState }) => {
      const { loading, pendingId } = getState().workspaceDetail;
      return !(loading && pendingId === id);
    },
  },
);
