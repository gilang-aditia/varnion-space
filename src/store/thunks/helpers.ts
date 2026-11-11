import { createAsyncThunk } from '@reduxjs/toolkit'
import { setAuthToken, toSerializedError, type SerializedApiError } from '@/api'
import type { AppDispatch, RootState } from '../index'
import { authActions } from '../slices/authSlice'
import { uiActions, type Toast } from '../slices/uiSlice'
import { syncActivity } from './activity'

export interface ThunkConfig {
  state: RootState
  dispatch: AppDispatch
  rejectValue: SerializedApiError
}

export const nowIso = () => new Date().toISOString()

export function notify(dispatch: AppDispatch, title: string, tone: Toast['tone'] = 'success', description?: string) {
  dispatch(uiActions.toastAdded({ title, tone, description }))
}

/** Akhiri sesi di sisi client (logout, token kedaluwarsa, akun dinonaktifkan). */
export function endSession(dispatch: AppDispatch, reason?: string) {
  setAuthToken(null)
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
  dispatch(authActions.loggedOut())
  if (reason) notify(dispatch, 'Sesi berakhir', 'info', reason)
}

/**
 * Penanganan error API yang seragam:
 * - 401 → sesi berakhir, kembali ke halaman login
 * - error per field (validasi form) → TIDAK di-toast; form menampilkannya
 * - lainnya → toast error
 */
export function handleApiError(dispatch: AppDispatch, error: unknown, title: string): SerializedApiError {
  const err = toSerializedError(error)
  if (err.status === 401) endSession(dispatch, err.message)
  else if (!err.field) notify(dispatch, title, 'error', err.message)
  return err
}

/**
 * Pabrik thunk untuk aksi yang mengubah data.
 * `run` memanggil API & menyimpan hasilnya ke cache; setelah berhasil log
 * aktivitas disinkronkan. Pemanggil dapat `await dispatch(x(arg)).unwrap()`.
 */
export function createMutation<Result, Arg = void>(
  typePrefix: string,
  errorTitle: string,
  run: (arg: Arg, ctx: { dispatch: AppDispatch; getState: () => RootState }) => Promise<Result>,
) {
  return createAsyncThunk<Result, Arg, ThunkConfig>(typePrefix, async (arg, { dispatch, getState, rejectWithValue }) => {
    try {
      const result = await run(arg, { dispatch, getState })
      void dispatch(syncActivity())
      return result
    } catch (error) {
      return rejectWithValue(handleApiError(dispatch, error, errorTitle))
    }
  })
}
