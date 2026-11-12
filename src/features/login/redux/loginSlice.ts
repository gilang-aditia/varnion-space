import { createSlice } from "@reduxjs/toolkit";
import { fetchMe } from "@/features/me/redux/meAction";
import { loggedOut, login, restoreSession } from "./loginAction";
import type { AuthSession, LoginState } from "./loginType";

const initialState: LoginState = {
  session: null,
  status: "anonymous",
  loading: false,
  error: null,
  roles: [],
  permissions: [],
};

/** State awal dari sesi tersimpan (dipakai `preloadedState` di store). */
export const loginStateFromSession = (session: AuthSession | null): LoginState => ({
  ...initialState,
  session,
  status: session ? "restoring" : "anonymous",
});

const loginSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearLoginError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.session = action.payload.session;
        state.roles = action.payload.response.data.user.roles;
        state.permissions = action.payload.response.data.user.permissions;
        state.status = "ready";
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Gagal masuk.";
      })

      // Restore Session
      .addCase(restoreSession.pending, (state) => {
        state.status = "restoring";
      })
      .addCase(restoreSession.fulfilled, (state) => {
        state.status = "ready";
      })
      .addCase(restoreSession.rejected, (state) => {
        // 401 sudah memicu `loggedOut` (status → anonymous); selain itu tampilkan "Coba lagi"
        if (state.session) state.status = "error";
      })

      // GET /auth/me → roles/permissions terbaru
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.roles = action.payload.data.roles;
        state.permissions = action.payload.data.permissions;
      })

      // Logout / sesi berakhir
      .addCase(loggedOut, () => initialState);
  },
});

export const { clearLoginError } = loginSlice.actions;

export default loginSlice.reducer;
