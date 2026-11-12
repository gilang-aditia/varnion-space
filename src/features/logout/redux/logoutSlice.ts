import { createSlice } from "@reduxjs/toolkit";
import { login } from "@/features/login/redux/loginAction";
import { logout } from "./logoutAction";
import type { LogoutState } from "./logoutType";

const initialState: LogoutState = {
  loading: false,
  error: null,
  message: null,
};

const logoutSlice = createSlice({
  name: "logout",
  initialState,
  reducers: {
    resetLogoutState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Logout
      .addCase(logout.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logout.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload.data;
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Gagal keluar";
      })

      // Login berikutnya → mulai dari awal
      .addCase(login.fulfilled, () => initialState);
  },
});

export const { resetLogoutState } = logoutSlice.actions;

export default logoutSlice.reducer;
