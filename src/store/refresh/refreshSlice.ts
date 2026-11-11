import { createSlice } from '@reduxjs/toolkit'
import type { RootState } from '../index'
import { loggedOut } from '../auth/authActions'
import { refreshAccessToken } from './refreshActions'
import type { RefreshState } from './refreshTypes'

export const initialRefreshState: RefreshState = {
  status: 'idle',
  lastRefreshedAt: null,
  expiresIn: null,
  error: null,
}

const refreshSlice = createSlice({
  name: 'refresh',
  initialState: initialRefreshState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(refreshAccessToken.pending, (state) => {
        state.status = 'pending'
        state.error = null
      })
      .addCase(refreshAccessToken.fulfilled, (state, { payload }) => {
        state.status = 'succeeded'
        state.lastRefreshedAt = new Date().toISOString()
        state.expiresIn = payload.expiresIn
      })
      .addCase(refreshAccessToken.rejected, (state, { payload, error }) => {
        state.status = 'failed'
        state.error = payload ?? { code: 'UNKNOWN', status: 500, message: error.message ?? 'Gagal memperbarui sesi.' }
      })
      // `fulfilled`/`rejected` di atas tetap diproses setelah reset ini (urutan dispatch)
      .addCase(loggedOut, () => initialRefreshState)
  },
})

export default refreshSlice.reducer

/* -------------------------------- Selectors ------------------------------- */

export const selectRefreshStatus = (s: RootState) => s.refresh.status
export const selectRefreshPending = (s: RootState) => s.refresh.status === 'pending'
export const selectRefreshError = (s: RootState) => s.refresh.error
export const selectLastRefreshedAt = (s: RootState) => s.refresh.lastRefreshedAt
