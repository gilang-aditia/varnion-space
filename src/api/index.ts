/**
 * Titik masuk API. Pilih implementasi lewat environment variable:
 *
 *   VITE_API_MODE=mock   (default) → mock server di browser
 *   VITE_API_MODE=http             → REST API di VITE_API_BASE_URL
 *
 * Lihat .env.example dan docs/backend-integration.md.
 */
import type { DriveApi } from './contract'
import { createHttpApi } from './http/http-api'
import { createMockApi } from './mock/mock-api'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from './mock/seed'

export const apiMode: 'mock' | 'http' = import.meta.env.VITE_API_MODE === 'http' ? 'http' : 'mock'

export const api: DriveApi =
  apiMode === 'http'
    ? createHttpApi(import.meta.env.VITE_API_BASE_URL ?? '/api')
    : createMockApi({ latencyMs: Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 200) })

/** Akun demo untuk halaman login — kosong saat memakai backend sungguhan. */
export const demoLogin =
  apiMode === 'mock' ? { accounts: DEMO_ACCOUNTS, password: DEMO_PASSWORD } : { accounts: [], password: '' }

export * from './contract'
export { setAuthToken } from './token'
