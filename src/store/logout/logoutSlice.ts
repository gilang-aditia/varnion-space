import { createSlice } from '@reduxjs/toolkit'
import type { RootState } from '../index'
import { login } from '../auth/authActions'
import { logout } from './logoutActions'
import type { LogoutState } from './logoutTypes'

export const initialLogoutState: LogoutState = {
  status: 'idle',
  message: null,
  error: null,
}

const logoutSlice = createSlice({
  name: 'logout',
  initialState: initialLogoutState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(logout.pending, (state) => {
        state.status = 'pending'
        state.error = null
      })
      .addCase(logout.fulfilled, (state, { payload }) => {
        state.status = 'succeeded'
        state.message = payload
      })
      .addCase(logout.rejected, (state, { payload, error }) => {
        state.status = 'failed'
        state.error = payload ?? { code: 'UNKNOWN', status: 500, message: error.message ?? 'Gagal keluar.' }
      })
      // login berikutnya → mulai dari awal
      .addCase(login.fulfilled, () => initialLogoutState)
  },
})

export default logoutSlice.reducer

/* -------------------------------- Selectors ------------------------------- */

export const selectLogoutStatus = (s: RootState) => s.logout.status
export const selectLogoutPending = (s: RootState) => s.logout.status === 'pending'
export const selectLogoutError = (s: RootState) => s.logout.error
