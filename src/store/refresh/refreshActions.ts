/**
 * Action refresh token.
 *
 * - Async thunk: `refreshAccessToken` → POST /auth/refresh
 *
 * Dipanggil otomatis oleh http client (lihat `setRefreshHandler` di `store/index.ts`):
 * - sebelum request, bila access token sudah (hampir) kedaluwarsa;
 * - saat server membalas 401 → refresh lalu request diulang sekali.
 */
import { createAsyncThunk } from '@reduxjs/toolkit'
import { api, getAuthTokens, setAuthTokens, toSerializedError, type SerializedApiError } from '@/api'
import type { RefreshResponseDto } from '@/types/auth'
import { endSession, notify, type ThunkConfig } from '../thunks/helpers'

/**
 * POST /auth/refresh `{ refresh_token }` → simpan access token baru.
 * Bila backend juga mengirim `refresh_token` baru (yang lama sudah kedaluwarsa), ikut disimpan.
 *
 * Refresh token tidak ada / ditolak (400/401) → sesi berakhir, kembali ke halaman login.
 */
export const refreshAccessToken = createAsyncThunk<RefreshResponseDto, void, ThunkConfig>(
  'refresh/refreshAccessToken',
  async (_, { dispatch, rejectWithValue }) => {
    const current = getAuthTokens()
    if (!current?.refreshToken) {
      const err: SerializedApiError = { code: 'UNAUTHORIZED', status: 401, message: 'Refresh token tidak tersedia.' }
      endSession(dispatch, 'Silakan masuk kembali.')
      return rejectWithValue(err)
    }

    try {
      const res = await api.refreshToken({ refreshToken: current.refreshToken })
      setAuthTokens({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken ?? current.refreshToken,
        remember: current.remember,
      })
      return res
    } catch (error) {
      const err = toSerializedError(error)
      if (err.status === 400 || err.status === 401) {
        // mis. "invalid refresh token" → tidak bisa diperbarui lagi
        endSession(dispatch, `Silakan masuk kembali (${err.message}).`)
      } else {
        notify(dispatch, 'Gagal memperbarui sesi', 'error', err.message)
      }
      return rejectWithValue(err)
    }
  },
)
