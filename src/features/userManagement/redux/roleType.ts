import type { PaginationMeta } from "@/types/api";
import type { PermissionData } from "./permissionType";

/* ------------------------------- API (Swagger) ------------------------------- */

/** Item `GET /rbac/roles`. */
export interface Role {
  id: string;
  code: string;
  name: string;
  description: string;
  is_system: boolean;
  created_at: string;
  permissions: PermissionData[];
}

export type RoleMeta = PaginationMeta;

/** GET /rbac/roles — respons. */
export interface ApiRoleListResponse {
  status: string;
  success_code: number;
  data: Role[];
  meta: RoleMeta;
}

/** GET /rbac/roles — query. */
export interface FetchRolesParams {
  page?: number;
  /** Default 20, maks 100. */
  per_page?: number;
  /** Cari berdasarkan nama atau deskripsi peran. */
  search?: string;
}

/* ---------------------------------- Redux ---------------------------------- */

export interface RoleState {
  roles: Role[];
  /** Semua peran (semua halaman) — pilihan filter peran di daftar pengguna. */
  allRoles: Role[];
  meta: RoleMeta | null;
  loading: boolean;
  loadingAll: boolean;
  error: string | null;
  currentPage: number;
  limit: number;
  search: string;
  /** `requestId` request terakhir — respons yang lebih lama diabaikan. */
  lastRequestId: string | null;
  /** Parameter request yang sedang berjalan — request kembar dilewati (`condition`). */
  pendingParamsKey: string | null;
}
