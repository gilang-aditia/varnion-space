import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import api from "@/api/axios";
import type { ApiErrorResponse } from "@/types/api";
import type { RootState } from "@/store";
import { endSession, notify } from "@/store/thunks/helpers";
import type {
  ApiWorkspaceLogsResponse,
  FetchWorkspaceLogsParams,
} from "./workspaceLogsType";

/** Batas maksimum log dari backend. */
const MAX_LIMIT = 1000;

/** GET /workspaces/{id}/logs?limit= — log aktivitas workspace. */
export const fetchWorkspaceLogs = createAsyncThunk<
  ApiWorkspaceLogsResponse,
  FetchWorkspaceLogsParams,
  { state: RootState; rejectValue: string }
>(
  "workspaceLogs/fetchWorkspaceLogs",
  async ({ id, limit }, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.get<ApiWorkspaceLogsResponse>(
        `/workspaces/${encodeURIComponent(id)}/logs`,
        {
          params: {
            limit: limit ? Math.min(Math.max(1, limit), MAX_LIMIT) : undefined,
          },
        },
      );
      return response.data;
    } catch (error: unknown) {
      const err = error as AxiosError<ApiErrorResponse>;
      const message =
        err.response?.data?.error_message || "Gagal memuat aktivitas workspace";
      if (err.response?.status === 401) endSession(dispatch, message);
      else
        notify(dispatch, "Gagal memuat aktivitas workspace", "error", message);
      return rejectWithValue(message);
    }
  },
);
