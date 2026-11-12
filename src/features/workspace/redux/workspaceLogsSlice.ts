import { createSlice } from "@reduxjs/toolkit";
import { loggedOut } from "@/features/login/redux/loginAction";
import { fetchWorkspaceLogs } from "./workspaceLogsAction";
import type { WorkspaceLogsState } from "./workspaceLogsType";

const initialState: WorkspaceLogsState = {
  logs: [],
  workspaceId: null,
  loading: false,
  error: null,
  lastRequestId: null,
};

const workspaceLogsSlice = createSlice({
  name: "workspaceLogs",
  initialState,
  reducers: {
    resetWorkspaceLogsState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch Workspace Logs
      .addCase(fetchWorkspaceLogs.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.lastRequestId = action.meta.requestId;
        // workspace lain → jangan tampilkan log workspace sebelumnya
        if (state.workspaceId !== action.meta.arg.id) {
          state.logs = [];
          state.workspaceId = action.meta.arg.id;
        }
      })
      .addCase(fetchWorkspaceLogs.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.lastRequestId) return; // respons usang
        state.loading = false;
        // terbaru di atas
        state.logs = [...(action.payload.data ?? [])].sort(
          (a, b) => Date.parse(b._time) - Date.parse(a._time),
        );
      })
      .addCase(fetchWorkspaceLogs.rejected, (state, action) => {
        if (action.meta.requestId !== state.lastRequestId) return;
        state.loading = false;
        state.error = action.payload || "Gagal memuat aktivitas workspace";
      })

      // Logout / sesi berakhir
      .addCase(loggedOut, () => initialState);
  },
});

export const { resetWorkspaceLogsState } = workspaceLogsSlice.actions;

export default workspaceLogsSlice.reducer;
