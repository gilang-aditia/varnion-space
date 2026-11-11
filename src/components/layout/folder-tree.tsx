import { memo, useLayoutEffect, useRef } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { vtName } from '@/lib/view-transition'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectAccessibleWorkspaces, selectChildrenIndex, selectRoute } from '@/store/selectors'
import { uiActions } from '@/store/slices/uiSlice'
import { openNode } from '@/store/thunks'
import type { DriveNode } from '@/types/drive'
import { NodeIcon } from '@/components/common/node-icon'
import { useDraggableNode, useDropTarget } from '@/components/drive/drag-move'

/**
 * Pohon navigasi workspace → folder → sub-folder.
 *
 * Baris workspace memakai nama transisi yang sama dengan kartu workspace di
 * beranda, sehingga saat sebuah workspace dibuka kartu-kartunya tampak
 * "berpindah" menjadi baris sidebar ini.
 */
export function FolderTree({ enableTransitions }: { enableTransitions: boolean }) {
  const workspaces = useAppSelector(selectAccessibleWorkspaces)
  return (
    <ul role="tree" aria-label="Struktur workspace" className="space-y-px">
      {workspaces.map((ws) => (
        <TreeNode key={ws.id} node={ws} depth={0} enableTransitions={enableTransitions} />
      ))}
    </ul>
  )
}

const TreeNode = memo(function TreeNode({
  node,
  depth,
  enableTransitions,
}: {
  node: DriveNode
  depth: number
  enableTransitions: boolean
}) {
  const dispatch = useAppDispatch()
  const index = useAppSelector(selectChildrenIndex)
  const expanded = useAppSelector((s) => !!s.ui.expanded[node.id])
  const route = useAppSelector(selectRoute)

  const subfolders = (index[node.id] ?? [])
    .filter((c) => c.kind === 'folder')
    .sort((a, b) => a.name.localeCompare(b.name, 'id'))
  const hasChildren = subfolders.length > 0
  const active = route.page === 'folder' && route.id === node.id
  // Hanya baris workspace yang menjadi tujuan animasi "kartu workspace → sidebar".
  const transitionName = enableTransitions && node.kind === 'workspace' ? vtName(node.id) : undefined
  const rowRef = useRef<HTMLDivElement>(null)
  // drag & drop: baris folder bisa diseret; semua baris (termasuk workspace) bisa menjadi tujuan.
  // Menahan item di atas folder tertutup → folder terbuka otomatis.
  const { dragging, dragProps } = useDraggableNode(node)
  const { over, dropProps } = useDropTarget(node.id, () => dispatch(uiActions.expandPath([node.id])))

  // Pastikan folder aktif terlihat di sidebar (layout effect → terjadi sebelum
  // snapshot "sesudah" view transition diambil, jadi tidak ada lompatan).
  useLayoutEffect(() => {
    if (active) rowRef.current?.scrollIntoView({ block: 'nearest' })
  }, [active])

  return (
    <li role="treeitem" aria-expanded={hasChildren ? expanded : undefined} aria-selected={active}>
      <div
        ref={rowRef}
        {...dragProps}
        {...dropProps}
        className={cn(
          'group/row relative flex h-8 items-center rounded-lg pr-2 text-sm transition-colors',
          transitionName && 'vt-node',
          active
            ? 'bg-primary/10 font-medium text-primary'
            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground',
          dragging && 'opacity-40',
          over && 'bg-primary/15 text-primary ring-2 ring-primary/50',
        )}
        style={{ paddingLeft: 4 + depth * 14 }}
        data-vt-name={transitionName}
      >
        <button
          type="button"
          tabIndex={hasChildren ? 0 : -1}
          aria-label={expanded ? `Tutup ${node.name}` : `Buka ${node.name}`}
          onClick={() => hasChildren && dispatch(uiActions.toggleExpanded(node.id))}
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-foreground/10',
            !hasChildren && 'invisible',
          )}
        >
          <ChevronRight className={cn('size-3.5 transition-transform duration-200', expanded && 'rotate-90')} />
        </button>
        <button
          type="button"
          onClick={() => dispatch(openNode(node.id))}
          className="flex min-w-0 flex-1 items-center gap-2 py-1 pl-1 text-left outline-none"
          title={node.name}
        >
          <NodeIcon node={node} size="xs" />
          <span className="truncate">{node.name}</span>
        </button>
      </div>
      {expanded && hasChildren && (
        <ul role="group" className="space-y-px">
          {subfolders.map((c) => (
            <TreeNode key={c.id} node={c} depth={depth + 1} enableTransitions={enableTransitions} />
          ))}
        </ul>
      )}
    </li>
  )
})
