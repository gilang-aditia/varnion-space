import { createSlice } from "@reduxjs/toolkit";
import { loggedOut } from "@/features/login/redux/loginAction";
import { updateWorkspace } from "./updateWorkspaceAction";
import type { UpdateWorkspaceState } from "./updateWorkspaceType";

const initialState: UpdateWorkspaceState = {
  loading: false,
  error: null,
  updatedWorkspace: null,
};

const updateWorkspaceSlice = createSlice({
  name: "updateWorkspace",
  initialState,
  reducers: {
    clearUpdateWorkspaceError: (state) => {
      state.error = null;
    },
    resetUpdateWorkspaceState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Update Workspace
      .addCase(updateWorkspace.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateWorkspace.fulfilled, (state, action) => {
        state.loading = false;
        state.updatedWorkspace = action.payload.response.data ?? null;
      })
      .addCase(updateWorkspace.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Gagal memperbarui workspace";
      })

      // Logout / sesi berakhir
      .addCase(loggedOut, () => initialState);
  },
});

export const { clearUpdateWorkspaceError, resetUpdateWorkspaceState } =
  updateWorkspaceSlice.actions;

export default updateWorkspaceSlice.reducer;
