/**
 * Action autentikasi.
 *
 * - Action biasa (`createAction`) : `loggedOut`, `loginErrorCleared`
 * - Async thunk (`createAsyncThunk`): `login`, `restoreSession`
 *   (profil `GET /auth/me` → `fetchMe` di `../me`, logout → `../logout`)
 *
 * State-nya diubah oleh `authSlice` lewat `extraReducers` (pending/fulfilled/rejected).
 */
import { createAction, createAsyncThunk } from '@reduxjs/toolkit'
import { api, ApiError, clearAuthTokens, setAuthTokens, toSerializedError } from '@/api'
import { describeDevice } from '@/lib/device'
import { mapUser } from '@/api/http/user-mapper'
import type { MeDto } from '@/types/auth'
import type { AppDispatch } from '../index'
import { fetchMe } from '../me/meActions'
import { usersActions } from '../slices/usersSlice'
import { saveRememberedIdentifier } from '../storage'
import { endSession, notify, nowIso, type ThunkConfig } from '../thunks/helpers'
import { syncRouteFromUrl } from '../thunks/navigation'
import type { AuthAccess, CurrentUserResult, LoginArgs, LoginResult } from './authTypes'

/* ------------------------------ Action biasa ------------------------------ */

/** Sesi berakhir (logout / token kedaluwarsa). Semua slice mereset datanya. */
export const loggedOut = createAction('auth/loggedOut')

/** Hapus error login (mis. saat user mulai mengetik ulang). */
export const loginErrorCleared = createAction('auth/loginErrorCleared')

/* -------------------------------- Helpers -------------------------------- */

const accessOf = (me: MeDto): AuthAccess => ({ roles: me.roles, permissions: me.permissions })

/**
 * Endpoint yang belum diimplementasikan backend (404/405/501) dianggap kosong
 * agar login tetap berjalan. Error lain (401, jaringan, 500) tetap dilempar.
 */
async function optional<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise
  } catch (error) {
    if (error instanceof ApiError && [404, 405, 501].includes(error.status)) return fallback
    throw error
  }
}

/** Muat data awal setelah login / saat sesi dipulihkan: `GET /auth/me` + `GET /users`. */
async function loadInitialData(dispatch: AppDispatch): Promise<MeDto> {
  const [meResult, users] = await Promise.all([dispatch(fetchMe({ silent: true })), optional(api.listUsers(), [])])
  if (fetchMe.rejected.match(meResult)) {
    const err = meResult.payload
    throw err ? new ApiError(err.code, err.message, { status: err.status, field: err.field }) : meResult.error
  }
  const me = meResult.payload
  dispatch(usersActions.received(users))
  dispatch(usersActions.upserted(mapUser(me)))
  return me
}

/* ---------------------------------- Thunk --------------------------------- */

/**
 * POST /auth/login → simpan JWT di cookie → muat data awal.
 * Gagal → reject dengan `SerializedApiError` (field `email`/`password`) untuk form.
 */
export const login = createAsyncThunk<LoginResult, LoginArgs, ThunkConfig>(
  'auth/login',
  async ({ email, password, remember }, { dispatch, rejectWithValue }) => {
    const device = describeDevice()
    try {
      const { accessToken, refreshToken, user } = await api.login({ email: email.trim(), password, rememberMe: remember })
      // token disimpan di cookie (fallback localStorage) — dipakai otomatis oleh http client
      setAuthTokens({ accessToken, refreshToken, remember })
      dispatch(usersActions.upserted(user))
      const me = await loadInitialData(dispatch)
      saveRememberedIdentifier(remember ? email.trim() : null)
      window.history.replaceState(null, '', '#/')
      notify(dispatch, 'Berhasil masuk', 'success', `Selamat datang, ${me.displayName}.`)
      return {
        session: { userId: user.id, remember, startedAt: nowIso(), device },
        ...accessOf(me),
      }
    } catch (error) {
      clearAuthTokens()
      const err = toSerializedError(error)
      notify(dispatch, 'Gagal masuk', 'error', err.message)
      return rejectWithValue(err)
    }
  },
)

/** Pulihkan sesi tersimpan (token di cookie) saat aplikasi dibuka. 401 → kembali ke login. */
export const restoreSession = createAsyncThunk<CurrentUserResult, void, ThunkConfig>(
  'auth/restoreSession',
  async (_, { dispatch, getState, rejectWithValue }) => {
    try {
      const me = await loadInitialData(dispatch)
      // route dari URL diterapkan SEBELUM aplikasi tampil → tidak ada "lompatan"/animasi saat reload
      dispatch(syncRouteFromUrl())
      return accessOf(me)
    } catch (error) {
      const err = toSerializedError(error)
      // 401 dari /auth/me sudah mengakhiri sesi di `fetchMe`
      if (err.status === 401) {
        if (getState().auth.session) endSession(dispatch, 'Silakan masuk kembali.')
      } else {
        notify(dispatch, 'Gagal memuat sesi', 'error', err.message)
      }
      return rejectWithValue(err)
    }
  },
)
