/**
 * Action logout.
 *
 * - Async thunk: `logout` → POST /auth/logout
 */
import { createAsyncThunk } from '@reduxjs/toolkit'
import { api, toSerializedError } from '@/api'
import type { LogoutResponseDto } from '@/types/auth'
import { endSession, notify, type ThunkConfig } from '../thunks/helpers'

/**
 * POST /auth/logout → token dicabut di server, lalu sesi di browser dihapus:
 * access token, refresh token, flag "ingat saya" (cookie/localStorage),
 * metadata sesi, dan seluruh state Redux (`loggedOut`).
 *
 * Bila request gagal (jaringan, server error, token sudah kedaluwarsa), sesi di
 * browser TETAP dihapus agar user benar-benar keluar dari perangkat ini.
 */
export const logout = createAsyncThunk<LogoutResponseDto, void, ThunkConfig>(
  'logout/logout',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const message = await api.logout()
      endSession(dispatch)
      notify(dispatch, 'Berhasil keluar', 'success', message)
      return message
    } catch (error) {
      const err = toSerializedError(error)
      endSession(dispatch)
      if (err.status === 401) {
        // token sudah tidak berlaku di server → sesi memang sudah berakhir
        notify(dispatch, 'Anda sudah keluar', 'info', err.message)
      } else {
        notify(dispatch, 'Gagal keluar dari server', 'error', `${err.message} — sesi di perangkat ini tetap dihapus.`)
      }
      return rejectWithValue(err)
    }
  },
)
