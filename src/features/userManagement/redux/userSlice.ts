import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { loggedOut } from "@/features/login/redux/loginAction";
import { fetchUsers } from "./userAction";
import { updateUser } from "./updateUserAction";
import { deleteUser } from "./deleteUserAction";
import { restoreUser } from "./restoreUserAction";
import type { UserState } from "./userType";

const initialState: UserState = {
  users: [],
  meta: null,
  loading: false,
  error: null,
  currentPage: 1,
  limit: 20,
  search: "",
  status: "all",
  role: "all",
  deleted: false,
  lastRequestId: null,
  pendingParamsKey: null,
};

const userSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    setLimit: (state, action: PayloadAction<number>) => {
      state.limit = action.payload;
      state.currentPage = 1; // Reset ke halaman pertama ketika limit berubah
    },
    setSearch: (state, action: PayloadAction<string>) => {
      state.search = action.payload;
      state.currentPage = 1; // Reset ke halaman pertama ketika search berubah
    },
    setStatusFilter: (state, action: PayloadAction<string>) => {
      state.status = action.payload;
      state.currentPage = 1;
    },
    setRoleFilter: (state, action: PayloadAction<string>) => {
      state.role = action.payload;
      state.currentPage = 1;
    },
    /** Pindah antara daftar pengguna dan terhapus (user yang di-soft delete). */
    setDeletedView: (state, action: PayloadAction<boolean>) => {
      if (state.deleted === action.payload) return;
      state.deleted = action.payload;
      state.currentPage = 1;
      // kosongkan agar daftar lama tidak sempat tampil di tampilan lain
      state.users = [];
      state.meta = null;
    },
    clearFilters: (state) => {
      state.search = "";
      state.status = "all";
      state.role = "all";
      state.currentPage = 1;
    },
    resetUserState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch Users
      .addCase(fetchUsers.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.lastRequestId = action.meta.requestId;
        state.pendingParamsKey = JSON.stringify(action.meta.arg);
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.lastRequestId) return; // respons usang
        state.loading = false;
        state.pendingParamsKey = null;
        state.users = action.payload.data ?? [];
        state.meta = action.payload.meta;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        if (action.meta.requestId !== state.lastRequestId) return;
        state.loading = false;
        state.pendingParamsKey = null;
        state.error = action.payload || "Gagal memuat daftar pengguna";
      })

      // Hasil edit → perbarui baris di daftar tanpa memuat ulang
      .addCase(updateUser.fulfilled, (state, action) => {
        const { id, display_name, status } = action.payload.data;
        const user = state.users.find((u) => u.id === id);
        if (user) Object.assign(user, { display_name, status });
      })

      // Hapus → keluarkan dari daftar seketika (daftar juga dimuat ulang oleh thunk)
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.users = state.users.filter((u) => u.id !== action.payload.id);
      })

      // Dipulihkan → keluar dari daftar terhapus seketika
      .addCase(restoreUser.fulfilled, (state, action) => {
        if (state.deleted)
          state.users = state.users.filter((u) => u.id !== action.payload.id);
      })

      // Logout / sesi berakhir
      .addCase(loggedOut, () => initialState);
  },
});

export const {
  setCurrentPage,
  setLimit,
  setSearch,
  setStatusFilter,
  setRoleFilter,
  setDeletedView,
  clearFilters,
  resetUserState,
} = userSlice.actions;

export default userSlice.reducer;
