/**
 * Tipe state & payload Redux untuk autentikasi.
 * DTO mentah dari backend ada di `@/types/auth`.
 */
import type { SerializedApiError } from '@/api'
import type { Permission } from '@/types/drive'

/**
 * Status sesi aplikasi:
 * - `anonymous` → belum login (tampilkan halaman login)
 * - `restoring` → ada sesi tersimpan, sedang memuat data awal
 * - `error`     → gagal memuat data awal (mis. jaringan), bisa dicoba lagi
 * - `ready`     → data siap, tampilkan aplikasi
 */
export type AuthStatus = 'anonymous' | 'restoring' | 'error' | 'ready'

/** Status proses request login. */
export type LoginStatus = 'idle' | 'pending' | 'succeeded' | 'failed'

/**
 * Metadata sesi yang disimpan di browser (TANPA token — token JWT ada di
 * cookie, lihat `src/api/token.ts`).
 */
export interface AuthSession {
  userId: string
  /** true → sesi bertahan setelah browser ditutup. */
  remember: boolean
  startedAt: string
  device: string
}

/** Hak akses RBAC user aktif, langsung dari respons backend. */
export interface AuthAccess {
  roles: string[]
  permissions: Permission[]
}

export interface AuthState extends AuthAccess {
  session: AuthSession | null
  status: AuthStatus
  loginStatus: LoginStatus
  /** Error login terakhir (untuk form). */
  error: SerializedApiError | null
}

/* -------------------------------- Payload -------------------------------- */

export interface LoginArgs {
  email: string
  password: string
  remember: boolean
}

/** Hasil `login` (fulfilled). */
export interface LoginResult extends AuthAccess {
  session: AuthSession
}

/** Hasil `restoreSession` (fulfilled). */
export type CurrentUserResult = AuthAccess
