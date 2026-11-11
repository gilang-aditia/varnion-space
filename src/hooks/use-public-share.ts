import { useCallback, useEffect, useState } from 'react'
import { api, toSerializedError } from '@/api'
import { useAppDispatch } from '@/store/hooks'
import { uiActions } from '@/store/slices/uiSlice'
import type { PublicShare } from '@/types/drive'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; share: PublicShare }

/**
 * Data halaman link publik (tanpa login). Tidak memakai cache Redux karena
 * pengunjung belum tentu punya sesi.
 */
export function usePublicShare(key: string) {
  const dispatch = useAppDispatch()
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let alive = true
    api
      .getPublicShare(key)
      .then((share) => alive && setState({ status: 'ready', share }))
      .catch((error) => alive && setState({ status: 'error', message: toSerializedError(error).message }))
    return () => {
      alive = false
    }
  }, [key])

  const download = useCallback(
    async (nodeId: string) => {
      try {
        const { url, fileName } = await api.getPublicDownload(key, nodeId)
        if (url) {
          const a = document.createElement('a')
          a.href = url
          a.download = fileName
          a.click()
          return
        }
        dispatch(
          uiActions.toastAdded({
            title: 'Unduhan dimulai',
            description: `${fileName} (simulasi — belum terhubung ke storage)`,
            tone: 'info',
          }),
        )
      } catch (error) {
        dispatch(uiActions.toastAdded({ title: 'Gagal mengunduh', description: toSerializedError(error).message, tone: 'error' }))
      }
    },
    [dispatch, key],
  )

  return { state, download }
}
