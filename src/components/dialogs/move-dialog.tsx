import { useMemo, useState } from 'react'
import { ChevronRight, Search, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppDispatch, useAppSelector, useAppStore } from '@/store/hooks'
import {
  getMoveBlocker,
  getPath,
  selectAccessibleWorkspaces,
  selectSharedWithMe,
  selectChildrenIndex,
} from '@/store/selectors'
import { uiActions } from '@/store/slices/uiSlice'
import type { DriveNode } from '@/types/drive'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { NodeIcon } from '@/components/common/node-icon'

const byName = (a: DriveNode, b: DriveNode) => a.name.localeCompare(b.name, 'id', { numeric: true })
const pathLabel = (nodes: Record<string, DriveNode>, id: string) =>
  getPath(nodes, id)
    .map((n) => n.name)
    .join(' › ')

interface PickerContext {
  movingId: string
  blockers: Map<string, string | null>
  expanded: Set<string>
  selected: string | null
  searching: boolean
  subfolders: (parentId: string) => DriveNode[]
  onSelect: (id: string) => void
  onToggle: (id: string) => void
}

function FolderRow({
  n,
  depth,
  subtitle,
  ctx,
}: {
  n: DriveNode
  depth: number
  subtitle?: string
  ctx: PickerContext
}) {
  const blocker = ctx.blockers.get(n.id) ?? null
  const children = n.id === ctx.movingId ? [] : ctx.subfolders(n.id) // isi folder yang dipindah tidak ditampilkan
  const isOpen = ctx.expanded.has(n.id) && !ctx.searching
  const isSelected = ctx.selected === n.id
  return (
    <li
      role="treeitem"
      aria-selected={isSelected}
      aria-disabled={!!blocker}
      aria-expanded={children.length ? isOpen : undefined}
    >
      <div
        onClick={() => !blocker && ctx.onSelect(n.id)}
        onDoubleClick={() => children.length && ctx.onToggle(n.id)}
        className={cn(
          'flex h-9 items-center gap-2 rounded-lg pr-2 text-sm transition-colors',
          blocker ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer hover:bg-muted',
          isSelected && 'bg-primary/10 font-medium text-primary hover:bg-primary/10',
        )}
        style={{ paddingLeft: 6 + depth * 18 }}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-label={isOpen ? `Tutup ${n.name}` : `Buka ${n.name}`}
          onClick={(e) => {
            e.stopPropagation()
            ctx.onToggle(n.id)
          }}
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-foreground/10',
            (!children.length || ctx.searching) && 'invisible',
          )}
        >
          <ChevronRight className={cn('size-3.5 transition-transform', isOpen && 'rotate-90')} />
        </button>
        <NodeIcon node={n} size="xs" className={cn(blocker && 'opacity-60')} />
        <span className="min-w-0 flex-1">
          <span className="block truncate">{n.name}</span>
          {subtitle && <span className="block truncate text-[11px] text-muted-foreground">{subtitle}</span>}
        </span>
        {blocker && <span className="shrink-0 text-[11px] text-muted-foreground">{blocker}</span>}
      </div>
      {isOpen && children.length > 0 && (
        <ul role="group">
          {children.map((c) => (
            <FolderRow key={c.id} n={c} depth={depth + 1} ctx={ctx} />
          ))}
        </ul>
      )}
    </li>
  )
}

