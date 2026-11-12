import { createSlice } from "@reduxjs/toolkit";
import { loggedOut } from "@/features/login/redux/loginAction";
import { deleteUser } from "./deleteUserAction";
import type { DeleteUserState } from "./deleteUserType";

const initialState: DeleteUserState = {
  loading: false,
  error: null,
  lastDeleted: null,
};

const deleteUserSlice = createSlice({
  name: "deleteUser",
  initialState,
  reducers: {
    resetDeleteUserState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Delete User
      .addCase(deleteUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.loading = false;
        state.lastDeleted = {
          id: action.payload.id,
          hard: action.payload.hard,
        };
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Gagal menghapus pengguna";
      })

      // Logout / sesi berakhir
      .addCase(loggedOut, () => initialState);
  },
});

export const { resetDeleteUserState } = deleteUserSlice.actions;

export default deleteUserSlice.reducer;
