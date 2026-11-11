import type { ReactNode } from 'react'
import {
  Download,
  EllipsisVertical,
  ExternalLink,
  FilePen,
  FolderInput,
  GitCommitVertical,
  Info,
  Lock,
  PencilLine,
  Share2,
  UserCog,
  Trash,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppDispatch } from '@/store/hooks'
import { uiActions } from '@/store/slices/uiSlice'
import { downloadNode, openNode } from '@/store/thunks'
import { nodePermissions } from '@/lib/rbac'
import { isShareLinkActive } from '@/lib/share-link'
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
 * Menu aksi (⋮) untuk sebuah item. Aksi yang tidak diizinkan oleh akses user
 * pada item ini tetap ditampilkan namun non-aktif dengan ikon gembok — agar
 * jelas bahwa pembatasnya adalah hak akses.
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
  const ws = usePermissions(node.workspaceId) // izin level workspace (anggota)
  const access = nodePermissions(node) // izin pada item ini (ACL)
  const upload = useUpload()
  const isWs = node.kind === 'workspace'
  const canRename = isWs ? ws.can('members.manage') : access.canEdit
  // tanpa izin "Bagikan", dialog Bagikan tetap bisa dibuka untuk menyalin link publik yang aktif
  const canOpenShare = access.canShare || isShareLinkActive(node.shareLink)

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
        {!isWs && (
          <DropdownMenuItem
            disabled={!canOpenShare}
            onSelect={() => dispatch(uiActions.openDialog({ type: 'share', id: node.id }))}
          >
            <Share2 />
            Bagikan…
            <Locked allowed={canOpenShare} />
          </DropdownMenuItem>
        )}
        {!isWs && (
          <DropdownMenuItem onSelect={() => dispatch(uiActions.openDialog({ type: 'access', id: node.id }))}>
            <UserCog />
            {access.canShare ? 'Kelola akses…' : 'Lihat akses'}
          </DropdownMenuItem>
        )}
        {node.kind === 'file' && (
          <DropdownMenuItem disabled={!access.canDownload} onSelect={() => dispatch(downloadNode({ id: node.id }))}>
            <Download />
            Unduh
            <Locked allowed={access.canDownload} />
          </DropdownMenuItem>
        )}
        {isWs && (
          <DropdownMenuItem onSelect={() => dispatch(uiActions.openDialog({ type: 'members', workspaceId: node.id }))}>
            <Users />
            {ws.can('members.manage') ? 'Kelola anggota' : 'Lihat anggota'}
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
          <DropdownMenuItem disabled={!access.canEdit} onSelect={() => upload.pickVersion(node.id)}>
            <FilePen />
            Unggah versi baru
            <Locked allowed={access.canEdit} />
          </DropdownMenuItem>
        )}
        {!isWs && (
          <DropdownMenuItem
            disabled={!access.canEdit}
            onSelect={() => dispatch(uiActions.openDialog({ type: 'move', id: node.id }))}
          >
            <FolderInput />
            Pindahkan…
            <Locked allowed={access.canEdit} />
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
              disabled={!access.canDelete}
              onSelect={() => dispatch(uiActions.openDialog({ type: 'delete', id: node.id }))}
            >
              <Trash />
              Pindahkan ke Sampah
              <Locked allowed={access.canDelete} />
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
