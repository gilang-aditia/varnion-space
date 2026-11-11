/**
 * Bagian bersama untuk list berpaginasi backend (`?page=&per_page=&search=` → `{ data, meta }`).
 * Dipakai oleh `rbac` (roles, permissions) dan `userList` (users).
 */
import type { ActionReducerMapBuilder, AsyncThunk, Draft } from '@reduxjs/toolkit'
import type { SerializedApiError } from '@/api'
import type { PageMeta, PageQuery, Paginated } from '@/types/rbac'

/** Status request list. */
export type ListStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

/** State satu list berpaginasi + query terakhir yang diminta. */
export interface PagedListState<T, Q extends PageQuery = PageQuery> {
  items: T[]
  meta: PageMeta | null
  /** Query request terakhir. */
  query: Q
  status: ListStatus
  error: SerializedApiError | null
  /** `requestId` thunk terakhir — respons lama (mis. hasil ketikan sebelumnya) diabaikan. */
  requestId: string | null
}

/** `meta` tambahan pada action `pending`: query efektif request tersebut. */
export interface PagedPendingMeta<Q extends PageQuery = PageQuery> {
  query: Q
}

/** Batas `per_page` dari backend. */
export const MAX_PER_PAGE = 100

/** Default backend: page 1, per_page 20. */
export const DEFAULT_PAGE_QUERY: PageQuery = { page: 1, perPage: 20, search: '' }

/** Gabungkan argumen dengan query terakhir, lalu rapikan (page ≥ 1, 1 ≤ per_page ≤ 100). */
export function resolvePageQuery<Q extends PageQuery>(last: Q, args: Partial<Q> | void): Q {
  const q = { ...last, ...args }
  return {
    ...q,
    page: Math.max(1, Math.floor(q.page)),
    perPage: Math.min(MAX_PER_PAGE, Math.max(1, Math.floor(q.perPage))),
  }
}

export function emptyPagedList<T, Q extends PageQuery = PageQuery>(query: Q): PagedListState<T, Q> {
  return { items: [], meta: null, query, status: 'idle', error: null, requestId: null }
}

/* ------------------------------ reducer bersama ----------------------------- */

/** Thunk list berpaginasi: hasil `{ data, meta }`, `meta.query` pada action pending. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PagedThunk<T, Q extends PageQuery> = AsyncThunk<Paginated<T>, any, {
  rejectValue: SerializedApiError
  pendingMeta: PagedPendingMeta<Q>
}>

/**
 * Tambahkan reducer pending/fulfilled/rejected untuk satu list berpaginasi.
 * `pick` memilih list di dalam state slice (draft Immer).
 */
export function addPagedCases<S, T, Q extends PageQuery>(
  builder: ActionReducerMapBuilder<S>,
  thunk: PagedThunk<T, Q>,
  pick: (state: Draft<S>) => Draft<PagedListState<T, Q>>,
) {
  builder
    .addCase(thunk.pending, (state, { meta }) => {
      const list = pick(state)
      list.status = 'loading'
      list.error = null
      list.query = meta.query as Draft<Q>
      list.requestId = meta.requestId
    })
    .addCase(thunk.fulfilled, (state, { payload, meta }) => {
      const list = pick(state)
      if (list.requestId !== meta.requestId) return // respons usang
      list.status = 'succeeded'
      list.items = payload.data as Draft<T>[]
      list.meta = payload.meta
    })
    .addCase(thunk.rejected, (state, { payload, error, meta }) => {
      const list = pick(state)
      if (list.requestId !== meta.requestId) return
      list.status = 'failed'
      list.error = payload ?? { code: 'UNKNOWN', status: 500, message: error.message ?? 'Gagal memuat data.' }
    })
}
