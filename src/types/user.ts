/**
 * Tipe DTO endpoint `GET /users` (sesuai Swagger).
 *
 * Key ditulis dalam camelCase karena http client otomatis mengonversi
 * snake_case ↔ camelCase (mis. `display_name` → `displayName`).
 */
import type { RoleDto } from './auth'
import type { Permission } from './drive'
import type { PageQuery } from './rbac'

/** Item `GET /users`. `roles` & `permissions` tidak dikirim bila user belum punya peran. */
export interface UserDto {
  id: string
  email: string
  displayName: string
  status: 'active' | 'inactive' | 'suspended' | (string & {})
  createdAt: string
  roles?: RoleDto[]
  permissions?: Permission[]
}

/**
 * Query `GET /users?page=&per_page=&search=&status=&role=`.
 * String kosong = tanpa filter (tidak dikirim ke backend).
 */
export interface UserListQuery extends PageQuery {
  /** Cari berdasarkan email atau display name. */
  search: string
  /** Mis. `active`, `inactive`, `suspended`. */
  status: string
  /** Kode peran, mis. `super_admin`, `admin`, `viewer`. */
  role: string
}
