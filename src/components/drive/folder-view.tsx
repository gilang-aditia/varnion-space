import { useMemo, useState, type DragEvent } from 'react'
import {
  ArrowDownUp,
  Check,
  Eye,
  FolderOpen,
  FolderPlus,
  Info,
  LayoutGrid,
  List,
  ShieldX,
  Upload,
  UserPlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRelative } from '@/lib/format'
import { WORKSPACE_ROLE_DESC } from '@/lib/rbac'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { getPath, isInTrash, selectChildrenIndex } from '@/store/selectors'
import { uiActions } from '@/store/slices/uiSlice'
import { navigate, uploadFiles } from '@/store/thunks'
import { useCurrentUser, useNow, usePermissions } from '@/hooks/use-drive'
import { NodeIcon } from '@/components/common/node-icon'
import { UserAvatar } from '@/components/common/user-avatar'
import { WorkspaceRoleBadge } from '@/components/common/role-badge'
import { EmptyState } from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Breadcrumbs } from './breadcrumbs'
import { NodeGrid, NodeList } from './node-views'
import { displayName, sortNodes, type SortKey } from '@/lib/node-utils'
import { NodeMenu } from './node-menu'
import { useUpload } from './upload-context'

const SORT_LABEL: Record<SortKey, string> = {
  name: 'Nama',
  updatedAt: 'Terakhir diubah',
  size: 'Ukuran',
}

