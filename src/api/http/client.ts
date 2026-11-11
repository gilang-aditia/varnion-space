import { ApiError, type ApiErrorCode } from '../contract'
import { getAuthToken } from '../token'

type Query = Record<string, string | number | undefined>

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

/** Pembungkus `fetch` tipis: base URL, Bearer token, JSON, dan pemetaan error. */
export function createHttpClient(baseUrl: string) {
  const root = baseUrl.replace(/\/+$/, '')

  async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
    const url = new URL(`${root}${path}`, window.location.origin)
    for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v))

    const headers: Record<string, string> = { Accept: 'application/json' }
    const token = getAuthToken()
    if (token) headers.Authorization = `Bearer ${token}`
    if (opts.json !== undefined) headers['Content-Type'] = 'application/json'

    let res: Response
    try {
      res = await fetch(url, {
        method,
        headers,
        body: opts.form ?? (opts.json !== undefined ? JSON.stringify(opts.json) : undefined),
      })
    } catch {
      throw new ApiError('NETWORK', 'Tidak dapat terhubung ke server. Periksa koneksi Anda.')
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string; code?: ApiErrorCode; field?: string }
      throw new ApiError(body.code ?? CODE_BY_STATUS[res.status] ?? 'UNKNOWN', body.message ?? res.statusText, {
        status: res.status,
        field: body.field,
      })
    }
    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  }

  return {
    get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
    post: <T>(path: string, json?: unknown) => request<T>('POST', path, { json: json ?? {} }),
    postForm: <T>(path: string, form: FormData) => request<T>('POST', path, { form }),
    patch: <T>(path: string, json: unknown) => request<T>('PATCH', path, { json }),
    delete: <T>(path: string) => request<T>('DELETE', path),
  }
}
