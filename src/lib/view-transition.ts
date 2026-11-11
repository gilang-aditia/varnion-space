import { flushSync } from 'react-dom'

/**
 * Pasang `view-transition-name` hanya pada elemen yang benar-benar terlihat.
 *
 * Komponen tidak menulis `view-transition-name` langsung; mereka menandai diri
 * dengan `data-vt-name`. Sebelum & sesudah update, fungsi ini menerapkan nama
 * tersebut hanya bila elemen berada utuh di dalam area scroll terdekatnya
 * (`data-vt-clip`). Elemen yang tersembunyi / ter-scroll keluar tidak ikut
 * "terbang" — tanpa ini, baris sidebar di bawah lipatan akan muncul sesaat di
 * luar batas sidebar (pseudo-element view transition tidak ikut terpotong
 * oleh overflow) lalu hilang, terlihat seperti berkedip.
 */
function syncTransitionNames() {
  const clipRects = new Map<Element, DOMRect>()
  document.querySelectorAll<HTMLElement>('[data-vt-name]').forEach((el) => {
    const name = el.dataset.vtName
    const r = el.getBoundingClientRect()
    let visible = !!name && r.width > 0 && r.height > 0
    const clip = el.closest('[data-vt-clip]')
    if (visible && clip) {
      let c = clipRects.get(clip)
      if (!c) clipRects.set(clip, (c = clip.getBoundingClientRect()))
      visible = r.top >= c.top - 1 && r.bottom <= c.bottom + 1 && r.left >= c.left - 1 && r.right <= c.right + 1
    }
    el.style.viewTransitionName = visible ? name! : ''
  })
}

/**
 * Menjalankan perubahan state di dalam View Transition (shared-element morph).
 *
 * Elemen dengan nama transisi yang sama sebelum & sesudah update dianimasikan
 * berpindah posisi/ukuran. Dipakai khusus saat membuka workspace dari
 * beranda: kartu workspace "terbang" menjadi baris di sidebar.
 *
 * Fallback: browser yang belum mendukung, atau user dengan
 * `prefers-reduced-motion`, langsung mendapatkan update tanpa animasi.
 */
export function withViewTransition(update: () => void) {
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  if (typeof document === 'undefined' || !('startViewTransition' in document) || reduceMotion) {
    update()
    return
  }

  syncTransitionNames()
  const transition = document.startViewTransition(() => {
    flushSync(update)
    syncTransitionNames()
  })
  // Bila transisi dibatalkan (mis. user klik cepat berturut-turut), update DOM
  // tetap dijalankan — cukup redam rejection agar konsol bersih.
  transition.ready.catch(() => {})
  transition.finished.catch(() => {})
}

/** Nama view-transition untuk sebuah node (workspace/folder). */
export const vtName = (id: string) => `vt-${id.replace(/[^a-zA-Z0-9_-]/g, '_')}`
