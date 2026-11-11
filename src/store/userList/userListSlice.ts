import { createSlice } from '@reduxjs/toolkit'
import type { RootState } from '../index'
import { loggedOut } from '../auth/authActions'
import { addPagedCases, DEFAULT_PAGE_QUERY, emptyPagedList } from '../paged'
import { fetchUserList } from './userListActions'
import type { UserDto, UserListQuery, UserListState } from './userListTypes'

const DEFAULT_QUERY: UserListQuery = { ...DEFAULT_PAGE_QUERY, status: '', role: '' }

export const initialUserListState: UserListState = emptyPagedList<UserDto, UserListQuery>(DEFAULT_QUERY)

const userListSlice = createSlice({
  name: 'userList',
  initialState: initialUserListState,
  reducers: {},
  extraReducers: (builder) => {
    addPagedCases(builder, fetchUserList, (s) => s)
    builder.addCase(loggedOut, () => initialUserListState)
  },
})

export default userListSlice.reducer

/* -------------------------------- Selectors ------------------------------- */

export const selectUserList = (s: RootState) => s.userList
