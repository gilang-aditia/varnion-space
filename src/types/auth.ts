/**
 * Tipe DTO endpoint autentikasi backend (sesuai Swagger).
 *
 * Key ditulis dalam camelCase karena http client otomatis mengonversi
 * snake_case ↔ camelCase (mis. `access_token` → `accessToken`).
 */
import type { Permission } from './drive'

/** Pembungkus respons sukses: `{ status, success_code, data }`. */
export interface ApiEnvelope<T> {
  status: string
  successCode: number
  data: T
}

/** Body respons error: `{ status, error_code, error_message }`. */
export interface ApiErrorBody {
  status: string
  errorCode: number
  errorMessage: string
}

/** Objek peran seperti yang dikirim `GET /users`. */
export interface RoleDto {
  id: string
  code: string
  name: string
  description?: string
  isSystem?: boolean
  createdAt?: string
}

/**
 * User dari `/auth/login`, `/auth/me`, dan `/users`.
 *
 * Bentuk `roles` berbeda per endpoint:
 * - `/auth/login`, `/auth/me` → `string[]` (kode peran, mis. `["admin"]`)
 * - `/users` → `RoleDto[]`, dan bisa tidak ada sama sekali (user tanpa peran)
 */
export interface AuthUserDto {
  id: string
  email: string
  displayName: string
  status: 'active' | 'inactive' | (string & {})
  roles?: Array<string | RoleDto>
  permissions?: Permission[]
  createdAt?: string
}

/**
 * GET /auth/me — `data`.
 *
 * ```json
 * { "id", "email", "display_name", "status", "roles": ["admin"], "permissions": ["file.view", …] }
 * ```
 */
export interface MeDto {
  id: string
  email: string
  displayName: string
  status: 'active' | 'inactive' | (string & {})
  roles: string[]
  permissions: Permission[]
}

/** POST /auth/logout — `data` (mis. `"Log out successfully"`). Tanpa body request. */
export type LogoutResponseDto = string

/** POST /auth/login — body. */
export interface LoginRequestDto {
  clientId: string
  email: string
  password: string
  rememberMe: boolean
  workspaceId: string
}

/** POST /auth/login — `data`. */
export interface LoginResponseDto {
  accessToken: string
  refreshToken: string
  tokenType: 'Bearer' | (string & {})
  /** Umur access token (detik), mis. 28800 = 8 jam. */
  expiresIn: number
  user: AuthUserDto
}

/** POST /auth/refresh — body: `{ "refresh_token": "" }`. */
export interface RefreshRequestDto {
  refreshToken: string
}

/**
 * POST /auth/refresh — `data`.
 *
 * ```json
 * { "access_token": "…", "token_type": "Bearer", "expires_in": 28800 }
 * ```
 * `refresh_token` hanya dikirim bila refresh token lama sudah kedaluwarsa
 * (backend menerbitkan refresh token baru).
 */
export interface RefreshResponseDto {
  accessToken: string
  tokenType: 'Bearer' | (string & {})
  /** Umur access token baru (detik). */
  expiresIn: number
  refreshToken?: string
}
