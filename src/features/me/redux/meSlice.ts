import { createSlice } from "@reduxjs/toolkit";
import { loggedOut } from "@/features/login/redux/loginAction";
import { fetchMe } from "./meAction";
import type { MeState } from "./meType";

const initialState: MeState = {
  me: null,
  loading: false,
  error: null,
};

const meSlice = createSlice({
  name: "me",
  initialState,
  reducers: {
    resetMeState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch Me
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.loading = false;
        state.me = action.payload.data;
      })
      .addCase(fetchMe.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Gagal memuat profil";
      })

      // Logout / sesi berakhir
      .addCase(loggedOut, () => initialState);
  },
});

export const { resetMeState } = meSlice.actions;

export default meSlice.reducer;
