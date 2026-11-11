import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { StoredSession } from '@/store/storage'

/**
 * - `anonymous` → belum login (tampilkan halaman login)
 * - `restoring` → ada sesi tersimpan, sedang memuat data awal
 * - `error`     → gagal memuat data awal (mis. jaringan), bisa dicoba lagi
 * - `ready`     → data siap, tampilkan aplikasi
 */
export type AuthStatus = 'anonymous' | 'restoring' | 'error' | 'ready'

export interface AuthState {
  session: StoredSession | null
  status: AuthStatus
}

const initialState: AuthState = { session: null, status: 'anonymous' }

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionStarted(state, action: PayloadAction<StoredSession>) {
      state.session = action.payload
      state.status = 'ready'
    },
    statusChanged(state, action: PayloadAction<AuthStatus>) {
      state.status = action.payload
    },
    loggedOut(state) {
      state.session = null
      state.status = 'anonymous'
    },
  },
})

export const authActions = authSlice.actions
export default authSlice.reducer
