import { useMemo } from 'react'
import { Clock, SearchX } from 'lucide-react'
import { useAppSelector } from '@/store/hooks'
import { getPath, isInTrash, selectAccessibleWorkspaceIds, selectRecent } from '@/store/selectors'
import { useNow } from '@/hooks/use-drive'
import type { DriveNode } from '@/types/drive'
import { EmptyState } from '@/components/common/empty-state'
import { NodeGrid, NodeList } from './node-views'
import { sortNodes } from '@/lib/node-utils'
import { ViewToolbar } from './folder-view'

function useLocationOf() {
  const nodes = useAppSelector((s) => s.drive.nodes)
  return (n: DriveNode) =>
    getPath(nodes, n.id)
      .slice(0, -1)
      .map((p) => p.name)
      .join(' › ')
}

export function SearchResults({ query }: { query: string }) {
  const now = useNow()
  const nodes = useAppSelector((s) => s.drive.nodes)
  const wsIds = useAppSelector(selectAccessibleWorkspaceIds)
  const { viewMode, sortBy, sortDir } = useAppSelector((s) => s.ui)
  const locationOf = useLocationOf()

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const matches = Object.values(nodes).filter(
      (n) => wsIds.has(n.workspaceId) && n.name.toLowerCase().includes(q) && !isInTrash(nodes, n.id),
    )
    return sortNodes(matches, sortBy, sortDir).slice(0, 100)
  }, [nodes, wsIds, query, sortBy, sortDir])

  return (
    <div className="px-4 py-5 sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Hasil pencarian</h1>
          <p className="text-xs text-muted-foreground">
            {results.length} hasil untuk “{query.trim()}” di workspace yang dapat Anda akses
          </p>
        </div>
        <ViewToolbar showDetailsToggle={false} />
      </div>
      {results.length === 0 ? (
        <EmptyState icon={SearchX} title="Tidak ada hasil" description="Coba kata kunci lain atau periksa ejaan." />
      ) : viewMode === 'list' ? (
        <NodeList nodes={results} now={now} locationOf={locationOf} />
      ) : (
        <NodeGrid nodes={results} now={now} />
      )}
    </div>
  )
}

export function RecentView() {
  const now = useNow()
  const recent = useAppSelector(selectRecent)
  const locationOf = useLocationOf()
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-xl font-semibold tracking-tight">Terbaru</h1>
      <p className="mt-0.5 mb-5 text-sm text-muted-foreground">
        File yang terakhir dibuka atau diubah di workspace Anda.
      </p>
      {recent.length === 0 ? (
        <EmptyState icon={Clock} title="Belum ada file" />
      ) : (
        <NodeList nodes={recent} now={now} locationOf={locationOf} sortable={false} />
      )}
    </div>
  )
}
