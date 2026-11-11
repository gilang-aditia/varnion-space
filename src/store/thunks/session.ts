import { createAsyncThunk } from '@reduxjs/toolkit'
import { api, setAuthToken, toSerializedError } from '@/api'
import { describeDevice } from '@/lib/device'
import type { AppDispatch, AppThunk } from '../index'
import { activityActions } from '../slices/activitySlice'
import { authActions } from '../slices/authSlice'
import { driveActions } from '../slices/driveSlice'
import { usersActions } from '../slices/usersSlice'
import { saveRememberedIdentifier } from '../storage'
import { endSession, handleApiError, notify, nowIso, type ThunkConfig } from './helpers'
import { navigate, syncRouteFromUrl } from './navigation'

/** Muat data awal setelah login / saat sesi dipulihkan. */
async function loadInitialData(dispatch: AppDispatch) {
  const [me, users, nodes, logs] = await Promise.all([
    api.getMe(),
    api.listUsers(),
    api.listNodes(),
    api.listActivity(),
  ])
  dispatch(usersActions.received(users))
  dispatch(usersActions.upserted(me))
  dispatch(driveActions.received(nodes))
  dispatch(activityActions.received(logs))
}

export interface LoginArgs {
  identifier: string
  password: string
  remember: boolean
}

/** Login. Gagal → reject dengan error (field `identifier`/`password`) untuk ditampilkan di form. */
export const login = createAsyncThunk<void, LoginArgs, ThunkConfig>(
  'session/login',
  async ({ identifier, password, remember }, { dispatch, rejectWithValue }) => {
    const device = describeDevice()
    try {
      const { token, user } = await api.login({ identifier: identifier.trim(), password, device })
      setAuthToken(token)
      await loadInitialData(dispatch)
      saveRememberedIdentifier(remember ? identifier.trim() : null)
      window.history.replaceState(null, '', '#/')
      dispatch(authActions.sessionStarted({ token, userId: user.id, remember, startedAt: nowIso(), device }))
    } catch (error) {
      setAuthToken(null)
      return rejectWithValue(toSerializedError(error))
    }
  },
)

/** Pulihkan sesi tersimpan (token di storage) saat aplikasi dibuka. */
export const restoreSession = (): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch(authActions.statusChanged('restoring'))
  try {
    await loadInitialData(dispatch)
    // route dari URL diterapkan SEBELUM aplikasi tampil → tidak ada "lompatan"/animasi saat reload
    dispatch(syncRouteFromUrl())
    dispatch(authActions.statusChanged('ready'))
  } catch (error) {
    const err = toSerializedError(error)
    if (err.status === 401) endSession(dispatch, 'Silakan masuk kembali.')
    else dispatch(authActions.statusChanged('error'))
  }
}

export const logout = (): AppThunk<Promise<void>> => async (dispatch) => {
  try {
    await api.logout()
  } catch {
    /* tetap keluar di sisi client walau server tidak terjangkau */
  }
  endSession(dispatch)
}

/** Khusus mode mock: kembalikan data contoh ke kondisi awal. */
export const resetDemoData = (): AppThunk<Promise<void>> => async (dispatch) => {
  if (!api.resetDemo) return
  try {
    await api.resetDemo()
    await loadInitialData(dispatch)
    dispatch(navigate({ page: 'home' }, { replace: true }))
    notify(dispatch, 'Data demo dikembalikan ke kondisi awal', 'info')
  } catch (error) {
    handleApiError(dispatch, error, 'Gagal mereset data demo')
  }
}
