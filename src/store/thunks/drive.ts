import { api, type ShareLinkInput } from '@/api'
import type { AccessEntry, DriveNode } from '@/types/drive'
import type { AppThunk } from '../index'
import { getPath, getSubtreeIds, selectChildrenIndex } from '../selectors'
import { driveActions } from '../slices/driveSlice'
import { uiActions } from '../slices/uiSlice'
import { createMutation, handleApiError, notify } from './helpers'
import { navigate } from './navigation'

/* ------------------------------ Folder & file ----------------------------- */

export const createFolder = createMutation<DriveNode, { parentId: string; name: string }>(
  'drive/createFolder',
  'Gagal membuat folder',
  async ({ parentId, name }, { dispatch }) => {
    const folder = await api.createFolder(parentId, name)
    dispatch(driveActions.upserted(folder))
    notify(dispatch, `Folder "${folder.name}" dibuat`)
    return folder
  },
)

export const uploadFiles = createMutation<DriveNode[], { parentId: string; files: File[] }>(
  'drive/uploadFiles',
  'Gagal mengunggah file',
  async ({ parentId, files }, { dispatch, getState }) => {
    const nodes = await api.uploadFiles(parentId, files)
    dispatch(driveActions.upserted(nodes))
    const parent = getState().drive.nodes[parentId]
    notify(
      dispatch,
      nodes.length === 1 ? `"${nodes[0]!.name}" berhasil diunggah` : `${nodes.length} file berhasil diunggah`,
      'success',
      parent && `ke ${parent.name}`,
    )
    return nodes
  },
)

export const renameNode = createMutation<DriveNode, { id: string; name: string }>(
  'drive/renameNode',
  'Gagal mengganti nama',
  async ({ id, name }, { dispatch, getState }) => {
    const before = getState().drive.nodes[id]?.name
    const node = await api.renameNode(id, name)
    dispatch(driveActions.upserted(node))
    if (before !== node.name) notify(dispatch, 'Nama berhasil diubah', 'success', `"${before}" → "${node.name}"`)
    return node
  },
)

/** Pindahkan file/folder ke folder atau workspace lain (termasuk antar workspace). */
export const moveNode = createMutation<DriveNode[], { id: string; targetId: string }>(
  'drive/moveNode',
  'Gagal memindahkan',
  async ({ id, targetId }, { dispatch, getState }) => {
    const before = getState().drive.nodes[id]
    const nodes = await api.moveNode(id, targetId)
    dispatch(driveActions.upserted(nodes))

    const state = getState()
    const moved = state.drive.nodes[id]!
    const target = state.drive.nodes[targetId]
    // sedang membuka folder yang dipindah (atau isinya) → buka jalur barunya di sidebar
    const { route } = state.ui
    if (route.page === 'folder' && nodes.some((n) => n.id === route.id)) {
      dispatch(uiActions.expandPath(getPath(state.drive.nodes, route.id).slice(0, -1).map((n) => n.id)))
    }

    const crossWorkspace = before && before.workspaceId !== moved.workspaceId
    const details = [
      crossWorkspace &&
        `Workspace: ${state.drive.nodes[before.workspaceId]?.name ?? '—'} → ${state.drive.nodes[moved.workspaceId]?.name}`,
      before && before.name !== moved.name && `Nama disesuaikan menjadi "${moved.name}"`,
    ].filter(Boolean)
    notify(dispatch, `"${moved.name}" dipindahkan ke ${target?.name ?? 'folder tujuan'}`, 'success', details.join(' · ') || undefined)
    return nodes
  },
)

export const trashNode = createMutation<DriveNode, string>(
  'drive/trashNode',
  'Gagal menghapus',
  async (id, { dispatch, getState }) => {
    const node = await api.trashNode(id)
    const { route, selectedId } = getState().ui
    // sedang berada di dalam folder yang dihapus → pindah ke induknya
    if (route.page === 'folder' && node.parentId && getSubtreeIds(selectChildrenIndex(getState()), id).has(route.id)) {
      dispatch(navigate({ page: 'folder', id: node.parentId }, { replace: true }))
    }
    dispatch(driveActions.upserted(node))
    if (selectedId === id) dispatch(uiActions.select(null))
    notify(dispatch, `"${node.name}" dipindahkan ke Sampah`, 'info', 'Pengelola workspace dapat memulihkannya.')
    return node
  },
)

