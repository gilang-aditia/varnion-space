import { useMemo, useState } from 'react'
import { Download, FileClock, LogIn, PencilLine, RotateCcw, Search, ShieldX, Trash } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ACTIVITY_CATEGORY_LABEL, ACTIVITY_META, type ActivityCategory } from '@/lib/activity'
import { formatDateTime, formatRelative } from '@/lib/format'
import { canSystem, SYSTEM_ROLE_LABEL, WORKSPACE_ROLE_LABEL } from '@/lib/rbac'
import { useAppSelector } from '@/store/hooks'
import { selectAccessibleWorkspaces, selectUsers, selectLogs } from '@/store/selectors'
import { useCurrentUser, useNow } from '@/hooks/use-drive'
import type { ActivityLog, DriveNode, SystemRole, User, WorkspaceRole } from '@/types/drive'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/common/empty-state'
import { UserAvatar } from '@/components/common/user-avatar'
import { GroupedLogs } from '@/components/drive/details-panel'

type Range = 'today' | '7d' | '30d' | 'all'
const RANGE_LABEL: Record<Range, string> = {
  today: 'Hari ini',
  '7d': '7 hari terakhir',
  '30d': '30 hari terakhir',
  all: 'Semua waktu',
}

function rangeStart(range: Range): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  if (range === 'today') return d.getTime()
  if (range === '7d') return d.getTime() - 6 * 86_400_000
  if (range === '30d') return d.getTime() - 29 * 86_400_000
  return 0
}

/* ------------------------------- CSV export ------------------------------- */

function plainDetail(l: ActivityLog): string {
  const m = l.meta ?? {}
  const ws = (r?: string) => (r ? (WORKSPACE_ROLE_LABEL[r as WorkspaceRole] ?? r) : '')
  const sys = (r?: string) => (r ? (SYSTEM_ROLE_LABEL[r as SystemRole] ?? r) : '')
  switch (l.action) {
    case 'rename':
      return `${m.from} → ${m.to}`
    case 'edit':
      return [m.version ? `versi ${m.version}` : '', m.note ?? ''].filter(Boolean).join(' — ')
    case 'version_restore':
      return `versi ${m.restoredFrom} dipulihkan sebagai versi ${m.version}`
    case 'open':
    case 'download':
      return m.version ? `versi ${m.version}` : ''
    case 'login_failed':
      return `${m.reason ?? ''} (${m.identifier ?? ''})`
    case 'member_add':
      return `${m.subjectName} sebagai ${ws(m.role)}`
    case 'member_role':
      return `${m.subjectName}: ${ws(m.from)} → ${ws(m.to)}`
    case 'member_remove':
      return `${m.subjectName}`
    case 'user_create':
      return `${m.subjectName} (${sys(m.role)})`
    case 'user_role':
      return `${m.subjectName}: ${sys(m.from)} → ${sys(m.to)}`
    case 'user_status':
      return `${m.subjectName}: ${m.to === 'inactive' ? 'dinonaktifkan' : 'diaktifkan'}`
    default:
      return m.parentName ? `di ${m.parentName}` : ''
  }
}

