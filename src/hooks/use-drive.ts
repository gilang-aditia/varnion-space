import { useEffect, useMemo, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { selectCurrentUser } from '@/store/selectors'
import { can, canSystem, getWorkspaceRole, type SystemPermission, type WorkspacePermission } from '@/lib/rbac'

export function useCurrentUser() {
  return useAppSelector(selectCurrentUser)
}

/** Peran & izin user aktif pada sebuah workspace. */
export function usePermissions(workspaceId?: string | null) {
  const user = useCurrentUser()
  const ws = useAppSelector((s) => (workspaceId ? s.drive.nodes[workspaceId] : undefined))
  return useMemo(
    () => ({
      role: getWorkspaceRole(user, ws),
      can: (p: WorkspacePermission) => can(user, ws, p),
      canSystem: (p: SystemPermission) => canSystem(user, p),
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
