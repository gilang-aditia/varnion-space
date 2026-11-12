import { createSlice } from "@reduxjs/toolkit";
import { loggedOut } from "@/features/login/redux/loginAction";
import { updateUser } from "./updateUserAction";
import type { UpdateUserState } from "./updateUserType";

const initialState: UpdateUserState = {
  loading: false,
  error: null,
  updatedUser: null,
};

const updateUserSlice = createSlice({
  name: "updateUser",
  initialState,
  reducers: {
    clearUpdateUserError: (state) => {
      state.error = null;
    },
    resetUpdateUserState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Update User
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        state.updatedUser = action.payload.data;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Gagal memperbarui pengguna";
      })

      // Logout / sesi berakhir
      .addCase(loggedOut, () => initialState);
  },
});

export const { clearUpdateUserError, resetUpdateUserState } =
  updateUserSlice.actions;

export default updateUserSlice.reducer;
