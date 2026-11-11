/**
 * Titik masuk API: REST API di VITE_API_BASE_URL (default `/api`).
 *
 * Lihat .env.example dan docs/backend-integration.md.
 */
import type { DriveApi } from './contract'
import { createHttpApi } from './http/http-api'

export const api: DriveApi = createHttpApi(import.meta.env.VITE_API_BASE_URL ?? '/api')

export * from './contract'
export { setRefreshHandler, type RefreshHandler } from './http/client'
export { clearAuthTokens, getAuthToken, getAuthTokens, setAuthTokens, type AuthTokens } from './token'
