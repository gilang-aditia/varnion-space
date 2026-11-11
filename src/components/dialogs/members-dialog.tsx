import { useState } from 'react'
import { WORKSPACE_ROLE_DESC, WORKSPACE_ROLE_LABEL } from '@/lib/rbac'
import { formatDate } from '@/lib/format'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectUsers } from '@/store/selectors'
import { uiActions } from '@/store/slices/uiSlice'
import { addMember, changeMemberRole, removeMember } from '@/store/thunks'
import { useCurrentUser, usePermissions } from '@/hooks/use-drive'
import type { WorkspaceRole } from '@/types/drive'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NodeIcon } from '@/components/common/node-icon'
import { UserAvatar } from '@/components/common/user-avatar'
import { SystemRoleBadge, WorkspaceRoleBadge } from '@/components/common/role-badge'

const ROLES: WorkspaceRole[] = ['manager', 'editor', 'viewer']

/** Pilihan peran: tombol hanya menampilkan nama peran, penjelasannya ada di daftar. */
function RoleSelect({
  value,
  onChange,
  size = 'default',
}: {
  value: WorkspaceRole
  onChange: (r: WorkspaceRole) => void
  size?: 'sm' | 'default'
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as WorkspaceRole)}>
      <SelectTrigger size={size} className="w-32 shrink-0" aria-label="Peran">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end" className="w-80">
        {ROLES.map((r) => (
          <SelectItem key={r} value={r} description={WORKSPACE_ROLE_DESC[r]}>
            {WORKSPACE_ROLE_LABEL[r]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function MembersDialog({ workspaceId }: { workspaceId: string }) {
  const dispatch = useAppDispatch()
  const me = useCurrentUser()
  const ws = useAppSelector((s) => s.drive.nodes[workspaceId])
  const users = useAppSelector(selectUsers)
  const usersById = useAppSelector((s) => s.users.byId)
  const perms = usePermissions(workspaceId)
  const canManage = perms.can('members.manage')
  const [newUser, setNewUser] = useState<string>('')
  const [newRole, setNewRole] = useState<WorkspaceRole>('viewer')
  const close = () => dispatch(uiActions.closeDialog())
  if (!ws) return null

  const members = ws.members ?? []
  const candidates = users.filter((u) => u.status === 'active' && !members.some((m) => m.userId === u.id))
  const implicit = users.filter(
    (u) => u.status === 'active' && u.role !== 'member' && !members.some((m) => m.userId === u.id),
  )

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <NodeIcon node={ws} size="md" />
            <div>
              <DialogTitle>Anggota “{ws.name}”</DialogTitle>
              <DialogDescription>
                {canManage
                  ? 'Atur siapa yang dapat mengakses workspace ini dan apa yang boleh mereka lakukan.'
                  : 'Hanya Pengelola workspace yang dapat mengubah anggota.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {canManage && (
          <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3 sm:flex-row sm:items-center">
            <Select value={newUser} onValueChange={setNewUser}>
              <SelectTrigger className="w-full min-w-0 flex-1" aria-label="Pengguna">
                <SelectValue placeholder="Pilih pengguna…" />
              </SelectTrigger>
              <SelectContent position="popper">
                {candidates.length === 0 && (
                  <p className="px-2 py-1.5 text-xs text-muted-foreground">Semua pengguna aktif sudah menjadi anggota.</p>
                )}
                {candidates.map((u) => (
                  <SelectItem key={u.id} value={u.id} description={u.email}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <RoleSelect value={newRole} onChange={setNewRole} />
              <Button
                disabled={!newUser}
                onClick={() => {
                  void dispatch(addMember({ workspaceId, userId: newUser, role: newRole }))
                  setNewUser('')
                }}
              >
                Tambah
              </Button>
            </div>
          </div>
        )}

        <ul className="-mx-1 max-h-80 divide-y overflow-y-auto">
          {members.map((m) => {
            const u = usersById[m.userId]
            if (!u) return null
            return (
              <li key={m.userId} className="flex items-center gap-3 px-1 py-2.5">
                <UserAvatar user={u} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {u.name}
                    {u.id === me?.id && <span className="text-muted-foreground"> (Anda)</span>}
                    {u.status === 'inactive' && (
                      <span className="ml-1.5 rounded bg-muted px-1 text-[10px] text-muted-foreground">nonaktif</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.email} · sejak {formatDate(m.addedAt)}
                  </p>
                </div>
                {canManage ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <RoleSelect
                      size="sm"
                      value={m.role}
                      onChange={(role) => void dispatch(changeMemberRole({ workspaceId, userId: u.id, role }))}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => void dispatch(removeMember({ workspaceId, userId: u.id }))}
                      aria-label={`Keluarkan ${u.name}`}
                    >
                      Keluarkan
                    </Button>
                  </div>
                ) : (
                  <WorkspaceRoleBadge role={m.role} icon={false} />
                )}
              </li>
            )
          })}
        </ul>

        {implicit.length > 0 && (
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs font-medium">Akses otomatis dari peran sistem</p>
            <p className="mt-0.5 mb-2.5 text-xs text-muted-foreground">
              Tidak perlu ditambahkan sebagai anggota — akses mengikuti peran sistemnya.
            </p>
            <div className="flex flex-wrap gap-2">
              {implicit.map((u) => (
                <span
                  key={u.id}
                  className="inline-flex items-center gap-2 rounded-full border bg-background py-1 pr-1.5 pl-1 text-xs"
                >
                  <UserAvatar user={u} size="xs" />
                  <span className="font-medium">{u.name}</span>
                  <SystemRoleBadge role={u.role} icon={false} />
                </span>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
