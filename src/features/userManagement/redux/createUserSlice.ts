import { createSlice } from "@reduxjs/toolkit";
import { loggedOut } from "@/features/login/redux/loginAction";
import { createUser } from "./createUserAction";
import type { CreateUserState } from "./createUserType";

const initialState: CreateUserState = {
  loading: false,
  error: null,
  createdUser: null,
};

const createUserSlice = createSlice({
  name: "createUser",
  initialState,
  reducers: {
    clearCreateUserError: (state) => {
      state.error = null;
    },
    resetCreateUserState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Create User
      .addCase(createUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.loading = false;
        state.createdUser = action.payload.data;
      })
      .addCase(createUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Gagal menambah pengguna";
      })

      // Logout / sesi berakhir
      .addCase(loggedOut, () => initialState);
  },
});

export const { clearCreateUserError, resetCreateUserState } =
  createUserSlice.actions;

export default createUserSlice.reducer;
