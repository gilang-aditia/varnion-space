import { createSlice } from "@reduxjs/toolkit";
import { loggedOut } from "@/features/login/redux/loginAction";
import { fetchWorkspaceDetail } from "./workspaceDetailAction";
import { updateWorkspace } from "./updateWorkspaceAction";
import { deleteWorkspace } from "./deleteWorkspaceAction";
import { restoreWorkspace } from "./restoreWorkspaceAction";
import type { WorkspaceDetailState } from "./workspaceDetailType";

const initialState: WorkspaceDetailState = {
  workspace: null,
  loading: false,
  error: null,
  lastRequestId: null,
  pendingId: null,
};

const workspaceDetailSlice = createSlice({
  name: "workspaceDetail",
  initialState,
  reducers: {
    resetWorkspaceDetailState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch Workspace Detail
      .addCase(fetchWorkspaceDetail.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.lastRequestId = action.meta.requestId;
        state.pendingId = action.meta.arg.id;
        // workspace lain → jangan tampilkan data workspace sebelumnya
        if (state.workspace?.id !== action.meta.arg.id) state.workspace = null;
      })
      .addCase(fetchWorkspaceDetail.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.lastRequestId) return; // respons usang
        state.loading = false;
        state.pendingId = null;
        state.workspace = action.payload.data;
      })
      .addCase(fetchWorkspaceDetail.rejected, (state, action) => {
        if (action.meta.requestId !== state.lastRequestId) return;
        state.loading = false;
        state.pendingId = null;
        state.error = action.payload || "Gagal memuat detail workspace";
      })

      // Hasil edit → perbarui seketika (daftar juga dimuat ulang oleh thunk)
      .addCase(updateWorkspace.fulfilled, (state, action) => {
        const { id, payload, response } = action.payload;
        const changes = { ...payload, ...(response.data ?? {}) };
        if (state.workspace?.id === id) Object.assign(state.workspace, changes);
      })

      // Soft delete → tandai terhapus; hard delete → hilang
      .addCase(deleteWorkspace.fulfilled, (state, action) => {
        if (state.workspace?.id !== action.payload.id) return;
        if (action.payload.hard) state.workspace = null;
        else state.workspace.deleted_at = new Date().toISOString();
      })

      // Restore → hapus tanda terhapus
      .addCase(restoreWorkspace.fulfilled, (state, action) => {
        if (state.workspace?.id === action.payload.id)
          state.workspace.deleted_at = null;
      })

      // Logout / sesi berakhir
      .addCase(loggedOut, () => initialState);
  },
});

export const { resetWorkspaceDetailState } = workspaceDetailSlice.actions;

export default workspaceDetailSlice.reducer;