export function ViewToolbar({ showDetailsToggle = true }: { showDetailsToggle?: boolean }) {
  const dispatch = useAppDispatch()
  const { viewMode, sortBy, sortDir, detailsOpen } = useAppSelector((s) => s.ui)
  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <ArrowDownUp className="size-3.5" />
            <span className="hidden sm:inline">{SORT_LABEL[sortBy]}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Urutkan menurut</DropdownMenuLabel>
          {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
            <DropdownMenuItem key={k} onSelect={() => dispatch(uiActions.setSort(k))}>
              <Check className={cn(sortBy !== k && 'invisible')} />
              {SORT_LABEL[k]}
              {sortBy === k && (
                <span className="ml-auto text-xs text-muted-foreground">{sortDir === 'asc' ? 'A→Z / lama' : 'Z→A / baru'}</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="flex rounded-full border p-0.5" role="group" aria-label="Mode tampilan">
        <button
          onClick={() => dispatch(uiActions.setViewMode('list'))}
          aria-pressed={viewMode === 'list'}
          className={cn(
            'flex h-7 w-9 items-center justify-center rounded-full transition-colors',
            viewMode === 'list' ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:text-foreground',
          )}
          aria-label="Tampilan daftar"
        >
          <List className="size-4" />
        </button>
        <button
          onClick={() => dispatch(uiActions.setViewMode('grid'))}
          aria-pressed={viewMode === 'grid'}
          className={cn(
            'flex h-7 w-9 items-center justify-center rounded-full transition-colors',
            viewMode === 'grid' ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:text-foreground',
          )}
          aria-label="Tampilan grid"
        >
          <LayoutGrid className="size-4" />
        </button>
      </div>
      {showDetailsToggle && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-pressed={detailsOpen}
              onClick={() => dispatch(uiActions.setDetailsOpen(!detailsOpen))}
              className={cn('rounded-full', detailsOpen && 'bg-primary/12 text-primary hover:bg-primary/15')}
              aria-label="Detail & aktivitas"
            >
              <Info className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Detail & aktivitas</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

export function FolderView({ folderId }: { folderId: string }) {
  const dispatch = useAppDispatch()
  const now = useNow()
  const me = useCurrentUser()
  const nodes = useAppSelector((s) => s.drive.nodes)
  const index = useAppSelector(selectChildrenIndex)
  const { viewMode, sortBy, sortDir } = useAppSelector((s) => s.ui)
  const upload = useUpload()
  const [dragging, setDragging] = useState(false)

  const node = nodes[folderId]
  const perms = usePermissions(node?.workspaceId)
  const ws = node ? nodes[node.workspaceId] : undefined
  const path = useMemo(() => (node ? getPath(nodes, node.id) : []), [nodes, node])
  const children = useMemo(() => sortNodes(index[folderId] ?? [], sortBy, sortDir), [index, folderId, sortBy, sortDir])
  const editor = useAppSelector((s) => (node ? s.users.byId[node.updatedBy] : undefined))
  const usersById = useAppSelector((s) => s.users.byId)

  /* --------------------------- guard: not found / denied -------------------------- */
  if (!node || isInTrash(nodes, node.id) || node.kind === 'file') {
    return (
      <EmptyState
        icon={FolderOpen}
        title="Folder tidak ditemukan"
        description="Folder mungkin sudah dihapus atau dipindahkan."
        action={<Button onClick={() => dispatch(navigate({ page: 'home' }))}>Kembali ke Semua Workspace</Button>}
        className="h-full"
      />
    )
  }
  if (!perms.role) {
    return (
      <EmptyState
        icon={ShieldX}
        title="Akses ditolak"
        description={`Anda bukan anggota workspace "${ws?.name}". Minta Pengelola workspace untuk menambahkan Anda.`}
        action={<Button onClick={() => dispatch(navigate({ page: 'home' }))}>Kembali ke Semua Workspace</Button>}
        className="h-full"
      />
    )
  }

  const canCreate = perms.can('file.create')
  const folders = children.filter((c) => c.kind === 'folder').length
  const files = children.length - folders

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (!canCreate) return
    const list = Array.from(e.dataTransfer.files)
    if (list.length) void dispatch(uploadFiles({ parentId: node.id, files: list }))
  }

  return (
    <div
      className="relative flex min-h-full flex-col"
      onDragOver={(e) => {
        if (!canCreate || !e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false)
      }}
      onDrop={onDrop}
    >
      {/* ------------------------------ Header ------------------------------ */}
      <div className="sticky top-0 z-10 border-b bg-background/90 px-4 pt-3 pb-3 backdrop-blur sm:px-6">
        <Breadcrumbs path={path} />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <NodeIcon node={node} size="lg" />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <h1 className="truncate text-xl font-semibold tracking-tight">{node.name}</h1>
                <NodeMenu node={node} />
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {folders} folder · {files} file · diubah {formatRelative(node.updatedAt, now)} oleh{' '}
                {displayName(editor, me)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {ws && (
              <button
                onClick={() => dispatch(uiActions.openDialog({ type: 'members', workspaceId: ws.id }))}
                className="hidden items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-xs transition hover:bg-muted sm:flex"
                aria-label="Anggota workspace"
              >
                <span className="flex -space-x-1">
                  {(ws.members ?? []).slice(0, 3).map((m) => (
                    <UserAvatar key={m.userId} user={usersById[m.userId]} size="sm" className="ring-2 ring-background" />
                  ))}
                </span>
                <span className="text-muted-foreground">{ws.members?.length ?? 0} anggota</span>
                {perms.can('members.manage') && <UserPlus className="size-3.5 text-muted-foreground" />}
              </button>
            )}
            {canCreate && (
              <>
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => dispatch(uiActions.openDialog({ type: 'newFolder', parentId: node.id }))}
                >
                  <FolderPlus className="size-4" />
                  <span className="hidden md:inline">Folder</span>
                </Button>
                <Button className="gap-1.5" onClick={() => upload.pickFiles(node.id)}>
                  <Upload className="size-4" />
                  <span className="hidden md:inline">Unggah</span>
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <span className="shrink-0">Akses Anda:</span>
            {perms.role && <WorkspaceRoleBadge role={perms.role} />}
            <span className="hidden truncate md:inline">— {perms.role && WORKSPACE_ROLE_DESC[perms.role]}</span>
          </div>
          <ViewToolbar />
        </div>
      </div>

      {/* ------------------------------ Content ----------------------------- */}
      <div key={node.id} className="flex-1 px-4 py-5 sm:px-6">
        {perms.role === 'viewer' && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <Eye className="size-3.5 shrink-0" />
            Anda memiliki akses <span className="font-medium text-foreground">Pelihat</span> — hanya dapat membuka dan
            mengunduh. Tombol ubah & hapus dikunci.
          </div>
        )}
        {children.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="Folder ini masih kosong"
            description={
              canCreate
                ? 'Seret file ke sini atau gunakan tombol Unggah untuk menambahkan file.'
                : 'Belum ada file di folder ini.'
            }
            action={
              canCreate && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => dispatch(uiActions.openDialog({ type: 'newFolder', parentId: node.id }))}
                  >
                    <FolderPlus className="size-4" /> Folder baru
                  </Button>
                  <Button onClick={() => upload.pickFiles(node.id)}>
                    <Upload className="size-4" /> Unggah file
                  </Button>
                </div>
              )
            }
            className="rounded-2xl border border-dashed"
          />
        ) : viewMode === 'grid' ? (
          <NodeGrid nodes={children} now={now} />
        ) : (
          <NodeList nodes={children} now={now} />
        )}
      </div>

      {dragging && (
        <div className="pointer-events-none absolute inset-2 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-2 rounded-xl bg-background px-6 py-4 shadow-lg">
            <Upload className="size-6 text-primary" />
            <p className="text-sm font-medium">Lepaskan untuk mengunggah ke “{node.name}”</p>
          </div>
        </div>
      )}
    </div>
  )
}
