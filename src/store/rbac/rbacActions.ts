/**
 * Action RBAC.
 *
 * - Async thunk: `fetchRoles`             → GET /rbac/roles?page=&per_page=&search=
 * - Async thunk: `fetchPermissions`       → GET /rbac/permissions?page=&per_page=&search=
 * - Async thunk: `fetchPermissionCatalog` → GET /rbac/permissions (semua halaman, per_page=100)
 * - Async thunk: `fetchRoleCatalog`       → GET /rbac/roles (semua halaman, per_page=100)
 */
import { createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '@/api'
import type { PageQuery, Paginated, RbacPermissionDto, RbacRoleDto } from '@/types/rbac'
import { handleApiError, type ThunkConfig } from '../thunks/helpers'
import { MAX_PER_PAGE, resolvePageQuery, type PagedPendingMeta } from '../paged'
import type { PageQueryArgs } from './rbacTypes'

export { MAX_PER_PAGE }

type PagedConfig = ThunkConfig & { pendingMeta: PagedPendingMeta }

export const fetchRoles = createAsyncThunk<Paginated<RbacRoleDto>, PageQueryArgs | void, PagedConfig>(
  'rbac/fetchRoles',
  async (args, { getState, dispatch, rejectWithValue }) => {
    try {
      return await api.listRoles(resolvePageQuery(getState().rbac.roles.query, args))
    } catch (error) {
      return rejectWithValue(handleApiError(dispatch, error, 'Gagal memuat daftar peran'))
    }
  },
  { getPendingMeta: ({ arg }, { getState }) => ({ query: resolvePageQuery(getState().rbac.roles.query, arg) }) },
)

export const fetchPermissions = createAsyncThunk<Paginated<RbacPermissionDto>, PageQueryArgs | void, PagedConfig>(
  'rbac/fetchPermissions',
  async (args, { getState, dispatch, rejectWithValue }) => {
    try {
      return await api.listPermissions(resolvePageQuery(getState().rbac.permissions.query, args))
    } catch (error) {
      return rejectWithValue(handleApiError(dispatch, error, 'Gagal memuat daftar izin'))
    }
  },
  {
    getPendingMeta: ({ arg }, { getState }) => ({ query: resolvePageQuery(getState().rbac.permissions.query, arg) }),
  },
)

/** Ambil semua halaman (mengikuti `has_next`). */
async function fetchAll<T>(list: (q: PageQuery) => Promise<Paginated<T>>): Promise<T[]> {
  const all: T[] = []
  for (let page = 1; ; page++) {
    const res = await list({ page, perPage: MAX_PER_PAGE, search: '' })
    all.push(...res.data)
    if (!res.meta.hasNext) return all
  }
}

/** Semua izin — sumbu baris/kolom matriks hak akses. */
export const fetchPermissionCatalog = createAsyncThunk<RbacPermissionDto[], void, ThunkConfig>(
  'rbac/fetchPermissionCatalog',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      return await fetchAll(api.listPermissions)
    } catch (error) {
      return rejectWithValue(handleApiError(dispatch, error, 'Gagal memuat daftar izin'))
    }
  },
)

/** Semua peran — pilihan filter peran di daftar pengguna. */
export const fetchRoleCatalog = createAsyncThunk<RbacRoleDto[], void, ThunkConfig>(
  'rbac/fetchRoleCatalog',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      return await fetchAll(api.listRoles)
    } catch (error) {
      return rejectWithValue(handleApiError(dispatch, error, 'Gagal memuat daftar peran'))
    }
  },
)
