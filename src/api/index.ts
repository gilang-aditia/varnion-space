/**
 * Titik masuk API: REST API di VITE_API_BASE_URL (default `/api`).
 *
 * Lihat .env.example dan docs/backend-integration.md.
 */
import type { DriveApi } from './contract'
import { createHttpApi } from './http/http-api'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/** API lama (drive, workspace, dll.) — respons sudah dibuka & dikonversi ke camelCase. */
export const api: DriveApi = createHttpApi(BASE_URL)

export * from './contract'
export { setRefreshHandler, type RefreshHandler } from './http/client'
export { clearAuthTokens, getAuthToken, getAuthTokens, setAuthTokens, type AuthTokens } from './token'
