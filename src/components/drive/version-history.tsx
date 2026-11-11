import { useMemo } from 'react'
import { Copy, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dayKey, formatBytes, formatDateTime, formatDayGroup, formatRelative } from '@/lib/format'
import { displayName } from '@/lib/node-utils'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { uiActions } from '@/store/slices/uiSlice'
import { useCurrentUser } from '@/hooks/use-drive'
import type { FileVersion } from '@/types/drive'
import { UserAvatar } from '@/components/common/user-avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Selisih ukuran ala diff-stat GitLab: +12 KB (hijau) / −3 KB (merah). */
export function SizeDelta({ delta, className }: { delta: number; className?: string }) {
  if (delta === 0) return <span className={cn('text-muted-foreground', className)}>±0</span>
  return (
    <span
      className={cn(
        'tabular-nums',
        delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
        className,
      )}
    >
      {delta > 0 ? '+' : '−'}
      {formatBytes(Math.abs(delta))}
    </span>
  )
}

/** Chip hash versi (seperti short SHA commit) — klik untuk menyalin. */
export function VersionHash({ id, className }: { id: string; className?: string }) {
  const dispatch = useAppDispatch()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            void navigator.clipboard?.writeText(id).catch(() => {})
            dispatch(uiActions.toastAdded({ title: 'Hash versi disalin', description: id, tone: 'info' }))
          }}
          className={cn(
            'inline-flex h-5 items-center gap-1 rounded-md border bg-muted/60 px-1.5 font-mono text-[11px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground',
            className,
          )}
        >
          {id}
          <Copy className="size-2.5 opacity-60" />
        </button>
      </TooltipTrigger>
      <TooltipContent>Salin hash versi</TooltipContent>
    </Tooltip>
  )
}

export function VersionBadge({ version, latest = false, className }: { version: number; latest?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center rounded-md px-1.5 font-mono text-[11px] font-semibold',
        latest ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground/80 ring-1 ring-border',
        className,
      )}
    >
      v{version}
    </span>
  )
}

/**
 * Riwayat versi file bergaya halaman "History" GitLab:
 * dikelompokkan per hari, terbaru di atas, dengan garis timeline.
 */
export function VersionHistory({
  versions,
  selected,
  onSelect,
  now,
}: {
  versions: FileVersion[]
  selected: number
  onSelect: (version: number) => void
  now: number
}) {
  const me = useCurrentUser()
  const users = useAppSelector((s) => s.users.byId)
  const latest = versions.at(-1)?.version
  const sizeOf = useMemo(() => new Map(versions.map((v) => [v.version, v.size])), [versions])

  const groups = useMemo(() => {
    const out: { key: string; label: string; items: FileVersion[] }[] = []
    for (const v of [...versions].reverse()) {
      const k = dayKey(v.createdAt)
      const last = out[out.length - 1]
      if (last?.key === k) last.items.push(v)
      else out.push({ key: k, label: formatDayGroup(v.createdAt), items: [v] })
    }
    return out
  }, [versions])

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <section key={g.key}>
          <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{g.label}</p>
          <ol className="relative">
            {g.items.map((v, i) => {
              const isLatest = v.version === latest
              const isSelected = v.version === selected
              const author = users[v.createdBy]
              const prevSize = sizeOf.get(v.version - 1)
              const isLastInGroup = i === g.items.length - 1
              return (
                <li key={v.id} className="relative pl-6">
                  {/* garis & titik timeline */}
                  {!isLastInGroup && <span className="absolute top-5 bottom-0 left-[7px] w-px bg-border" />}
                  <span
                    className={cn(
                      'absolute top-3.5 left-[3px] size-[9px] rounded-full ring-[3px] ring-background',
                      isLatest ? 'bg-primary' : v.restoredFrom ? 'bg-amber-500' : 'bg-muted-foreground/45',
                    )}
                  />
                  <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    onClick={() => onSelect(v.version)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSelect(v.version)
                      }
                    }}
                    className={cn(
                      'mb-1.5 cursor-pointer rounded-lg border p-2.5 transition focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                      isSelected
                        ? 'border-primary/40 bg-primary/[0.06]'
                        : 'border-transparent hover:border-border hover:bg-muted/50',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <p className="min-w-0 flex-1 text-[13px] leading-snug font-medium">{v.note}</p>
                      <VersionBadge version={v.version} latest={isLatest} />
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <UserAvatar user={author} size="xs" />
                      <span className="truncate">
                        <span className="font-medium text-foreground/80">{displayName(author, me)}</span>{' '}
                        {v.restoredFrom ? 'memulihkan' : v.version === 1 ? 'mengunggah' : 'memperbarui'}
                      </span>
                      <span>·</span>
                      <time dateTime={v.createdAt} title={formatDateTime(v.createdAt)} className="shrink-0">
                        {formatRelative(v.createdAt, now)}
                      </time>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                      <VersionHash id={v.id} />
                      <span className="text-muted-foreground tabular-nums">{formatBytes(v.size)}</span>
                      {prevSize != null && <SizeDelta delta={v.size - prevSize} />}
                      {isLatest && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-px font-medium text-primary">Terbaru</span>
                      )}
                      {v.restoredFrom && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-px font-medium text-amber-700 dark:text-amber-400">
                          <Undo2 className="size-2.5" />
                          dari v{v.restoredFrom}
                        </span>
                      )}
                      {isSelected && !isLatest && (
                        <span className="rounded-full bg-foreground/10 px-1.5 py-px font-medium">Sedang dilihat</span>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}
