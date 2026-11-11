/**
 * Tipe state Redux untuk RBAC (`GET /rbac/roles`, `GET /rbac/permissions`).
 * DTO mentah dari backend ada di `@/types/rbac`.
 */
import type { SerializedApiError } from '@/api'
import type { PageMeta, PageQuery, RbacPermissionDto, RbacRoleDto } from '@/types/rbac'
import type { ListStatus, PagedListState } from '../paged'

export type { PageMeta, PageQuery, PagedListState, RbacPermissionDto, RbacRoleDto }

/** Status request list. */
export type RbacListStatus = ListStatus

/** Katalog lengkap (semua halaman) — mis. sumbu matriks hak akses / pilihan filter peran. */
export interface CatalogState<T> {
  items: T[]
  status: RbacListStatus
  error: SerializedApiError | null
}

export interface RbacState {
  roles: PagedListState<RbacRoleDto>
  permissions: PagedListState<RbacPermissionDto>
  /** Semua izin — sumbu matriks hak akses. */
  catalog: CatalogState<RbacPermissionDto>
  /** Semua peran — pilihan filter peran di daftar pengguna. */
  roleCatalog: CatalogState<RbacRoleDto>
}

/** Argumen `fetchRoles` / `fetchPermissions` — bagian yang tidak diisi memakai query terakhir. */
export type PageQueryArgs = Partial<PageQuery>