function exportCsv(logs: ActivityLog[], users: Record<string, User>, nodes: Record<string, DriveNode>) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const header = ['Waktu', 'Pengguna', 'Email', 'Aksi', 'Target', 'Jenis', 'Workspace', 'Detail', 'Perangkat']
  const rows = logs.map((l) => {
    const u = l.actorId ? users[l.actorId] : undefined
    return [
      formatDateTime(l.at),
      u?.name ?? (l.meta?.identifier ? `(tidak dikenal: ${l.meta.identifier})` : '—'),
      u?.email ?? '',
      ACTIVITY_META[l.action].label,
      l.targetName ?? '',
      l.targetKind ?? '',
      l.workspaceId ? (nodes[l.workspaceId]?.name ?? '') : '',
      plainDetail(l),
      l.meta?.device ?? '',
    ]
      .map(esc)
      .join(',')
  })
  const blob = new Blob(['﻿' + [header.map(esc).join(','), ...rows].join('\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `log-aktivitas-varnion-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

/* --------------------------------- Widgets -------------------------------- */

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof LogIn
  label: string
  value: number
  tone: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <span className={cn('flex size-9 items-center justify-center rounded-lg', tone)}>
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-lg leading-tight font-semibold tabular-nums">{value.toLocaleString('id-ID')}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function SessionStatus({ now }: { now: number }) {
  const users = useAppSelector(selectUsers)
  const sorted = [...users].sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1
    return (b.lastLoginAt ?? '').localeCompare(a.lastLoginAt ?? '')
  })
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Status sesi pengguna</h3>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2 rounded-full bg-emerald-500" />
          {users.filter((u) => u.online).length} online
        </span>
      </div>
      <ul className="divide-y">
        {sorted.map((u) => (
          <li key={u.id} className="flex items-center gap-3 px-4 py-2.5">
            <UserAvatar user={u} size="sm" showStatus />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{u.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {u.status === 'inactive'
                  ? 'Akun nonaktif'
                  : u.online
                    ? `Online · masuk ${formatRelative(u.lastLoginAt, now)}`
                    : u.lastLogoutAt
                      ? `Keluar ${formatRelative(u.lastLogoutAt, now)}`
                      : u.lastLoginAt
                        ? `Masuk terakhir ${formatRelative(u.lastLoginAt, now)}`
                        : 'Belum pernah masuk'}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------------------------------- Page ---------------------------------- */

const PAGE = 60

export function ActivityPage() {
  const now = useNow()
  const me = useCurrentUser()
  const logs = useAppSelector(selectLogs)
  const users = useAppSelector(selectUsers)
  const usersById = useAppSelector((s) => s.users.byId)
  const nodes = useAppSelector((s) => s.drive.nodes)
  const workspaces = useAppSelector(selectAccessibleWorkspaces)
  const seeAll = canSystem(me, 'audit.viewAll')

  const [q, setQ] = useState('')
  const [userId, setUserId] = useState('all')
  const [category, setCategory] = useState<'all' | ActivityCategory>('all')
  const [wsId, setWsId] = useState('all')
  const [range, setRange] = useState<Range>('7d')
  const [limit, setLimit] = useState(PAGE)

  const inRange = useMemo(() => {
    const start = rangeStart(range)
    return logs.filter((l) => Date.parse(l.at) >= start)
  }, [logs, range])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return inRange.filter((l) => {
      if (userId !== 'all' && l.actorId !== userId && l.meta?.subjectUserId !== userId) return false
      if (category !== 'all' && ACTIVITY_META[l.action].category !== category) return false
      if (wsId !== 'all' && l.workspaceId !== wsId) return false
      if (needle) {
        const actor = l.actorId ? usersById[l.actorId]?.name : ''
        const hay = [actor, l.targetName, l.meta?.subjectName, l.meta?.from, l.meta?.identifier, ACTIVITY_META[l.action].label]
          .join(' ')
          .toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [inRange, q, userId, category, wsId, usersById])

  const stats = useMemo(() => {
    const count = (fn: (l: ActivityLog) => boolean) => inRange.filter(fn).length
    return {
      logins: count((l) => l.action === 'login'),
      changes: count((l) => ACTIVITY_META[l.action].category === 'change'),
      deletes: count((l) => ACTIVITY_META[l.action].category === 'delete'),
      failed: count((l) => l.action === 'login_failed'),
    }
  }, [inRange])

  const hasFilter = q || userId !== 'all' || category !== 'all' || wsId !== 'all'
  const reset = () => {
    setQ('')
    setUserId('all')
    setCategory('all')
    setWsId('all')
    setLimit(PAGE)
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Log Aktivitas</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {seeAll
              ? 'Seluruh aktivitas di Varnion Space: masuk, keluar, membuka, mengedit, menghapus, dan perubahan akses.'
              : 'Aktivitas Anda dan aktivitas di workspace tempat Anda menjadi anggota.'}
          </p>
        </div>
        <Button variant="outline" className="gap-1.5" onClick={() => exportCsv(filtered, usersById, nodes)} disabled={!filtered.length}>
          <Download className="size-4" />
          Ekspor CSV
        </Button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={LogIn} label={`Login · ${RANGE_LABEL[range].toLowerCase()}`} value={stats.logins} tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <Stat icon={PencilLine} label="Perubahan file" value={stats.changes} tone="bg-primary/10 text-primary" />
        <Stat icon={Trash} label="Penghapusan" value={stats.deletes} tone="bg-red-500/10 text-red-600 dark:text-red-400" />
        <Stat icon={ShieldX} label="Gagal masuk" value={stats.failed} tone="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2">
            <div className="relative min-w-48 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setLimit(PAGE)
                }}
                placeholder="Cari pengguna, file, folder…"
                className="h-8 w-full rounded-lg bg-transparent pr-2 pl-8 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Select value={range} onValueChange={(v) => (setRange(v as Range), setLimit(PAGE))}>
              <SelectTrigger size="sm" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {RANGE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={(v) => (setCategory(v as typeof category), setLimit(PAGE))}>
              <SelectTrigger size="sm" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="all">Semua jenis aksi</SelectItem>
                {(Object.keys(ACTIVITY_CATEGORY_LABEL) as ActivityCategory[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {ACTIVITY_CATEGORY_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={userId} onValueChange={(v) => (setUserId(v), setLimit(PAGE))}>
              <SelectTrigger size="sm" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="all">Semua pengguna</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    <UserAvatar user={u} size="xs" />
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={wsId} onValueChange={(v) => (setWsId(v), setLimit(PAGE))}>
              <SelectTrigger size="sm" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="all">Semua workspace</SelectItem>
                {workspaces.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilter && (
              <Button variant="ghost" size="sm" onClick={reset} className="gap-1 text-muted-foreground">
                <RotateCcw className="size-3.5" />
                Reset
              </Button>
            )}
          </div>

          <p className="mt-3 mb-1 text-xs text-muted-foreground">
            Menampilkan {Math.min(limit, filtered.length).toLocaleString('id-ID')} dari{' '}
            {filtered.length.toLocaleString('id-ID')} aktivitas
          </p>

          {filtered.length === 0 ? (
            <EmptyState icon={FileClock} title="Tidak ada aktivitas" description="Ubah filter atau rentang waktu." />
          ) : (
            <div className="rounded-xl border bg-background px-4 py-2">
              <GroupedLogs logs={filtered.slice(0, limit)} now={now} compact={false} showWorkspace />
              {limit < filtered.length && (
                <div className="border-t py-3 text-center">
                  <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE)}>
                    Muat lebih banyak
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {seeAll && (
          <aside className="space-y-4">
            <SessionStatus now={now} />
          </aside>
        )}
      </div>
    </div>
  )
}
