import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from './index'
import type { DriveNode } from '@/types/drive'
import { canAccessWorkspace, nodePermissions } from '@/lib/rbac'

export const selectNodes = (s: RootState) => s.drive.nodes
export const selectUsersById = (s: RootState) => s.users.byId
/** Log aktivitas — server hanya mengirim log yang boleh dilihat user aktif. */
export const selectLogs = (s: RootState) => s.activity.logs
export const selectRoute = (s: RootState) => s.ui.route

export const selectCurrentUser = (s: RootState) => {
  const id = s.auth.session?.userId
  return id ? s.users.byId[id] ?? null : null
}

export const selectUsers = createSelector([selectUsersById], (byId) =>
  Object.values(byId).sort((a, b) => a.name.localeCompare(b.name, 'id')),
)

/** Index parentId → anak (tanpa item yang ada di sampah). */
export const selectChildrenIndex = createSelector([selectNodes], (nodes) => {
  const index: Record<string, DriveNode[]> = {}
  for (const n of Object.values(nodes)) {
    if (!n.parentId || n.deletedAt) continue
    ;(index[n.parentId] ??= []).push(n)
  }
  return index
})

/** Semua workspace yang boleh diakses user aktif. */
export const selectAccessibleWorkspaces = createSelector(
  [selectNodes, selectCurrentUser],
  (nodes, user) =>
    Object.values(nodes)
      .filter((n) => n.kind === 'workspace' && !n.deletedAt && canAccessWorkspace(user, n))
      .sort((a, b) => a.name.localeCompare(b.name, 'id')),
)

export const selectAccessibleWorkspaceIds = createSelector(
  [selectAccessibleWorkspaces],
  (list) => new Set(list.map((w) => w.id)),
)

/** Apakah node (atau salah satu leluhurnya) berada di sampah. */
export function isInTrash(nodes: Record<string, DriveNode>, id: string): boolean {
  let cur: DriveNode | undefined = nodes[id]
  while (cur) {
    if (cur.deletedAt) return true
    cur = cur.parentId ? nodes[cur.parentId] : undefined
  }
  return false
}

/** Jalur dari workspace sampai node (inklusif). */
export function getPath(nodes: Record<string, DriveNode>, id: string): DriveNode[] {
  const path: DriveNode[] = []
  let cur: DriveNode | undefined = nodes[id]
  while (cur) {
    path.unshift(cur)
    cur = cur.parentId ? nodes[cur.parentId] : undefined
  }
  return path
}

/** Semua id turunan sebuah node (inklusif) — untuk memfilter log per folder. */
export function getSubtreeIds(index: Record<string, DriveNode[]>, id: string): Set<string> {
  const out = new Set<string>([id])
  const stack = [id]
  while (stack.length) {
    const cur = stack.pop()!
    for (const c of index[cur] ?? []) {
      out.add(c.id)
      stack.push(c.id)
    }
  }
  return out
}

/**
 * Alasan sebuah node TIDAK bisa dipindah ke `targetId` (null = boleh).
 * Dipakai dialog "Pindahkan" & drag-and-drop; server tetap memvalidasi ulang.
 */
export function getMoveBlocker(state: RootState, nodeId: string, targetId: string): string | null {
  const nodes = state.drive.nodes
  const node = nodes[nodeId]
  const target = nodes[targetId]
  if (!node || !target || node.kind === 'workspace') return 'Tidak dapat dipindahkan'
  if (target.kind === 'file' || isInTrash(nodes, targetId)) return 'Bukan folder tujuan'
  if (node.parentId === targetId) return 'Lokasi saat ini'
  if (getSubtreeIds(selectChildrenIndex(state), nodeId).has(targetId)) return 'Folder yang dipindahkan'
  if (!nodePermissions(node).canEdit) return 'Tidak punya izin memindahkan'
  if (!nodePermissions(target).canEdit) return 'Hanya bisa melihat'
  return null
}

/** Item di sampah (hanya akar penghapusan) pada workspace yang dapat diakses. */
export const selectTrash = createSelector(
  [selectNodes, selectAccessibleWorkspaceIds],
  (nodes, wsIds) =>
    Object.values(nodes)
      .filter(
        (n) =>
          n.deletedAt &&
          n.kind !== 'workspace' &&
          wsIds.has(n.workspaceId) &&
          !(n.parentId && isInTrash(nodes, n.parentId)),
      )
      .sort((a, b) => (a.deletedAt! < b.deletedAt! ? 1 : -1)),
)

/** Total ukuran file per workspace. */
export const selectWorkspaceStats = createSelector([selectNodes], (nodes) => {
  const stats: Record<string, { files: number; folders: number; size: number }> = {}
  for (const n of Object.values(nodes)) {
    if (n.kind === 'workspace' || isInTrash(nodes, n.id)) continue
    const s = (stats[n.workspaceId] ??= { files: 0, folders: 0, size: 0 })
    if (n.kind === 'file') {
      s.files++
      s.size += n.size ?? 0
    } else s.folders++
  }
  return stats
})

/**
 * "Dibagikan ke saya": item yang dibagikan langsung ke user (punya aturan
 * akses untuknya) atau yang folder induknya tidak bisa ia lihat — mis. ia
 * bukan anggota workspace-nya.
 */
export const selectSharedWithMe = createSelector([selectNodes, selectCurrentUser], (nodes, user) =>
  Object.values(nodes)
    .filter(
      (n) =>
        n.kind !== 'workspace' &&
        !isInTrash(nodes, n.id) &&
        ((n.parentId && !nodes[n.parentId]) ||
          n.access?.some((e) => e.subjectType === 'user' && e.subjectUserId === user?.id && e.canView)),
    )
    .sort((a, b) => (a.kind !== b.kind ? (a.kind === 'file' ? 1 : -1) : a.name.localeCompare(b.name, 'id'))),
)

/** File/folder terbaru yang diubah di workspace yang dapat diakses. */
export const selectRecent = createSelector(
  [selectNodes, selectAccessibleWorkspaceIds],
  (nodes, wsIds) =>
    Object.values(nodes)
      .filter((n) => n.kind === 'file' && wsIds.has(n.workspaceId) && !isInTrash(nodes, n.id))
      .sort((a, b) => {
        const ta = Math.max(Date.parse(a.updatedAt), Date.parse(a.lastOpenedAt ?? a.updatedAt))
        const tb = Math.max(Date.parse(b.updatedAt), Date.parse(b.lastOpenedAt ?? b.updatedAt))
        return tb - ta
      })
      .slice(0, 40),
)
