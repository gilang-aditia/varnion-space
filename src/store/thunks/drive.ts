import { api } from '@/api'
import type { DriveNode } from '@/types/drive'
import { getSubtreeIds, selectChildrenIndex } from '../selectors'
import { driveActions } from '../slices/driveSlice'
import { uiActions } from '../slices/uiSlice'
import { createMutation, notify } from './helpers'
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
