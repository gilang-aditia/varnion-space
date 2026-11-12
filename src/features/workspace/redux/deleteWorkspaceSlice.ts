import { createSlice } from "@reduxjs/toolkit";
import { loggedOut } from "@/features/login/redux/loginAction";
import { deleteWorkspace } from "./deleteWorkspaceAction";
import type { DeleteWorkspaceState } from "./deleteWorkspaceType";

const initialState: DeleteWorkspaceState = {
  loading: false,
  error: null,
  lastDeleted: null,
};

const deleteWorkspaceSlice = createSlice({
  name: "deleteWorkspace",
  initialState,
  reducers: {
    resetDeleteWorkspaceState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Delete Workspace
      .addCase(deleteWorkspace.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteWorkspace.fulfilled, (state, action) => {
        state.loading = false;
        state.lastDeleted = {
          id: action.payload.id,
          hard: action.payload.hard,
        };
      })
      .addCase(deleteWorkspace.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Gagal menghapus workspace";
      })

      // Logout / sesi berakhir
      .addCase(loggedOut, () => initialState);
  },
});

export const { resetDeleteWorkspaceState } = deleteWorkspaceSlice.actions;

export default deleteWorkspaceSlice.reducer;
