import type { ReactNode } from 'react'
import {
  Download,
  EllipsisVertical,
  ExternalLink,
  FilePen,
  GitCommitVertical,
  Info,
  Lock,
  PencilLine,
  Trash,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppDispatch } from '@/store/hooks'
import { uiActions } from '@/store/slices/uiSlice'
import { downloadNode, openNode } from '@/store/thunks'
import { usePermissions } from '@/hooks/use-drive'
import type { DriveNode } from '@/types/drive'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUpload } from './upload-context'

function Locked({ allowed }: { allowed: boolean }) {
  return allowed ? null : <Lock className="ml-auto opacity-70" />
}

/**
 * Menu aksi (⋮) untuk sebuah item. Aksi yang tidak diizinkan oleh peran
 * user tetap ditampilkan namun non-aktif dengan ikon gembok — agar jelas
 * bahwa pembatasnya adalah hak akses (RBAC).
 */
export function NodeMenu({
  node,
  className,
  trigger,
}: {
  node: DriveNode
  className?: string
  trigger?: ReactNode
}) {
  const dispatch = useAppDispatch()
  const perms = usePermissions(node.workspaceId)
  const upload = useUpload()
  const isWs = node.kind === 'workspace'
  const canRename = isWs ? perms.can('members.manage') : perms.can('file.edit')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground data-[state=open]:bg-foreground/10',
              className,
            )}
            aria-label={`Aksi untuk ${node.name}`}
          >
            <EllipsisVertical className="size-4" />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => dispatch(openNode(node.id))}>
          <ExternalLink />
          Buka
        </DropdownMenuItem>
        {node.kind === 'file' && (
          <DropdownMenuItem disabled={!perms.can('file.download')} onSelect={() => dispatch(downloadNode({ id: node.id }))}>
            <Download />
            Unduh
            <Locked allowed={perms.can('file.download')} />
          </DropdownMenuItem>
        )}
        {isWs && (
          <DropdownMenuItem onSelect={() => dispatch(uiActions.openDialog({ type: 'members', workspaceId: node.id }))}>
            <Users />
            {perms.can('members.manage') ? 'Kelola anggota' : 'Lihat anggota'}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          disabled={!canRename}
          onSelect={() => dispatch(uiActions.openDialog({ type: 'rename', id: node.id }))}
        >
          <PencilLine />
          Ganti nama
          <Locked allowed={canRename} />
        </DropdownMenuItem>
        {node.kind === 'file' && (
          <DropdownMenuItem
            onSelect={() => dispatch(uiActions.openDialog({ type: 'preview', id: node.id, tab: 'versions' }))}
          >
            <GitCommitVertical />
            Riwayat versi
            <span className="ml-auto text-xs text-muted-foreground">v{node.version ?? 1}</span>
          </DropdownMenuItem>
        )}
        {node.kind === 'file' && (
          <DropdownMenuItem disabled={!perms.can('file.edit')} onSelect={() => upload.pickVersion(node.id)}>
            <FilePen />
            Unggah versi baru
            <Locked allowed={perms.can('file.edit')} />
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => dispatch(uiActions.showDetails(node.id))}>
          <Info />
          Detail & aktivitas
        </DropdownMenuItem>
        {!isWs && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={!perms.can('file.delete')}
              onSelect={() => dispatch(uiActions.openDialog({ type: 'delete', id: node.id }))}
            >
              <Trash />
              Pindahkan ke Sampah
              <Locked allowed={perms.can('file.delete')} />
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
