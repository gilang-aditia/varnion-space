import { createSlice } from "@reduxjs/toolkit";
import { loggedOut } from "@/features/login/redux/loginAction";
import { restoreUser } from "./restoreUserAction";
import type { RestoreUserState } from "./restoreUserType";

const initialState: RestoreUserState = {
  loading: false,
  error: null,
  lastRestoredId: null,
};

const restoreUserSlice = createSlice({
  name: "restoreUser",
  initialState,
  reducers: {
    resetRestoreUserState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Restore User
      .addCase(restoreUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(restoreUser.fulfilled, (state, action) => {
        state.loading = false;
        state.lastRestoredId = action.payload.id;
      })
      .addCase(restoreUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Gagal memulihkan pengguna";
      })

      // Logout / sesi berakhir
      .addCase(loggedOut, () => initialState);
  },
});

export const { resetRestoreUserState } = restoreUserSlice.actions;

export default restoreUserSlice.reducer;
