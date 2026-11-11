import { useEffect, useMemo, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import type { Permission } from '@/types/drive'
import { selectCurrentUser } from '@/store/selectors'
import {
  can,
  canSystem,
  getWorkspaceRole,
  hasPermission,
  hasRole,
  nodePermissions,
  type SystemPermission,
  type WorkspacePermission,
} from '@/lib/rbac'

export function useCurrentUser() {
  return useAppSelector(selectCurrentUser)
}

/** Izin efektif user aktif pada sebuah folder/file (lihat, unduh, edit, hapus, bagikan). */
export function useNodePermissions(nodeId?: string | null) {
  return nodePermissions(useAppSelector((s) => (nodeId ? s.drive.nodes[nodeId] : undefined)))
}

/** Peran & izin level workspace (anggota, sampah) + izin sistem. */
export function usePermissions(workspaceId?: string | null) {
  const user = useCurrentUser()
  const ws = useAppSelector((s) => (workspaceId ? s.drive.nodes[workspaceId] : undefined))
  return useMemo(
    () => ({
      role: getWorkspaceRole(user, ws),
      can: (p: WorkspacePermission) => can(user, ws, p),
      canSystem: (p: SystemPermission) => canSystem(user, p),
      /** Izin RBAC backend mentah, mis. `perms.has('file.upload')`. */
      has: (p: Permission) => hasPermission(user, p),
      hasRole: (...roles: string[]) => hasRole(user, ...roles),
    }),
    [user, ws],
  )
}

/** "Sekarang" yang diperbarui berkala agar label waktu relatif tetap akurat. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}
