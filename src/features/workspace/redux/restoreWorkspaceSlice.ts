import { createSlice } from "@reduxjs/toolkit";
import { loggedOut } from "@/features/login/redux/loginAction";
import { restoreWorkspace } from "./restoreWorkspaceAction";
import type { RestoreWorkspaceState } from "./restoreWorkspaceType";

const initialState: RestoreWorkspaceState = {
  loading: false,
  error: null,
  pendingId: null,
  lastRestoredId: null,
};

const restoreWorkspaceSlice = createSlice({
  name: "restoreWorkspace",
  initialState,
  reducers: {
    resetRestoreWorkspaceState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Restore Workspace
      .addCase(restoreWorkspace.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.pendingId = action.meta.arg.id;
      })
      .addCase(restoreWorkspace.fulfilled, (state, action) => {
        state.loading = false;
        state.pendingId = null;
        state.lastRestoredId = action.payload.id;
      })
      .addCase(restoreWorkspace.rejected, (state, action) => {
        state.loading = false;
        state.pendingId = null;
        state.error = action.payload || "Gagal memulihkan workspace";
      })

      // Logout / sesi berakhir
      .addCase(loggedOut, () => initialState);
  },
});

export const { resetRestoreWorkspaceState } = restoreWorkspaceSlice.actions;

export default restoreWorkspaceSlice.reducer;
