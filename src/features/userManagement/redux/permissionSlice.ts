import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { loggedOut } from "@/features/login/redux/loginAction";
import { fetchAllPermissions, fetchPermissions } from "./permissionAction";
import type { PermissionState } from "./permissionType";

const initialState: PermissionState = {
  permissions: [],
  allPermissions: [],
  meta: null,
  loading: false,
  loadingAll: false,
  error: null,
  errorAll: null,
  currentPage: 1,
  limit: 20,
  search: "",
  lastRequestId: null,
  pendingParamsKey: null,
};

const permissionSlice = createSlice({
  name: "permissions",
  initialState,
  reducers: {
    setPermissionCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    setPermissionLimit: (state, action: PayloadAction<number>) => {
      state.limit = action.payload;
      state.currentPage = 1; // Reset ke halaman pertama ketika limit berubah
    },
    setPermissionSearch: (state, action: PayloadAction<string>) => {
      state.search = action.payload;
      state.currentPage = 1; // Reset ke halaman pertama ketika search berubah
    },
    resetPermissionState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch Permissions
      .addCase(fetchPermissions.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.lastRequestId = action.meta.requestId;
        state.pendingParamsKey = JSON.stringify(action.meta.arg);
      })
      .addCase(fetchPermissions.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.lastRequestId) return; // respons usang
        state.loading = false;
        state.pendingParamsKey = null;
        state.permissions = action.payload.data ?? [];
        state.meta = action.payload.meta;
      })
      .addCase(fetchPermissions.rejected, (state, action) => {
        if (action.meta.requestId !== state.lastRequestId) return;
        state.loading = false;
        state.pendingParamsKey = null;
        state.error = action.payload || "Gagal memuat daftar izin";
      })

      // Fetch All Permissions
      .addCase(fetchAllPermissions.pending, (state) => {
        state.loadingAll = true;
        state.errorAll = null;
      })
      .addCase(fetchAllPermissions.fulfilled, (state, action) => {
        state.loadingAll = false;
        state.allPermissions = action.payload;
      })
      .addCase(fetchAllPermissions.rejected, (state, action) => {
        state.loadingAll = false;
        state.errorAll = action.payload || "Gagal memuat daftar izin";
      })

      // Logout / sesi berakhir
      .addCase(loggedOut, () => initialState);
  },
});

export const {
  setPermissionCurrentPage,
  setPermissionLimit,
  setPermissionSearch,
  resetPermissionState,
} = permissionSlice.actions;

export default permissionSlice.reducer;
