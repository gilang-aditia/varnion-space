/**
 * Tipe state Redux untuk daftar pengguna berpaginasi (`GET /users`).
 * DTO mentah dari backend: `UserDto` / `UserListQuery` di `@/types/user`.
 */
import type { UserDto, UserListQuery } from '@/types/user'
import type { PagedListState } from '../paged'

export type { UserDto, UserListQuery }

export type UserListState = PagedListState<UserDto, UserListQuery>

/** Argumen `fetchUserList` — bagian yang tidak diisi memakai query terakhir. */
export type UserListQueryArgs = Partial<UserListQuery>
