/**
 * Tipe state Redux untuk logout (`POST /auth/logout`).
 * DTO mentah dari backend: `LogoutResponseDto` di `@/types/auth`.
 */
import type { SerializedApiError } from '@/api'
import type { LogoutResponseDto } from '@/types/auth'

export type { LogoutResponseDto }

/** Status request `POST /auth/logout`. */
export type LogoutStatus = 'idle' | 'pending' | 'succeeded' | 'failed'

export interface LogoutState {
  status: LogoutStatus
  /** Pesan dari backend (`data`), mis. "Log out successfully". */
  message: LogoutResponseDto | null
  error: SerializedApiError | null
}
