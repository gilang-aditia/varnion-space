/**
 * Action daftar pengguna.
 *
 * - Async thunk: `fetchUserList` → GET /users?page=&per_page=&search=&status=&role=
 */
import { createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '@/api'
import type { Paginated } from '@/types/rbac'
import type { UserDto } from '@/types/user'
import { handleApiError, type ThunkConfig } from '../thunks/helpers'
import { resolvePageQuery, type PagedPendingMeta } from '../paged'
import type { UserListQuery, UserListQueryArgs } from './userListTypes'

export const fetchUserList = createAsyncThunk<
  Paginated<UserDto>,
  UserListQueryArgs | void,
  ThunkConfig & { pendingMeta: PagedPendingMeta<UserListQuery> }
>(
  'userList/fetchUserList',
  async (args, { getState, dispatch, rejectWithValue }) => {
    try {
      return await api.listUsersPaged(resolvePageQuery(getState().userList.query, args))
    } catch (error) {
      return rejectWithValue(handleApiError(dispatch, error, 'Gagal memuat daftar pengguna'))
    }
  },
  { getPendingMeta: ({ arg }, { getState }) => ({ query: resolvePageQuery(getState().userList.query, arg) }) },
)
