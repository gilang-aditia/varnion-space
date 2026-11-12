import type { PaginationMeta } from "@/types/api";
import type { Permission } from "@/types/drive";

/* ------------------------------- API (Swagger) ------------------------------- */

export interface UserRole {
  id: string;
  code: string;
  name: string;
  description: string;
  is_system: boolean;
  created_at: string;
}

/** Item `GET /users`. `roles` & `permissions` tidak dikirim bila user belum punya peran. */
export interface UserData {
  id: string;
  email: string;
  display_name: string;
  /** Mis. `active`, `inactive`, `suspended`. */
  status: string;
  created_at: string;
  /** Terisi bila user di-soft delete (bisa dipulihkan). Belum tentu dikirim backend. */
  deleted_at?: string | null;
  roles?: UserRole[];
  permissions?: Permission[];
}

export type UserMeta = PaginationMeta;

/** GET /users — respons. */
export interface ApiUserListResponse {
  status: string;
  success_code: number;
  data: UserData[];
  meta: UserMeta;
}

/** GET /users — query. Nilai `"all"` / kosong = tanpa filter (tidak dikirim). */
export interface FetchUsersParams {
  page?: number;
  /** Default 20, maks 100. */
  per_page?: number;
  /** Cari berdasarkan email atau display name. */
  search?: string;
  /** Mis. `active`, `inactive`, `suspended`. */
  status?: string;
  /** Kode peran, mis. `super_admin`, `admin`, `viewer`. */
  role?: string;
  /** true → hanya user yang di-soft delete (terhapus). Default false. */
  deleted?: boolean;
}

/* ---------------------------------- Redux ---------------------------------- */

export interface UserState {
  users: UserData[];
  meta: UserMeta | null;
  loading: boolean;
  error: string | null;
  currentPage: number;
  limit: number;
  search: string;
  /** `"all"` = semua status. */
  status: string;
  /** `"all"` = semua peran. */
  role: string;
  /** true → tampilan terhapus (user yang di-soft delete). */
  deleted: boolean;
  /** `requestId` request terakhir — respons yang lebih lama diabaikan. */
  lastRequestId: string | null;
  /** Parameter request yang sedang berjalan — request kembar dilewati (`condition`). */
  pendingParamsKey: string | null;
}
