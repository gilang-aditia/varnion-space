import { Info, Lock, RotateCcw, Trash, X } from 'lucide-react'
import { formatDateTime, formatRelative } from '@/lib/format'
import { can } from '@/lib/rbac'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { getPath, selectTrash } from '@/store/selectors'
import { uiActions } from '@/store/slices/uiSlice'
import { restoreNode } from '@/store/thunks'
import { useCurrentUser, useNow } from '@/hooks/use-drive'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { EmptyState } from '@/components/common/empty-state'
import { NodeIcon } from '@/components/common/node-icon'
import { UserAvatar } from '@/components/common/user-avatar'

export function TrashPage() {
  const dispatch = useAppDispatch()
  const now = useNow()
  const me = useCurrentUser()
  const trash = useAppSelector(selectTrash)
  const nodes = useAppSelector((s) => s.drive.nodes)
  const users = useAppSelector((s) => s.users.byId)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-xl font-semibold tracking-tight">Sampah</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">Item yang dihapus dari workspace yang dapat Anda akses.</p>
      <div className="mt-4 mb-5 flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
        <Info className="mt-px size-3.5 shrink-0" />
        Hanya <span className="font-medium text-foreground">Pengelola</span> workspace (dan Administrator) yang dapat
        memulihkan atau menghapus permanen. Setiap tindakan tercatat di log aktivitas.
      </div>

      {trash.length === 0 ? (
        <EmptyState icon={Trash} title="Sampah kosong" description="Item yang dihapus akan muncul di sini." />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="h-10 px-3 font-medium">Nama</th>
                <th className="hidden h-10 px-3 font-medium md:table-cell">Lokasi asal</th>
                <th className="h-10 px-3 font-medium">Dihapus oleh</th>
                <th className="h-10 px-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {trash.map((n) => {
                const ws = nodes[n.workspaceId]
                const canRestore = can(me, ws, 'trash.restore')
                const canPurge = can(me, ws, 'trash.purge')
                const by = n.deletedBy ? users[n.deletedBy] : undefined
                const origin = getPath(nodes, n.id)
                  .slice(0, -1)
                  .map((p) => p.name)
                  .join(' › ')
                return (
                  <tr key={n.id} className="border-b last:border-0">
                    <td className="px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <NodeIcon node={n} size="sm" className="opacity-70" />
                        <span className="truncate text-sm font-medium">{n.name}</span>
                      </div>
                    </td>
                    <td className="hidden max-w-64 truncate px-3 py-2.5 text-sm text-muted-foreground md:table-cell">
                      {origin}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <UserAvatar user={by} size="xs" />
                        <div className="min-w-0 text-xs">
                          <p className="truncate font-medium">{by?.id === me?.id ? 'Anda' : (by?.name ?? '—')}</p>
                          <p className="text-muted-foreground" title={formatDateTime(n.deletedAt)}>
                            {formatRelative(n.deletedAt, now)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        {canRestore ? (
                          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => dispatch(restoreNode(n.id))}>
                            <RotateCcw />
                            <span className="hidden sm:inline">Pulihkan</span>
                          </Button>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex h-7 items-center gap-1 px-2 text-xs text-muted-foreground">
                                <Lock className="size-3" /> Terkunci
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Hanya Pengelola “{ws?.name}” yang dapat memulihkan</TooltipContent>
                          </Tooltip>
                        )}
                        {canPurge && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => dispatch(uiActions.openDialog({ type: 'purge', id: n.id }))}
                          >
                            <X />
                            <span className="hidden sm:inline">Hapus permanen</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
