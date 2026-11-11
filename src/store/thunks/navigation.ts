import { api } from '@/api'
import { withViewTransition } from '@/lib/view-transition'
import type { AppThunk } from '../index'
import { getPath } from '../selectors'
import { driveActions } from '../slices/driveSlice'
import { hashToRoute, routeToHash, sameRoute, uiActions, type Route } from '../slices/uiSlice'
import { syncActivity } from './activity'
import { nowIso } from './helpers'

/** Catat bahwa user membuka node / versi tertentu (fire-and-forget). */
export const recordOpen =
  (id: string, version?: number): AppThunk =>
  (dispatch, getState) => {
    const state = getState()
    const userId = state.auth.session?.userId
    const node = state.drive.nodes[id]
    if (!userId || !node) return
    const isLatest = version === undefined || version === node.versions?.at(-1)?.version
    if (isLatest) dispatch(driveActions.opened({ id, by: userId, at: nowIso() }))
    api
      .recordOpen(id, isLatest ? undefined : version)
      .then(() => dispatch(syncActivity()))
      .catch(() => {
        /* pencatatan akses bersifat best-effort */
      })
  }

interface NavigateOptions {
  /** Ganti entri history alih-alih menambah. */
  replace?: boolean
  /** Dipicu tombol back/forward — URL sudah berubah, jangan diubah lagi. */
  fromHistory?: boolean
}

/**
 * Pindah halaman. Animasi "kartu workspace → sidebar" (View Transition) HANYA
 * dipakai saat user membuka workspace dari beranda; navigasi lain (folder,
 * sub-folder, sidebar, back/forward, URL) langsung/instan tanpa efek kedip.
 */
export const navigate =
  (route: Route, opts: NavigateOptions = {}): AppThunk =>
  (dispatch, getState) => {
    const state = getState()
    if (sameRoute(state.ui.route, route) && !state.ui.search) {
      if (state.ui.mobileNavOpen) dispatch(uiActions.setMobileNavOpen(false))
      return
    }

    const target = route.page === 'folder' ? state.drive.nodes[route.id] : undefined
    // buka leluhur di pohon sidebar agar posisi folder aktif terlihat
    const expand = target ? getPath(state.drive.nodes, target.id).slice(0, -1).map((n) => n.id) : []
    const apply = () => {
      dispatch(uiActions.routeChanged({ route, expand }))
      if (target) dispatch(recordOpen(target.id))
    }

    const opensWorkspaceFromHome =
      !opts.fromHistory && state.ui.route.page === 'home' && !state.ui.search.trim() && target?.kind === 'workspace'
    if (opensWorkspaceFromHome) withViewTransition(apply)
    else apply()

    if (!opts.fromHistory) {
      const hash = routeToHash(route)
      if (opts.replace) window.history.replaceState(null, '', hash)
      else window.history.pushState(null, '', hash)
    }
  }

/** Terapkan route dari URL hash (saat sesi dipulihkan / tombol back-forward). */
export const syncRouteFromUrl = (): AppThunk => (dispatch) =>
  dispatch(navigate(hashToRoute(window.location.hash), { replace: true, fromHistory: true }))

/** Buka item: workspace/folder → navigasi, file → dialog pratinjau. */
export const openNode =
  (id: string): AppThunk =>
  (dispatch, getState) => {
    const node = getState().drive.nodes[id]
    if (!node) return
    if (node.kind !== 'file') return dispatch(navigate({ page: 'folder', id }))
    dispatch(uiActions.openDialog({ type: 'preview', id }))
    dispatch(recordOpen(id))
  }
