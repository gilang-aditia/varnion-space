import { ChevronRight, Ellipsis, House } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppDispatch } from '@/store/hooks'
import { navigate } from '@/store/thunks'
import type { DriveNode } from '@/types/drive'
import { NodeIcon } from '@/components/common/node-icon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * Breadcrumb: Semua Workspace › Workspace › Folder › Sub-folder.
 * Jika jalurnya panjang, bagian tengah diringkas menjadi menu "…".
 */
export function Breadcrumbs({ path, className }: { path: DriveNode[]; className?: string }) {
  const dispatch = useAppDispatch()
  const MAX_VISIBLE = 3
  const collapsed = path.length > MAX_VISIBLE ? path.slice(1, path.length - 2) : []
  const visible = collapsed.length ? [path[0]!, ...path.slice(-2)] : path

  const crumbBtn =
    'inline-flex h-7 max-w-44 items-center gap-1.5 rounded-md px-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'

  return (
    <nav aria-label="Breadcrumb" className={cn('min-w-0', className)}>
      <ol className="flex min-w-0 flex-wrap items-center gap-0.5 text-sm">
        <li className="flex items-center">
          <button className={crumbBtn} onClick={() => dispatch(navigate({ page: 'home' }))}>
            <House className="size-3.5" />
            <span className="hidden sm:inline">Semua Workspace</span>
          </button>
        </li>
        {visible.map((node, i) => {
          const isLast = i === visible.length - 1
          return (
            <li key={node.id} className="flex min-w-0 items-center gap-0.5">
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
              {i === 1 && collapsed.length > 0 && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={crumbBtn} aria-label="Tampilkan folder tersembunyi">
                        <Ellipsis className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {collapsed.map((c) => (
                        <DropdownMenuItem key={c.id} onSelect={() => dispatch(navigate({ page: 'folder', id: c.id }))}>
                          <NodeIcon node={c} size="xs" />
                          {c.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
                </>
              )}
              {isLast ? (
                <span
                  aria-current="page"
                  className="inline-flex h-7 min-w-0 items-center gap-1.5 rounded-md px-1.5 font-medium text-foreground"
                >
                  {node.kind === 'workspace' && <NodeIcon node={node} size="xs" />}
                  <span className="truncate">{node.name}</span>
                </span>
              ) : (
                <button className={crumbBtn} onClick={() => dispatch(navigate({ page: 'folder', id: node.id }))}>
                  {node.kind === 'workspace' && <NodeIcon node={node} size="xs" />}
                  <span className="truncate">{node.name}</span>
                </button>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
