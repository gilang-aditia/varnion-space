import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'
import type { SortKey } from '@/lib/node-utils'
import { loggedOut } from '@/features/login/redux/loginAction'

/* --------------------------------- Route --------------------------------- */

export type Route =
  | { page: 'home' }
  | { page: 'folder'; id: string }
  | { page: 'recent' }
  | { page: 'shared' }
  | { page: 'activity' }
  | { page: 'trash' }
  | { page: 'users' }
  | { page: 'userDetail'; id: string }

export function routeToHash(route: Route): string {
  switch (route.page) {
    case 'home':
      return '#/'
    case 'folder':
      return `#/f/${encodeURIComponent(route.id)}`
    case 'userDetail':
      return `#/users/${encodeURIComponent(route.id)}`
    default:
      return `#/${route.page}`
  }
}

export function hashToRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, '')
  const [head, arg] = path.split('/')
  if (head === 'f' && arg) return { page: 'folder', id: decodeURIComponent(arg) }
  if (head === 'users' && arg) return { page: 'userDetail', id: decodeURIComponent(arg) }
  if (head === 'recent' || head === 'shared' || head === 'activity' || head === 'trash' || head === 'users')
    return { page: head }
  return { page: 'home' }
}

export const sameRoute = (a: Route, b: Route) => routeToHash(a) === routeToHash(b)

/* --------------------------------- Dialog -------------------------------- */

export type DialogState =
  | { type: 'newFolder'; parentId: string }
  | { type: 'rename'; id: string }
  /** `targetId` = tujuan yang sudah dipilih sebelumnya (kembali dari konfirmasi). */
  | { type: 'move'; id: string; targetId?: string }
  | { type: 'moveConfirm'; id: string; targetId: string; fromDialog?: boolean }
  /** Kelola akses: orang/peran & izinnya. */
  | { type: 'access'; id: string }
  /** Bagikan: link publik (akses umum). */
  | { type: 'share'; id: string }
  | { type: 'delete'; id: string }
  | { type: 'purge'; id: string }
  | { type: 'preview'; id: string; tab?: PreviewTab; version?: number }
  | { type: 'members'; workspaceId: string }
  | { type: 'newWorkspace' }
  | { type: 'newUser' }

export type PreviewTab = 'versions' | 'activity'

export interface Toast {
  id: string
  title: string
  description?: string
  tone: 'success' | 'error' | 'info'
}

export type ViewMode = 'grid' | 'list'
export type Theme = 'light' | 'dark' | 'system'

export interface UiState {
  route: Route
  viewMode: ViewMode
  sortBy: SortKey
  sortDir: 'asc' | 'desc'
  detailsOpen: boolean
  /** Item yang detailnya ditampilkan di panel kanan (null = folder aktif). */
  selectedId: string | null
  search: string
  dialog: DialogState | null
  toasts: Toast[]
  /** Status buka/tutup node di pohon sidebar. */
  expanded: Record<string, boolean>
  mobileNavOpen: boolean
  theme: Theme
}

const initialState: UiState = {
  route: { page: 'home' },
  viewMode: 'grid',
  sortBy: 'name',
  sortDir: 'asc',
  detailsOpen: false,
  selectedId: null,
  search: '',
  dialog: null,
  toasts: [],
  expanded: {},
  mobileNavOpen: false,
  theme: 'system',
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    routeChanged(state, action: PayloadAction<{ route: Route; expand?: string[] }>) {
      state.route = action.payload.route
      state.search = ''
      state.selectedId = null
      state.mobileNavOpen = false
      for (const id of action.payload.expand ?? []) state.expanded[id] = true
    },
    expandPath(state, action: PayloadAction<string[]>) {
      for (const id of action.payload) state.expanded[id] = true
    },
    toggleExpanded(state, action: PayloadAction<string>) {
      state.expanded[action.payload] = !state.expanded[action.payload]
    },
    setViewMode(state, action: PayloadAction<ViewMode>) {
      state.viewMode = action.payload
    },
    setSort(state, action: PayloadAction<SortKey>) {
      if (state.sortBy === action.payload) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc'
      else {
        state.sortBy = action.payload
        state.sortDir = action.payload === 'name' ? 'asc' : 'desc'
      }
    },
    setDetailsOpen(state, action: PayloadAction<boolean>) {
      state.detailsOpen = action.payload
    },
    showDetails(state, action: PayloadAction<string | null>) {
      state.selectedId = action.payload
      state.detailsOpen = true
    },
    select(state, action: PayloadAction<string | null>) {
      state.selectedId = action.payload
    },
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload
    },
    openDialog(state, action: PayloadAction<DialogState>) {
      state.dialog = action.payload
    },
    closeDialog(state) {
      state.dialog = null
    },
    toastAdded: {
      reducer(state, action: PayloadAction<Toast>) {
        state.toasts.push(action.payload)
        if (state.toasts.length > 4) state.toasts.shift()
      },
      prepare(toast: Omit<Toast, 'id' | 'tone'> & { tone?: Toast['tone'] }) {
        return { payload: { tone: 'success' as const, ...toast, id: nanoid(6) } }
      },
    },
    toastDismissed(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload)
    },
    setMobileNavOpen(state, action: PayloadAction<boolean>) {
      state.mobileNavOpen = action.payload
    },
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload
    },
  },
  extraReducers: (builder) => {
    // Keluar → bersihkan state navigasi; preferensi (tema, mode tampilan) tetap.
    builder.addCase(loggedOut, (state) => ({
      ...initialState,
      viewMode: state.viewMode,
      theme: state.theme,
      detailsOpen: state.detailsOpen,
      sortBy: state.sortBy,
      sortDir: state.sortDir,
    }))
  },
})

export const uiActions = uiSlice.actions
export default uiSlice.reducer
