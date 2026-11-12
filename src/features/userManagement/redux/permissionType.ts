import type { PaginationMeta } from "@/types/api";

/* ------------------------------- API (Swagger) ------------------------------- */

/** Item `GET /rbac/permissions` (juga dipakai di `permissions` milik role). */
export interface PermissionData {
  id: string;
  /** Kode izin, mis. `file.upload` (sama dengan isi `permissions` di JWT). */
  code: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  created_at: string;
}

export type PermissionMeta = PaginationMeta;

/** GET /rbac/permissions — respons. */
export interface ApiPermissionListResponse {
  status: string;
  success_code: number;
  data: PermissionData[];
  meta: PermissionMeta;
}

/** GET /rbac/permissions — query. */
export interface FetchPermissionsParams {
  page?: number;
  /** Default 20, maks 100. */
  per_page?: number;
  /** Cari berdasarkan action atau resource izin. */
  search?: string;
}

/* ---------------------------------- Redux ---------------------------------- */

export interface PermissionState {
  permissions: PermissionData[];
  /** Semua izin (semua halaman) — sumbu matriks hak akses. */
  allPermissions: PermissionData[];
  meta: PermissionMeta | null;
  loading: boolean;
  loadingAll: boolean;
  error: string | null;
  /** Error saat memuat `allPermissions`. */
  errorAll: string | null;
  currentPage: number;
  limit: number;
  search: string;
  /** `requestId` request terakhir — respons yang lebih lama diabaikan. */
  lastRequestId: string | null;
  /** Parameter request yang sedang berjalan — request kembar dilewati (`condition`). */
  pendingParamsKey: string | null;
}
