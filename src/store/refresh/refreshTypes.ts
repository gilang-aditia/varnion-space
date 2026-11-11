/**
 * Tipe state Redux untuk refresh token (`POST /auth/refresh`).
 * DTO mentah dari backend: `RefreshRequestDto` / `RefreshResponseDto` di `@/types/auth`.
 */
import type { SerializedApiError } from '@/api'
import type { RefreshRequestDto, RefreshResponseDto } from '@/types/auth'

export type { RefreshRequestDto, RefreshResponseDto }

/** Status request `POST /auth/refresh`. */
export type RefreshStatus = 'idle' | 'pending' | 'succeeded' | 'failed'

export interface RefreshState {
  status: RefreshStatus
  /** Waktu refresh terakhir yang berhasil (ISO). */
  lastRefreshedAt: string | null
  /** Umur access token terakhir dari backend (detik). */
  expiresIn: number | null
  error: SerializedApiError | null
}
