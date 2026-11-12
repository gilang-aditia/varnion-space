import { createSlice } from "@reduxjs/toolkit";
import { loggedOut } from "@/features/login/redux/loginAction";
import { refreshAccessToken } from "./refreshTokenAction";
import type { RefreshTokenState } from "./refreshTokenType";

const initialState: RefreshTokenState = {
  loading: false,
  error: null,
  lastRefreshedAt: null,
  expiresIn: null,
};

const refreshTokenSlice = createSlice({
  name: "refreshToken",
  initialState,
  reducers: {
    resetRefreshTokenState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Refresh Access Token
      .addCase(refreshAccessToken.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.loading = false;
        state.lastRefreshedAt = new Date().toISOString();
        state.expiresIn = action.payload.data.expires_in;
      })
      .addCase(refreshAccessToken.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Gagal memperbarui sesi";
      })

      // Logout / sesi berakhir
      .addCase(loggedOut, () => initialState);
  },
});

export const { resetRefreshTokenState } = refreshTokenSlice.actions;

export default refreshTokenSlice.reducer;
