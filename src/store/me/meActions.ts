/**
 * Action profil user aktif.
 *
 * - Async thunk: `fetchMe` → GET /auth/me
 */
import { createAsyncThunk } from '@reduxjs/toolkit'
import { api, toSerializedError } from '@/api'
import { mapUser } from '@/api/http/user-mapper'
import type { MeDto } from '@/types/auth'
import { usersActions } from '../slices/usersSlice'
import { endSession, notify, type ThunkConfig } from '../thunks/helpers'

export interface FetchMeArgs {
  /**
   * true → tanpa toast (dipakai saat login / pulihkan sesi, karena thunk
   * tersebut sudah menampilkan toast sendiri).
   */
  silent?: boolean
}

/**
 * GET /auth/me → simpan profil + roles/permissions.
 * Profil juga dimasukkan ke `users` agar komponen yang membaca daftar user ikut terbarui.
 * 401 → sesi berakhir, kembali ke halaman login (toast "Sesi berakhir").
 */
export const fetchMe = createAsyncThunk<MeDto, FetchMeArgs | void, ThunkConfig>(
  'me/fetchMe',
  async (args, { dispatch, rejectWithValue }) => {
    const silent = !!args?.silent
    try {
      const me = await api.getMe()
      dispatch(usersActions.upserted(mapUser(me)))
      if (!silent) notify(dispatch, 'Profil diperbarui', 'success', me.displayName)
      return me
    } catch (error) {
      const err = toSerializedError(error)
      if (err.status === 401) endSession(dispatch, 'Silakan masuk kembali.')
      else if (!silent) notify(dispatch, 'Gagal memuat profil', 'error', err.message)
      return rejectWithValue(err)
    }
  },
)
