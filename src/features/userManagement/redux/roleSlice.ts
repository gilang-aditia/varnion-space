import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { loggedOut } from "@/features/login/redux/loginAction";
import { fetchAllRoles, fetchRoles } from "./roleAction";
import type { RoleState } from "./roleType";

const initialState: RoleState = {
  roles: [],
  allRoles: [],
  meta: null,
  loading: false,
  loadingAll: false,
  error: null,
  currentPage: 1,
  limit: 20,
  search: "",
  lastRequestId: null,
  pendingParamsKey: null,
};

const roleSlice = createSlice({
  name: "roles",
  initialState,
  reducers: {
    setRoleCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    setRoleLimit: (state, action: PayloadAction<number>) => {
      state.limit = action.payload;
      state.currentPage = 1; // Reset ke halaman pertama ketika limit berubah
    },
    setRoleSearch: (state, action: PayloadAction<string>) => {
      state.search = action.payload;
      state.currentPage = 1; // Reset ke halaman pertama ketika search berubah
    },
    resetRoleState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch Roles
      .addCase(fetchRoles.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.lastRequestId = action.meta.requestId;
        state.pendingParamsKey = JSON.stringify(action.meta.arg);
      })
      .addCase(fetchRoles.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.lastRequestId) return; // respons usang
        state.loading = false;
        state.pendingParamsKey = null;
        state.roles = action.payload.data ?? [];
        state.meta = action.payload.meta;
      })
      .addCase(fetchRoles.rejected, (state, action) => {
        if (action.meta.requestId !== state.lastRequestId) return;
        state.loading = false;
        state.pendingParamsKey = null;
        state.error = action.payload || "Gagal memuat daftar peran";
      })

      // Fetch All Roles
      .addCase(fetchAllRoles.pending, (state) => {
        state.loadingAll = true;
      })
      .addCase(fetchAllRoles.fulfilled, (state, action) => {
        state.loadingAll = false;
        state.allRoles = action.payload;
      })
      .addCase(fetchAllRoles.rejected, (state) => {
        state.loadingAll = false;
      })

      // Logout / sesi berakhir
      .addCase(loggedOut, () => initialState);
  },
});

export const {
  setRoleCurrentPage,
  setRoleLimit,
  setRoleSearch,
  resetRoleState,
} = roleSlice.actions;

export default roleSlice.reducer;
