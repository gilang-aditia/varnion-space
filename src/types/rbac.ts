/**
 * Tipe DTO endpoint RBAC backend (sesuai Swagger).
 *
 * Key ditulis dalam camelCase karena http client otomatis mengonversi
 * snake_case ↔ camelCase (mis. `is_system` → `isSystem`).
 */

/** Item `GET /rbac/permissions` (juga dipakai di `permissions` milik role). */
export interface RbacPermissionDto {
  id: string
  /** Kode izin, mis. `file.upload` (sama dengan isi `permissions` di JWT). */
  code: string
  name: string
  description: string
  resource: string
  action: string
  createdAt: string
}

/** Item `GET /rbac/roles`. */
export interface RbacRoleDto {
  id: string
  code: string
  name: string
  description: string
  isSystem: boolean
  createdAt: string
  permissions: RbacPermissionDto[]
}

/** `meta` pada respons list berpaginasi. */
export interface PageMeta {
  total: number
  page: number
  perPage: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
  /** Hanya dikirim bila request memakai `search`. */
  searchQuery?: string
}

/** Respons list berpaginasi: `{ status, success_code, data: T[], meta }`. */
export interface Paginated<T> {
  data: T[]
  meta: PageMeta
}

/** Query list berpaginasi: `?page=&per_page=&search=`. */
export interface PageQuery {
  /** Default 1. */
  page: number
  /** Default 20, maks 100. */
  perPage: number
  /** Roles: nama/deskripsi. Permissions: action/resource. */
  search: string
}
