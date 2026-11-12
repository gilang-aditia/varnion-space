import { createSlice } from "@reduxjs/toolkit";
import { loggedOut } from "@/features/login/redux/loginAction";
import { fetchUserDetail } from "./userDetailAction";
import { updateUser } from "./updateUserAction";
import { deleteUser } from "./deleteUserAction";
import { restoreUser } from "./restoreUserAction";
import type { UserDetailState } from "./userDetailType";

const initialState: UserDetailState = {
  user: null,
  loading: false,
  error: null,
  lastRequestId: null,
  pendingId: null,
};

const userDetailSlice = createSlice({
  name: "userDetail",
  initialState,
  reducers: {
    resetUserDetailState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch User Detail
      .addCase(fetchUserDetail.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.lastRequestId = action.meta.requestId;
        state.pendingId = action.meta.arg.id;
        // user lain → jangan tampilkan data user sebelumnya
        if (state.user?.id !== action.meta.arg.id) state.user = null;
      })
      .addCase(fetchUserDetail.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.lastRequestId) return; // respons usang
        state.loading = false;
        state.pendingId = null;
        state.user = action.payload.data;
      })
      .addCase(fetchUserDetail.rejected, (state, action) => {
        if (action.meta.requestId !== state.lastRequestId) return;
        state.loading = false;
        state.pendingId = null;
        state.error = action.payload || "Gagal memuat detail pengguna";
      })

      // Hasil edit → perbarui detail yang sedang tampil (roles & permissions tetap)
      .addCase(updateUser.fulfilled, (state, action) => {
        const { id, display_name, status } = action.payload.data;
        if (state.user?.id === id)
          Object.assign(state.user, { display_name, status });
      })

      // Soft delete → tandai terhapus (halaman detail menampilkan opsi pulihkan); hard delete → hilang
      .addCase(deleteUser.fulfilled, (state, action) => {
        if (state.user?.id !== action.payload.id) return;
        if (action.payload.hard) state.user = null;
        else state.user.deleted_at = new Date().toISOString();
      })

      // Restore → hapus tanda terhapus
      .addCase(restoreUser.fulfilled, (state, action) => {
        if (state.user?.id === action.payload.id) state.user.deleted_at = null;
      })

      // Logout / sesi berakhir
      .addCase(loggedOut, () => initialState);
  },
});

export const { resetUserDetailState } = userDetailSlice.actions;

export default userDetailSlice.reducer;
