/**
 * Tipe state Redux untuk profil user aktif (`GET /auth/me`).
 * DTO mentah dari backend: `MeDto` di `@/types/auth`.
 */
import type { SerializedApiError } from '@/api'
import type { MeDto } from '@/types/auth'

export type { MeDto }

/** Status request `GET /auth/me`. */
export type MeStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

export interface MeState {
  /** `data` dari respons `/auth/me`; `null` sebelum dimuat / setelah logout. */
  data: MeDto | null
  status: MeStatus
  error: SerializedApiError | null
}
