import { configureStore, type ThunkAction, type UnknownAction } from '@reduxjs/toolkit'
import { setAuthToken } from '@/api'
import authReducer, { type AuthState } from './slices/authSlice'
import usersReducer from './slices/usersSlice'
import driveReducer from './slices/driveSlice'
import activityReducer from './slices/activitySlice'
import uiReducer, { type UiState } from './slices/uiSlice'
import { loadPrefs, loadSession, savePrefs, saveSession } from './storage'

/* ------------------------------ preload state ----------------------------- */

const session = loadSession()
setAuthToken(session?.token ?? null)

const prefs = loadPrefs()

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
    drive: driveReducer,
    activity: activityReducer,
    ui: uiReducer,
  },
  preloadedState: {
    // Sesi tersimpan dipulihkan lewat `restoreSession()` saat App mount.
    auth: { session, status: session ? 'restoring' : 'anonymous' } satisfies AuthState,
    ui: {
      ...uiReducer(undefined, { type: '@@init' }),
      viewMode: prefs.viewMode ?? 'grid',
      theme: prefs.theme ?? 'system',
      detailsOpen: prefs.detailsOpen ?? false,
    } satisfies UiState,
  },
})

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
