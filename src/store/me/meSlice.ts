import { createSlice } from '@reduxjs/toolkit'
import type { RootState } from '../index'
import { loggedOut } from '../auth/authActions'
import { fetchMe } from './meActions'
import type { MeState } from './meTypes'

export const initialMeState: MeState = {
  data: null,
  status: 'idle',
  error: null,
}

const meSlice = createSlice({
  name: 'me',
  initialState: initialMeState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMe.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchMe.fulfilled, (state, { payload }) => {
        state.data = payload
        state.status = 'succeeded'
      })
      .addCase(fetchMe.rejected, (state, { payload, error }) => {
        state.status = 'failed'
        state.error = payload ?? { code: 'UNKNOWN', status: 500, message: error.message ?? 'Gagal memuat profil.' }
      })
      .addCase(loggedOut, () => initialMeState)
  },
})

export default meSlice.reducer

/* -------------------------------- Selectors ------------------------------- */

export const selectMe = (s: RootState) => s.me.data
export const selectMeStatus = (s: RootState) => s.me.status
export const selectMeError = (s: RootState) => s.me.error
export const selectMeDisplayName = (s: RootState) => s.me.data?.displayName ?? ''
