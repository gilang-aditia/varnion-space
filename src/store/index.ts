import { configureStore, type ThunkAction, type UnknownAction } from '@reduxjs/toolkit'
import { clearAuthTokens, getAuthTokens, setRefreshHandler } from '@/api'
import { isTokenExpired } from '@/lib/jwt'
import authReducer, { authStateFromSession } from './auth/authSlice'
import meReducer from './me/meSlice'
import logoutReducer from './logout/logoutSlice'
import refreshReducer from './refresh/refreshSlice'
import rbacReducer from './rbac/rbacSlice'
import userListReducer from './userList/userListSlice'
import { refreshAccessToken } from './refresh/refreshActions'
import usersReducer from './slices/usersSlice'
import driveReducer from './slices/driveSlice'
import activityReducer from './slices/activitySlice'
import uiReducer, { type UiState } from './slices/uiSlice'
import { loadPrefs, loadSession, savePrefs, saveSession } from './storage'

/* ------------------------------ preload state ----------------------------- */

/** Sesi dipulihkan hanya bila token masih ada & (access atau refresh token) belum kedaluwarsa. */
function initialSession() {
  const stored = loadSession()
  const tokens = getAuthTokens()
  const usable = !!tokens && (!isTokenExpired(tokens.accessToken, 0) || !isTokenExpired(tokens.refreshToken, 0))
  if (stored && usable) return stored
  if (tokens) clearAuthTokens()
  if (stored) saveSession(null)
  return null
}

const session = initialSession()

const prefs = loadPrefs()

export const store = configureStore({
  reducer: {
    auth: authReducer,
    me: meReducer,
    logout: logoutReducer,
    refresh: refreshReducer,
    rbac: rbacReducer,
    userList: userListReducer,
    users: usersReducer,
    drive: driveReducer,
    activity: activityReducer,
    ui: uiReducer,
  },
  preloadedState: {
    // Sesi tersimpan dipulihkan lewat `restoreSession()` saat App mount.
    auth: authStateFromSession(session),
    ui: {
      ...uiReducer(undefined, { type: '@@init' }),
      viewMode: prefs.viewMode ?? 'grid',
      theme: prefs.theme ?? 'system',
      detailsOpen: prefs.detailsOpen ?? false,
    } satisfies UiState,
  },
})

/* ------------------------------ refresh token ----------------------------- */

// http client memanggil ini saat access token kedaluwarsa / dibalas 401
setRefreshHandler(async () => refreshAccessToken.fulfilled.match(await store.dispatch(refreshAccessToken())))

/* ------------------------------ persistence ------------------------------ */

let prev = store.getState()
store.subscribe(() => {
  const next = store.getState()
  if (next.auth.session !== prev.auth.session) saveSession(next.auth.session)
  if (
    next.ui.viewMode !== prev.ui.viewMode ||
    next.ui.theme !== prev.ui.theme ||
    next.ui.detailsOpen !== prev.ui.detailsOpen
  ) {
    savePrefs({ viewMode: next.ui.viewMode, theme: next.ui.theme, detailsOpen: next.ui.detailsOpen })
  }
  prev = next
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export type AppStore = typeof store
export type AppThunk<R = void> = ThunkAction<R, RootState, undefined, UnknownAction>
