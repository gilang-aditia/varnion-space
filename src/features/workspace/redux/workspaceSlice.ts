import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { loggedOut } from "@/features/login/redux/loginAction";
import {
  fetchWorkspaceSummary,
  fetchWorkspaces,
  isUnfilteredList,
} from "./workspaceAction";
import { updateWorkspace } from "./updateWorkspaceAction";
import { deleteWorkspace } from "./deleteWorkspaceAction";
import { restoreWorkspace } from "./restoreWorkspaceAction";
import type { ApiWorkspaceListResponse, WorkspaceState } from "./workspaceType";

/** Ringkasan kartu statistik beranda dari respons list tanpa filter. */
function summarize(
  response: ApiWorkspaceListResponse,
): NonNullable<WorkspaceState["summary"]> {
  const data = (response.data ?? []).filter((w) => !w.deleted_at);
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  return {
    workspaces: response.meta?.total ?? data.length,
    files: data.reduce((sum, w) => sum + (w.total_files ?? 0), 0),
    size: data.reduce((sum, w) => sum + (w.total_size ?? 0), 0),
    activeToday: data.filter(
      (w) =>
        !!w.last_activity_at && Date.parse(w.last_activity_at) >= startOfDay,
    ).length,
  };
}

const initialState: WorkspaceState = {
  workspaces: [],
  meta: null,
  loading: false,
  error: null,
  currentPage: 1,
  limit: 20,
  search: "",
  status: "all",
  deleted: false,
  lastRequestId: null,
  pendingParamsKey: null,
  summary: null,
};

const workspaceSlice = createSlice({
  name: "workspaces",
  initialState,
  reducers: {
    setWorkspaceCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    setWorkspaceLimit: (state, action: PayloadAction<number>) => {
      state.limit = action.payload;
      state.currentPage = 1;
    },
    setWorkspaceSearch: (state, action: PayloadAction<string>) => {
      state.search = action.payload;
      state.currentPage = 1;
    },
    setWorkspaceStatusFilter: (state, action: PayloadAction<string>) => {
      state.status = action.payload;
      state.currentPage = 1;
    },
    /** Pindah antara daftar workspace dan daftar terhapus (soft delete). */
    setWorkspaceDeletedView: (state, action: PayloadAction<boolean>) => {
      if (state.deleted === action.payload) return;
      state.deleted = action.payload;
      state.currentPage = 1;
      // kosongkan agar daftar lama tidak sempat tampil di tampilan lain
      state.workspaces = [];
      state.meta = null;
    },
    clearWorkspaceFilters: (state) => {
      state.search = "";
      state.status = "all";
      state.currentPage = 1;
    },
    resetWorkspaceState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch Workspaces
      .addCase(fetchWorkspaces.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.lastRequestId = action.meta.requestId;
        state.pendingParamsKey = JSON.stringify(action.meta.arg);
      })
      .addCase(fetchWorkspaces.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.lastRequestId) return; // respons usang
        state.loading = false;
        state.pendingParamsKey = null;
        const data = action.payload.data ?? [];
        // pengaman: daftar aktif tidak menampilkan workspace yang sudah di-soft delete
        state.workspaces = action.meta.arg.deleted
          ? data
          : data.filter((w) => !w.deleted_at);
        state.meta = action.payload.meta;
        // tanpa filter → ringkasan semua workspace yang dapat diakses
        if (isUnfilteredList(action.meta.arg))
          state.summary = summarize(action.payload);
      })
      .addCase(fetchWorkspaces.rejected, (state, action) => {
        if (action.meta.requestId !== state.lastRequestId) return;
        state.loading = false;
        state.pendingParamsKey = null;
        state.error = action.payload || "Gagal memuat daftar workspace";
      })

      // Hasil edit → perbarui seketika (daftar juga dimuat ulang oleh thunk)
      .addCase(updateWorkspace.fulfilled, (state, action) => {
        const { id, payload, response } = action.payload;
        const changes = { ...payload, ...(response.data ?? {}) };
        const ws = state.workspaces.find((w) => w.id === id);
        if (ws) Object.assign(ws, changes);
      })

      // Hapus → keluarkan dari daftar seketika (daftar juga dimuat ulang oleh thunk)
      .addCase(deleteWorkspace.fulfilled, (state, action) => {
        const { id, hard } = action.payload;
        // hapus permanen dari tampilan Terhapus, atau soft delete dari tampilan aktif
        if (hard || !state.deleted)
          state.workspaces = state.workspaces.filter((w) => w.id !== id);
      })

      // Dipulihkan → keluar dari daftar terhapus seketika
      .addCase(restoreWorkspace.fulfilled, (state, action) => {
        if (state.deleted)
          state.workspaces = state.workspaces.filter(
            (w) => w.id !== action.payload.id,
          );
      })

      // Ringkasan beranda (dimuat terpisah saat daftar sedang berfilter)
      .addCase(fetchWorkspaceSummary.fulfilled, (state, action) => {
        state.summary = summarize(action.payload);
      })

      // Logout / sesi berakhir
      .addCase(loggedOut, () => initialState);
  },
});

export const {
  setWorkspaceCurrentPage,
  setWorkspaceLimit,
  setWorkspaceSearch,
  setWorkspaceStatusFilter,
  setWorkspaceDeletedView,
  clearWorkspaceFilters,
  resetWorkspaceState,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;
