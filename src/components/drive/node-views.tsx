import type { KeyboardEvent } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FILE_TYPE_META } from '@/lib/file-types'
import { formatBytes, formatDateTime, formatRelative } from '@/lib/format'
import { displayName, type SortKey } from '@/lib/node-utils'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectChildrenIndex } from '@/store/selectors'
import { uiActions } from '@/store/slices/uiSlice'
import { openNode } from '@/store/thunks'
import { useCurrentUser } from '@/hooks/use-drive'
import type { DriveNode } from '@/types/drive'
import { NodeIcon } from '@/components/common/node-icon'
import { UserAvatar } from '@/components/common/user-avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { NodeMenu } from './node-menu'

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

function onActivate(fn: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fn()
    }
  }
}

const IMAGE_GRADIENTS = [
  'from-rose-200 via-orange-100 to-amber-100 dark:from-rose-900/60 dark:via-orange-900/40 dark:to-amber-900/40',
  'from-sky-200 via-indigo-100 to-violet-100 dark:from-sky-900/60 dark:via-indigo-900/40 dark:to-violet-900/40',
  'from-emerald-200 via-teal-100 to-cyan-100 dark:from-emerald-900/60 dark:via-teal-900/40 dark:to-cyan-900/40',
  'from-fuchsia-200 via-pink-100 to-rose-100 dark:from-fuchsia-900/60 dark:via-pink-900/40 dark:to-rose-900/40',
]

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Area "thumbnail" untuk file (tanpa konten asli — ini slicing UI). */
export function FileThumb({ node, className }: { node: DriveNode; className?: string }) {
  const meta = FILE_TYPE_META[node.fileType ?? 'other']
  const Icon = meta.icon
  if (node.fileType === 'image') {
    return (
      <div
        className={cn(
          'relative flex items-center justify-center overflow-hidden bg-linear-to-br',
          IMAGE_GRADIENTS[hash(node.name) % IMAGE_GRADIENTS.length],
          className,
        )}
      >
        <div className="absolute -bottom-6 -left-4 size-24 rounded-full bg-white/40 dark:bg-white/10" />
        <div className="absolute top-4 right-6 size-8 rounded-full bg-white/60 dark:bg-white/15" />
        <Icon className={cn('relative size-9', meta.text)} />
      </div>
    )
  }
  return (
    <div className={cn('flex items-center justify-center', meta.soft, className)}>
      <div className="flex h-[70%] max-h-24 aspect-[3/4] flex-col gap-1.5 rounded-md bg-background/90 p-2.5 shadow-sm ring-1 ring-foreground/5">
        <Icon className={cn('size-4', meta.text)} />
        <span className="h-1 w-full rounded bg-muted" />
        <span className="h-1 w-4/5 rounded bg-muted" />
        <span className="h-1 w-full rounded bg-muted" />
        <span className="h-1 w-3/5 rounded bg-muted" />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                    Cards                                   */
/* -------------------------------------------------------------------------- */

function FolderCard({ node }: { node: DriveNode }) {
  const dispatch = useAppDispatch()
  const index = useAppSelector(selectChildrenIndex)
  const count = index[node.id]?.length ?? 0
  const open = () => dispatch(openNode(node.id))
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={onActivate(open)}
      className="group flex h-14 cursor-pointer items-center gap-3 rounded-xl border bg-card pr-1.5 pl-3 transition hover:border-primary/30 hover:bg-primary/[0.03] hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <NodeIcon node={node} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{node.name}</p>
        <p className="truncate text-xs text-muted-foreground">{count ? `${count} item` : 'Kosong'}</p>
      </div>
      <NodeMenu node={node} className="opacity-60 group-hover:opacity-100" />
    </div>
  )
}

export function FileCard({ node, now, showLocation }: { node: DriveNode; now: number; showLocation?: string }) {
  const dispatch = useAppDispatch()
  const me = useCurrentUser()
  const editor = useAppSelector((s) => s.users.byId[node.updatedBy])
  const open = () => dispatch(openNode(node.id))
  const created = node.createdAt === node.updatedAt
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={onActivate(open)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-card transition hover:border-primary/30 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="flex items-center gap-2 py-1.5 pr-1 pl-3">
        <NodeIcon node={node} size="xs" />
        <p className="min-w-0 flex-1 truncate text-sm font-medium" title={node.name}>
          {node.name}
        </p>
        <NodeMenu node={node} className="opacity-60 group-hover:opacity-100" />
      </div>
      <FileThumb node={node} className="mx-2 aspect-[16/10] rounded-lg" />
      <div className="flex items-center gap-2 px-3 py-2.5">
        <UserAvatar user={editor} size="xs" />
        <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {showLocation ? (
            <>{showLocation}</>
          ) : (
            <>
              {displayName(editor, me)} {created ? 'mengunggah' : 'mengedit'} · {formatRelative(node.updatedAt, now)}
            </>
          )}
        </p>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                    Grid                                    */
/* -------------------------------------------------------------------------- */

export function NodeGrid({ nodes, now }: { nodes: DriveNode[]; now: number }) {
  const folders = nodes.filter((n) => n.kind !== 'file')
  const files = nodes.filter((n) => n.kind === 'file')
  return (
    <div className="space-y-6">
      {folders.length > 0 && (
        <section>
          <h2 className="mb-2.5 text-sm font-medium text-muted-foreground">Folder</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {folders.map((n) => (
              <FolderCard key={n.id} node={n} />
            ))}
          </div>
        </section>
      )}
      {files.length > 0 && (
        <section>
          <h2 className="mb-2.5 text-sm font-medium text-muted-foreground">File</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {files.map((n) => (
              <FileCard key={n.id} node={n} now={now} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                    List                                    */
/* -------------------------------------------------------------------------- */

function SortHeader({
  label,
  k,
  className,
  sortable,
}: {
  label: string
  k: SortKey
  className?: string
  sortable: boolean
}) {
  const dispatch = useAppDispatch()
  const { sortBy, sortDir } = useAppSelector((s) => s.ui)
  const active = sortBy === k
  if (!sortable)
    return <th className={cn('h-10 px-3 text-left text-xs font-medium text-muted-foreground', className)}>{label}</th>
  return (
    <th className={cn('h-10 px-3 text-left text-xs font-medium text-muted-foreground', className)}>
      <button
        onClick={() => dispatch(uiActions.setSort(k))}
        className={cn('inline-flex items-center gap-1 hover:text-foreground', active && 'text-foreground')}
      >
        {label}
        {active && (sortDir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </th>
  )
}

function ListRow({ node, now, location }: { node: DriveNode; now: number; location?: string }) {
  const dispatch = useAppDispatch()
  const me = useCurrentUser()
  const owner = useAppSelector((s) => s.users.byId[node.createdBy])
  const editor = useAppSelector((s) => s.users.byId[node.updatedBy])
  const index = useAppSelector(selectChildrenIndex)
  const open = () => dispatch(openNode(node.id))
  return (
    <tr
      tabIndex={0}
      onClick={open}
      onKeyDown={onActivate(open)}
      className="group cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none"
    >
      <td className="px-3 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <NodeIcon node={node} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{node.name}</p>
            {location && <p className="truncate text-xs text-muted-foreground">{location}</p>}
          </div>
        </div>
      </td>
      <td className="hidden px-3 py-2 md:table-cell">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserAvatar user={owner} size="xs" />
          <span className="truncate">{displayName(owner, me)}</span>
        </div>
      </td>
      <td className="px-3 py-2 text-sm whitespace-nowrap text-muted-foreground">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="block truncate">
              {formatRelative(node.updatedAt, now)}
              <span className="hidden lg:inline"> · {displayName(editor, me)}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {formatDateTime(node.updatedAt)} oleh {editor?.name ?? '—'}
          </TooltipContent>
        </Tooltip>
      </td>
      <td className="hidden px-3 py-2 text-sm text-muted-foreground tabular-nums sm:table-cell">
        {node.kind === 'file' ? formatBytes(node.size) : `${index[node.id]?.length ?? 0} item`}
      </td>
      <td className="w-10 px-1 py-2">
        <NodeMenu node={node} className="opacity-60 group-hover:opacity-100" />
      </td>
    </tr>
  )
}

export function NodeList({
  nodes,
  now,
  locationOf,
  sortable = true,
}: {
  nodes: DriveNode[]
  now: number
  locationOf?: (n: DriveNode) => string
  /** false bila urutan sudah ditentukan (mis. halaman Terbaru). */
  sortable?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full table-fixed">
        <thead className="border-b bg-muted/40">
          <tr>
            <SortHeader label="Nama" k="name" className="w-[55%] md:w-[42%]" sortable={sortable} />
            <th className="hidden h-10 w-[20%] px-3 text-left text-xs font-medium text-muted-foreground md:table-cell">
              Pemilik
            </th>
            <SortHeader label="Terakhir diubah" k="updatedAt" sortable={sortable} />
            <SortHeader label="Ukuran" k="size" className="hidden w-24 sm:table-cell" sortable={sortable} />
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {nodes.map((n) => (
            <ListRow key={n.id} node={n} now={now} location={locationOf?.(n)} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
