import { createSlice } from "@reduxjs/toolkit";
import { loggedOut } from "@/features/login/redux/loginAction";
import { createWorkspace } from "./createWorkspaceAction";
import type { CreateWorkspaceState } from "./createWorkspaceType";

const initialState: CreateWorkspaceState = {
  loading: false,
  error: null,
  createdWorkspace: null,
};

const createWorkspaceSlice = createSlice({
  name: "createWorkspace",
  initialState,
  reducers: {
    clearCreateWorkspaceError: (state) => {
      state.error = null;
    },
    resetCreateWorkspaceState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Create Workspace
      .addCase(createWorkspace.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createWorkspace.fulfilled, (state, action) => {
        state.loading = false;
        state.createdWorkspace = action.payload.data;
      })
      .addCase(createWorkspace.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Gagal membuat workspace";
      })

      // Logout / sesi berakhir
      .addCase(loggedOut, () => initialState);
  },
});

export const { clearCreateWorkspaceError, resetCreateWorkspaceState } =
  createWorkspaceSlice.actions;

export default createWorkspaceSlice.reducer;