export const restoreNode = createMutation<DriveNode, string>(
  'drive/restoreNode',
  'Gagal memulihkan',
  async (id, { dispatch, getState }) => {
    const node = await api.restoreNode(id)
    dispatch(driveActions.upserted(node))
    const parent = node.parentId ? getState().drive.nodes[node.parentId] : undefined
    notify(dispatch, `"${node.name}" dipulihkan`, 'success', parent && `ke ${parent.name}`)
    return node
  },
)

export const purgeNode = createMutation<string[], string>(
  'drive/purgeNode',
  'Gagal menghapus permanen',
  async (id, { dispatch, getState }) => {
    const name = getState().drive.nodes[id]?.name
    const { removedIds } = await api.purgeNode(id)
    dispatch(driveActions.removed(removedIds))
    notify(dispatch, `"${name}" dihapus permanen`, 'info')
    return removedIds
  },
)

export const downloadNode = createMutation<void, { id: string; version?: number }>(
  'drive/download',
  'Gagal mengunduh',
  async ({ id, version }, { dispatch }) => {
    const { url, fileName } = await api.getDownload(id, version)
    if (url) {
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      return
    }
    notify(
      dispatch,
      version ? `Mengunduh versi ${version}` : 'Unduhan dimulai',
      'info',
      `${fileName} (simulasi — belum terhubung ke storage)`,
    )
  },
)

/* -------------------------- Akses folder/file (ACL) ------------------------- */

/** Muat aturan akses terbaru sebuah folder/file ke cache. */
export const refreshNodeAccess =
  (id: string): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    try {
      const access = await api.getNodeAccess(id)
      const node = getState().drive.nodes[id]
      if (node) dispatch(driveActions.upserted({ ...node, access }))
    } catch (error) {
      handleApiError(dispatch, error, 'Gagal memuat akses')
    }
  }

/** Simpan seluruh aturan akses folder/file (butuh izin "Bagikan"). */
export const updateNodeAccess = createMutation<DriveNode, { id: string; entries: AccessEntry[] }>(
  'drive/updateNodeAccess',
  'Gagal menyimpan akses',
  async ({ id, entries }, { dispatch }) => {
    const node = await api.updateNodeAccess(id, entries)
    // izin efektif & visibilitas isi folder ikut berubah → muat ulang daftar node
    dispatch(driveActions.received(await api.listNodes()))
    notify(dispatch, `Akses "${node.name}" disimpan`, 'success', 'Berlaku juga untuk isi folder yang tidak punya aturan sendiri.')
    return node
  },
)

/** Atur link publik (siapa saja yang punya link, tanpa login). */
export const updateShareLink = createMutation<DriveNode, { id: string } & ShareLinkInput>(
  'drive/updateShareLink',
  'Gagal mengatur link publik',
  async ({ id, ...input }, { dispatch }) => {
    const node = await api.updateShareLink(id, input)
    dispatch(driveActions.upserted(node))
    notify(
      dispatch,
      input.regenerate ? 'Link baru dibuat' : input.enabled ? 'Link publik aktif' : 'Link publik dinonaktifkan',
      input.enabled ? 'success' : 'info',
      input.regenerate ? 'Link lama sudah tidak berlaku.' : undefined,
    )
    return node
  },
)

/* -------------------------------- Versi file ------------------------------- */

export const uploadVersion = createMutation<DriveNode, { id: string; file: File; note?: string }>(
  'drive/uploadVersion',
  'Gagal menyimpan versi baru',
  async ({ id, file, note }, { dispatch }) => {
    const node = await api.uploadVersion(id, file, note)
    dispatch(driveActions.upserted(node))
    const latest = node.versions?.at(-1)
    notify(dispatch, `Versi ${latest?.version ?? ''} disimpan`, 'success', latest?.note)
    return node
  },
)

export const restoreVersion = createMutation<DriveNode, { id: string; version: number }>(
  'drive/restoreVersion',
  'Gagal memulihkan versi',
  async ({ id, version }, { dispatch }) => {
    const node = await api.restoreVersion(id, version)
    dispatch(driveActions.upserted(node))
    notify(dispatch, `Versi ${version} dipulihkan`, 'success', `Disimpan sebagai versi ${node.version}`)
    return node
  },
)
