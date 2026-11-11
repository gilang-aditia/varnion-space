import { api } from '@/api'
import type { AppThunk } from '../index'
import { activityActions } from '../slices/activitySlice'

/**
 * Ambil log aktivitas baru sejak log terakhir yang dimiliki client.
 * Dipanggil setelah setiap aksi; bisa juga dipanggil berkala (polling)
 * atau dari event websocket bila backend menyediakannya.
 */
export const syncActivity = (): AppThunk<Promise<void>> => async (dispatch, getState) => {
  if (!getState().auth.session) return
  const since = getState().activity.logs[0]?.at
  try {
    dispatch(activityActions.merged(await api.listActivity({ since })))
  } catch {
    /* best-effort — sinkronisasi berikutnya akan mengejar */
  }
}
