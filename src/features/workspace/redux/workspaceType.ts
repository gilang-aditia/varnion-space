import type { PaginationMeta } from "@/types/api";

/* ------------------------------- API (Swagger) ------------------------------- */

/** Status workspace. */
export type WorkspaceStatus = "active" | "inactive" | "archived";

export interface WorkspaceCreator {
  name: string;
  email: string;
}

/** Item `GET /workspaces`. */
export interface WorkspaceData {
  id: string;
  name: string;
  description: string;
  created_by: WorkspaceCreator;
  /** Mis. `active`, `inactive`, `archived`. */
  status: WorkspaceStatus | (string & {});
  total_folders: number;
  total_files: number;
  /** Ukuran total isi workspace (byte). */
  total_size: number;
  /** Mis. "548 B" — sudah diformat backend. */
  total_size_formatted: string;
  /** Waktu aktivitas terakhir; null bila belum ada aktivitas. */
  last_activity_at: string | null;
  /** Mis. "Folder activity". */
  last_activity: string | null;
  created_at: string;
  updated_at: string;
  /** Terisi bila workspace di-soft delete. Belum tentu dikirim backend. */
  deleted_at?: string | null;
}

export type WorkspaceMeta = PaginationMeta;

/** GET /workspaces — respons. */
export interface ApiWorkspaceListResponse {
  status: string;
  success_code: number;
  data: WorkspaceData[];
  meta: WorkspaceMeta;
}

/** GET /workspaces — query. Nilai `"all"` / kosong = tanpa filter (tidak dikirim). */
export interface FetchWorkspacesParams {
  page?: number;
  /** Default 20, maks 100. */
  per_page?: number;
  /** Cari berdasarkan nama atau deskripsi workspace. */
  search?: string;
  /** Mis. `active`, `inactive`, `archived`. */
  status?: string;
  /** true → hanya workspace yang di-soft delete. Default false. */
  deleted?: boolean;
  /**
   * Hanya frontend: true → tambahkan `_t=<timestamp>` agar respons tidak diambil
   * dari cache (dipakai saat memuat ulang setelah create/edit/hapus/pulihkan).
   */
  fresh?: boolean;
}

/* ---------------------------------- Redux ---------------------------------- */

export interface WorkspaceState {
  workspaces: WorkspaceData[];
  meta: WorkspaceMeta | null;
  loading: boolean;
  error: string | null;
  currentPage: number;
  limit: number;
  search: string;
  /** `"all"` = semua status. */
  status: string;
  /** true → tampilan terhapus (workspace yang di-soft delete). */
  deleted: boolean;
  /** `requestId` request terakhir — respons yang lebih lama diabaikan. */
  lastRequestId: string | null;
  /** Parameter request yang sedang berjalan — request kembar dilewati (`condition`). */
  pendingParamsKey: string | null;
  /** Ringkasan workspace yang dapat diakses (respons terakhir tanpa filter/pencarian) — kartu statistik beranda. */
  summary: {
    /** `meta.total` */
    workspaces: number;
    /** Jumlah `total_files` workspace yang dimuat. */
    files: number;
    /** Jumlah `total_size` (byte) workspace yang dimuat. */
    size: number;
    /** Workspace dengan `last_activity_at` hari ini. */
    activeToday: number;
  } | null;
}
