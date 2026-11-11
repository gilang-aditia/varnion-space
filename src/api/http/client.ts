import { ApiError, type ApiErrorCode } from '../contract'
import { isTokenExpired } from '@/lib/jwt'
import { getAuthToken, getRefreshToken } from '../token'
import type { Paginated } from '@/types/rbac'

type Query = Record<string, string | number | undefined>

/* ---------------------- snake_case (backend) ↔ camelCase (UI) ---------------------- */

const toCamelKey = (k: string) => k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
const toSnakeKey = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)

/** Ubah semua key objek (rekursif) — nilai tidak diubah. */
function convertKeys(value: unknown, convert: (k: string) => string): unknown {
  if (Array.isArray(value)) return value.map((v) => convertKeys(v, convert))
  if (value && typeof value === 'object' && value.constructor === Object) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [convert(k), convertKeys(v, convert)]))
  }
  return value
}

interface RequestOptions {
  query?: Query
  /** Body JSON. */
  json?: unknown
  /** Body multipart (upload file). */
  form?: FormData
  /** true → jangan coba refresh token saat 401 (dipakai endpoint auth). */
  skipRefresh?: boolean
  /** true → kembalikan `{ data, meta }` (list berpaginasi), bukan hanya `data`. */
  withMeta?: boolean
}

/** Bentuk respons sukses backend: `{ status, success_code, data }`. */
interface Envelope<T> {
  status: string
  success_code: number
  data: T
}

const isEnvelope = (body: unknown): body is Envelope<unknown> =>
  !!body && typeof body === 'object' && 'data' in body && ('success_code' in body || 'status' in body)

/* ------------------------------ refresh token ------------------------------ */

/**
 * Fungsi yang menukar refresh token dengan access token baru dan mengembalikan
 * `true` bila berhasil. Didaftarkan oleh store Redux (thunk `refreshAccessToken`)
 * lewat `setRefreshHandler`, sehingga client tidak bergantung pada Redux.
 */
export type RefreshHandler = () => Promise<boolean>

let refreshHandler: RefreshHandler | null = null
let refreshing: Promise<boolean> | null = null

export function setRefreshHandler(handler: RefreshHandler | null) {
  refreshHandler = handler
}

/** Single-flight: banyak request yang butuh refresh bersamaan hanya memicu satu `POST /auth/refresh`. */
function refreshAccessToken(): Promise<boolean> {
  if (!refreshHandler || !getRefreshToken()) return Promise.resolve(false)
  refreshing ??= refreshHandler()
    .catch(() => false)
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

const CODE_BY_STATUS: Record<number, ApiErrorCode> = {
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION',
}

/**
 * Pembungkus `fetch` tipis: base URL, Bearer token, JSON, pemetaan error, dan
 * konversi key otomatis (backend snake_case ↔ UI camelCase).
 */
export function createHttpClient(baseUrl: string) {
  const root = baseUrl.replace(/\/+$/, '')

  async function request<T>(method: string, path: string, opts: RequestOptions = {}, retried = false): Promise<T> {
    const url = new URL(`${root}${path}`, window.location.origin)
    for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v))

    const headers: Record<string, string> = { Accept: 'application/json' }
    if (root.includes('devtunnels.ms')) {
      headers['X-Tunnel-Skip-Anti-Phishing-Page'] = 'true'
    }
    // access token sudah (hampir) kedaluwarsa → refresh dulu sebelum request dikirim
    if (!opts.skipRefresh && !retried && getAuthToken() && isTokenExpired(getAuthToken())) await refreshAccessToken()
    const token = getAuthToken()
    if (token) headers.Authorization = `Bearer ${token}`
    if (opts.json !== undefined) headers['Content-Type'] = 'application/json'
    const body = opts.form ?? (opts.json !== undefined ? JSON.stringify(convertKeys(opts.json, toSnakeKey)) : undefined)

    let res: Response
    try {
      res = await fetch(url, { method, headers, body })
    } catch {
      throw new ApiError('NETWORK', 'Tidak dapat terhubung ke server. Periksa koneksi Anda.')
    }

    // server menolak access token (401) → refresh sekali lalu ulangi request
    if (res.status === 401 && token && !opts.skipRefresh && !retried && (await refreshAccessToken())) {
      return request<T>(method, path, opts, true)
    }

    if (!res.ok) {
      const error = (await res.json().catch(() => ({}))) as {
        message?: string
        error_message?: string
        errorMessage?: string
        code?: ApiErrorCode
        error_code?: ApiErrorCode | number
        field?: string
      }
      const message = error.error_message ?? error.message ?? error.errorMessage ?? res.statusText
      const code = (typeof error.code === 'string' ? error.code : undefined) ?? CODE_BY_STATUS[res.status] ?? 'UNKNOWN'
      throw new ApiError(code, message, {
        status: res.status,
        field: error.field,
      })
    }
    if (res.status === 204) return undefined as T
    const json = (await res.json().catch(() => undefined)) as unknown
    if (opts.withMeta) {
      const body = (json ?? {}) as { data?: unknown; meta?: unknown }
      return convertKeys({ data: body.data ?? [], meta: body.meta ?? {} }, toCamelKey) as T
    }
    return convertKeys(isEnvelope(json) ? json.data : json, toCamelKey) as T
  }

  return {
    get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
    /** GET list berpaginasi → `{ data, meta }`. */
    getPage: <T>(path: string, query?: Query) => request<Paginated<T>>('GET', path, { query, withMeta: true }),
    post: <T>(path: string, json?: unknown, opts?: Pick<RequestOptions, 'skipRefresh'>) =>
      request<T>('POST', path, { json: json ?? {}, ...opts }),
    postForm: <T>(path: string, form: FormData) => request<T>('POST', path, { form }),
    patch: <T>(path: string, json: unknown) => request<T>('PATCH', path, { json }),
    put: <T>(path: string, json: unknown) => request<T>('PUT', path, { json }),
    delete: <T>(path: string) => request<T>('DELETE', path),
  }
}
