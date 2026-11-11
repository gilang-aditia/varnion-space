import { createSlice } from '@reduxjs/toolkit'
import type { Permission } from '@/types/drive'
import type { RootState } from '../index'
import { fetchMe } from '../me/meActions'
import { loggedOut, login, loginErrorCleared, restoreSession } from './authActions'
import type { AuthSession, AuthState } from './authTypes'

export const initialAuthState: AuthState = {
  session: null,
  status: 'anonymous',
  loginStatus: 'idle',
  error: null,
  roles: [],
  permissions: [],
}

/** State awal dari sesi tersimpan (dipakai `preloadedState` di store). */
export const authStateFromSession = (session: AuthSession | null): AuthState => ({
  ...initialAuthState,
  session,
  status: session ? 'restoring' : 'anonymous',
})

const authSlice = createSlice({
  name: 'auth',
  initialState: initialAuthState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // login
      .addCase(login.pending, (state) => {
        state.loginStatus = 'pending'
        state.error = null
      })
      .addCase(login.fulfilled, (state, { payload }) => {
        state.session = payload.session
        state.roles = payload.roles
        state.permissions = payload.permissions
        state.status = 'ready'
        state.loginStatus = 'succeeded'
      })
      .addCase(login.rejected, (state, { payload, error }) => {
        state.loginStatus = 'failed'
        state.error = payload ?? { code: 'UNKNOWN', status: 500, message: error.message ?? 'Gagal masuk.' }
      })
      .addCase(loginErrorCleared, (state) => {
        state.error = null
        if (state.loginStatus === 'failed') state.loginStatus = 'idle'
      })

      // restore sesi
      .addCase(restoreSession.pending, (state) => {
        state.status = 'restoring'
      })
      .addCase(restoreSession.fulfilled, (state, { payload }) => {
        state.roles = payload.roles
        state.permissions = payload.permissions
        state.status = 'ready'
      })
      .addCase(restoreSession.rejected, (state) => {
        // 401 sudah memicu `loggedOut` (status → anonymous); selain itu tampilkan "Coba lagi"
        if (state.session) state.status = 'error'
      })

      // GET /auth/me → roles/permissions terbaru
      .addCase(fetchMe.fulfilled, (state, { payload }) => {
        state.roles = payload.roles
        state.permissions = payload.permissions
      })

      // logout / sesi berakhir
      .addCase(loggedOut, () => initialAuthState)
  },
})

export default authSlice.reducer

/* -------------------------------- Selectors ------------------------------- */

export const selectAuth = (s: RootState) => s.auth
export const selectAuthStatus = (s: RootState) => s.auth.status
export const selectSession = (s: RootState) => s.auth.session
export const selectIsAuthenticated = (s: RootState) => !!s.auth.session
export const selectLoginPending = (s: RootState) => s.auth.loginStatus === 'pending'
export const selectLoginError = (s: RootState) => s.auth.error
export const selectRoles = (s: RootState) => s.auth.roles
export const selectPermissions = (s: RootState) => s.auth.permissions

/** `useAppSelector(selectHasPermission('file.upload'))` */
export const selectHasPermission = (permission: Permission) => (s: RootState) =>
  s.auth.permissions.includes(permission)

/** `useAppSelector(selectHasRole('admin'))` */
export const selectHasRole = (role: string) => (s: RootState) => s.auth.roles.includes(role)
