import { createSlice, type ActionReducerMapBuilder, type AsyncThunk, type Draft } from '@reduxjs/toolkit'
import type { RootState } from '../index'
import { loggedOut } from '../auth/authActions'
import type { SerializedApiError } from '@/api'
import { addPagedCases, DEFAULT_PAGE_QUERY, emptyPagedList } from '../paged'
import { fetchPermissionCatalog, fetchPermissions, fetchRoleCatalog, fetchRoles } from './rbacActions'
import type { CatalogState, RbacState } from './rbacTypes'

const emptyCatalog = <T>(): CatalogState<T> => ({ items: [], status: 'idle', error: null })

export const initialRbacState: RbacState = {
  roles: emptyPagedList(DEFAULT_PAGE_QUERY),
  permissions: emptyPagedList(DEFAULT_PAGE_QUERY),
  catalog: emptyCatalog(),
  roleCatalog: emptyCatalog(),
}

/** Reducer pending/fulfilled/rejected untuk katalog (semua halaman). */
function addCatalogCases<T>(
  builder: ActionReducerMapBuilder<RbacState>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  thunk: AsyncThunk<T[], any, { rejectValue: SerializedApiError }>,
  pick: (state: Draft<RbacState>) => Draft<CatalogState<T>>,
) {
  builder
    .addCase(thunk.pending, (state) => {
      pick(state).status = 'loading'
      pick(state).error = null
    })
    .addCase(thunk.fulfilled, (state, { payload }) => {
      pick(state).status = 'succeeded'
      pick(state).items = payload as Draft<T>[]
    })
    .addCase(thunk.rejected, (state, { payload, error }) => {
      pick(state).status = 'failed'
      pick(state).error = payload ?? { code: 'UNKNOWN', status: 500, message: error.message ?? 'Gagal memuat data.' }
    })
}

const rbacSlice = createSlice({
  name: 'rbac',
  initialState: initialRbacState,
  reducers: {},
  extraReducers: (builder) => {
    addPagedCases(builder, fetchRoles, (s) => s.roles)
    addPagedCases(builder, fetchPermissions, (s) => s.permissions)
    addCatalogCases(builder, fetchPermissionCatalog, (s) => s.catalog)
    addCatalogCases(builder, fetchRoleCatalog, (s) => s.roleCatalog)
    builder.addCase(loggedOut, () => initialRbacState)
  },
})

export default rbacSlice.reducer

/* -------------------------------- Selectors ------------------------------- */

export const selectRolesList = (s: RootState) => s.rbac.roles
export const selectPermissionsList = (s: RootState) => s.rbac.permissions
export const selectPermissionCatalog = (s: RootState) => s.rbac.catalog
export const selectRoleCatalog = (s: RootState) => s.rbac.roleCatalog
