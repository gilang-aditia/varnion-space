import type { Permission } from "@/types/drive";

/* ------------------------------- API (Swagger) ------------------------------- */

/** POST /auth/login — body. */
export interface LoginPayload {
  client_id: string;
  email: string;
  password: string;
  remember_me: boolean;
  workspace_id: string;
}

export interface LoginUser {
  id: string;
  email: string;
  display_name: string;
  status: string;
  roles: string[];
  permissions: Permission[];
}

export interface LoginData {
  access_token: string;
  refresh_token: string;
  token_type: string;
  /** Umur access token (detik). */
  expires_in: number;
  user: LoginUser;
}

/** POST /auth/login — respons. */
export interface ApiLoginResponse {
  status: string;
  success_code: number;
  data: LoginData;
}

/* ---------------------------------- Redux ---------------------------------- */

/** Argumen `login` dari form. */
export interface LoginParams {
  email: string;
  password: string;
  remember: boolean;
}

/**
 * Metadata sesi yang disimpan di browser (TANPA token — token JWT ada di
 * cookie, lihat `src/api/token.ts`).
 */
export interface AuthSession {
  userId: string;
  /** true → sesi bertahan setelah browser ditutup. */
  remember: boolean;
  startedAt: string;
  device: string;
}

/** Hasil `login` (fulfilled): respons backend + sesi yang dibuat. */
export interface LoginResult {
  response: ApiLoginResponse;
  session: AuthSession;
}

/**
 * Status sesi aplikasi:
 * - `anonymous` → belum login (tampilkan halaman login)
 * - `restoring` → ada sesi tersimpan, sedang memuat data awal
 * - `error`     → gagal memuat data awal (mis. jaringan), bisa dicoba lagi
 * - `ready`     → data siap, tampilkan aplikasi
 */
export type AuthStatus = "anonymous" | "restoring" | "error" | "ready";

export interface LoginState {
  session: AuthSession | null;
  status: AuthStatus;
  /** Request login sedang berjalan. */
  loading: boolean;
  /** Pesan error login terakhir (untuk form). */
  error: string | null;
  /** Hak akses RBAC user aktif (dari `/auth/login` & `/auth/me`). */
  roles: string[];
  permissions: Permission[];
}