/** Pilih folder/workspace tujuan untuk memindahkan sebuah item. */
export function MoveDialog({ id, initialTarget }: { id: string; initialTarget?: string }) {
  const dispatch = useAppDispatch()
  const store = useAppStore()
  const nodes = useAppSelector((s) => s.drive.nodes)
  const index = useAppSelector(selectChildrenIndex)
  const workspaces = useAppSelector(selectAccessibleWorkspaces)
  // folder yang dibagikan dari workspace lain juga bisa jadi tujuan (bila punya izin edit)
  const sharedFolders = useAppSelector(selectSharedWithMe).filter(
    (n) => n.kind === 'folder' && !!n.parentId && !nodes[n.parentId],
  )
  const node = nodes[id]

  const [selected, setSelected] = useState<string | null>(initialTarget ?? null)
  const [query, setQuery] = useState('')
  // buka jalur lokasi saat ini agar user langsung melihat konteksnya
  const [expanded, setExpanded] = useState<Set<string>>(
    () =>
      new Set(
        [node?.parentId, initialTarget].flatMap((nid) => (nid ? getPath(nodes, nid).slice(0, -1).map((n) => n.id) : [])),
      ),
  )

  /** Alasan tiap folder/workspace tidak bisa dipilih (null = bisa). */
  const blockers = useMemo(() => {
    const state = store.getState()
    const map = new Map<string, string | null>()
    for (const n of Object.values(nodes)) if (n.kind !== 'file') map.set(n.id, getMoveBlocker(state, id, n.id))
    return map
  }, [nodes, store, id])

  const close = () => dispatch(uiActions.closeDialog())
  if (!node) return null

  const subfolders = (parentId: string) => (index[parentId] ?? []).filter((c) => c.kind === 'folder').sort(byName)
  const target = selected ? nodes[selected] : undefined
  const crossWorkspace = target && target.workspaceId !== node.workspaceId

  const toggle = (nid: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(nid)) next.delete(nid)
      else next.add(nid)
      return next
    })

  // lanjut ke layar validasi & konfirmasi sebelum benar-benar memindahkan
  const submit = () => {
    if (selected) dispatch(uiActions.openDialog({ type: 'moveConfirm', id, targetId: selected, fromDialog: true }))
  }

  const q = query.trim().toLowerCase()
  const ctx: PickerContext = {
    movingId: id,
    blockers,
    expanded,
    selected,
    searching: !!q,
    subfolders,
    onSelect: setSelected,
    onToggle: toggle,
  }
  const matches = q
    ? Object.values(nodes)
        .filter(
          (n) =>
            n.kind !== 'file' &&
            blockers.has(n.id) &&
            n.name.toLowerCase().includes(q) &&
            workspaces.some((w) => w.id === n.workspaceId),
        )
        .sort(byName)
        .slice(0, 50)
    : []

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="gap-3 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pindahkan “{node.name}”</DialogTitle>
          <DialogDescription>
            Saat ini di <span className="font-medium text-foreground">{node.parentId ? pathLabel(nodes, node.parentId) : '—'}</span>.
            Pilih folder atau workspace tujuan.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari folder tujuan…"
            aria-label="Cari folder tujuan"
            className="h-9 w-full rounded-lg border border-input bg-transparent pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/30"
          />
        </div>

        <ul role="tree" aria-label="Folder tujuan" className="h-72 overflow-y-auto rounded-xl border p-1.5">
          {q ? (
            matches.length ? (
              matches.map((n) => (
                <FolderRow
                  key={n.id}
                  n={n}
                  depth={0}
                  ctx={ctx}
                  subtitle={n.parentId ? pathLabel(nodes, n.parentId) : 'Workspace'}
                />
              ))
            ) : (
              <li className="py-10 text-center text-sm text-muted-foreground">Folder tidak ditemukan.</li>
            )
          ) : (
            <>
              {workspaces.map((ws) => (
                <FolderRow key={ws.id} n={ws} depth={0} ctx={ctx} />
              ))}
              {sharedFolders.map((f) => (
                <FolderRow key={f.id} n={f} depth={0} ctx={ctx} subtitle="Dibagikan ke saya" />
              ))}
            </>
          )}
        </ul>

        {crossWorkspace && (
          <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            <TriangleAlert className="mt-px size-3.5 shrink-0" />
            Pindah ke workspace lain: anggota “{nodes[target.workspaceId]?.name}” akan dapat mengakses item ini, sedangkan
            anggota “{nodes[node.workspaceId]?.name}” tidak lagi.
          </p>
        )}

        <DialogFooter className="items-center sm:justify-between">
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            {target ? (
              <>
                Tujuan: <span className="font-medium text-foreground">{pathLabel(nodes, target.id)}</span>
              </>
            ) : (
              'Belum ada tujuan dipilih'
            )}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" onClick={close}>
              Batal
            </Button>
            <Button onClick={submit} disabled={!selected}>
              Lanjut
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
