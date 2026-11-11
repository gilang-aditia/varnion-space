import { ApiError, type ApiErrorCode } from '../contract'
import { getAuthToken } from '../token'

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

  async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
    const url = new URL(`${root}${path}`, window.location.origin)
    for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v))

    const headers: Record<string, string> = { Accept: 'application/json' }
    if (root.includes('devtunnels.ms')) {
      headers['X-Tunnel-Skip-Anti-Phishing-Page'] = 'true'
    }
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

    if (!res.ok) {
      const error = (await res.json().catch(() => ({}))) as { message?: string; code?: ApiErrorCode; field?: string }
      throw new ApiError(error.code ?? CODE_BY_STATUS[res.status] ?? 'UNKNOWN', error.message ?? res.statusText, {
        status: res.status,
        field: error.field,
      })
    }
    if (res.status === 204) return undefined as T
    return convertKeys(await res.json(), toCamelKey) as T
  }

  return {
    get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
    post: <T>(path: string, json?: unknown) => request<T>('POST', path, { json: json ?? {} }),
    postForm: <T>(path: string, form: FormData) => request<T>('POST', path, { form }),
    patch: <T>(path: string, json: unknown) => request<T>('PATCH', path, { json }),
    put: <T>(path: string, json: unknown) => request<T>('PUT', path, { json }),
    delete: <T>(path: string) => request<T>('DELETE', path),
  }
}
