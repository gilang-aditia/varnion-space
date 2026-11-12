import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'

/**
 * Kembalikan versi ter-debounce dari `fn`: dipanggil sekali setelah `delay` ms
 * tanpa panggilan baru (mis. setelah user berhenti mengetik).
 * Timer dibatalkan saat komponen unmount, atau manual lewat `.cancel()`.
 */
export function useDebouncedCallback<Args extends unknown[]>(fn: (...args: Args) => void, delay = 400) {
  const fnRef = useRef(fn)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // selalu pakai `fn` terbaru tanpa mereset timer
  useLayoutEffect(() => {
    fnRef.current = fn
  })

  useEffect(() => () => clearTimeout(timer.current), [])

  return useMemo(() => {
    const debounced = (...args: Args) => {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => fnRef.current(...args), delay)
    }
    /** Batalkan panggilan yang masih menunggu. */
    debounced.cancel = () => clearTimeout(timer.current)
    return debounced
  }, [delay])
}
