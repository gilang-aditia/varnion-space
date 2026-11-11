import type { ReactNode } from 'react'
import { Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ACTIVITY_META, KIND_LABEL } from '@/lib/activity'
import { formatDateTime, formatRelative, formatTime } from '@/lib/format'
import { SYSTEM_ROLE_LABEL, WORKSPACE_ROLE_LABEL } from '@/lib/rbac'
import { WORKSPACE_COLORS } from '@/lib/colors'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { isInTrash, selectAccessibleWorkspaceIds } from '@/store/selectors'
import { openNode } from '@/store/thunks'
import { useCurrentUser } from '@/hooks/use-drive'
import type { ActivityLog, SystemRole, WorkspaceRole } from '@/types/drive'
import { UserAvatar } from '@/components/common/user-avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const wsRole = (r?: string) => (r ? (WORKSPACE_ROLE_LABEL[r as WorkspaceRole] ?? r) : '')
const sysRole = (r?: string) => (r ? (SYSTEM_ROLE_LABEL[r as SystemRole] ?? r) : '')

function Strong({ children }: { children: ReactNode }) {
  return <span className="font-medium text-foreground">{children}</span>
}

/** Nama target yang bisa diklik untuk membuka item (bila masih ada & dapat diakses). */
function TargetLink({ log }: { log: ActivityLog }) {
  const dispatch = useAppDispatch()
  const node = useAppSelector((s) => (log.targetId ? s.drive.nodes[log.targetId] : undefined))
  const nodes = useAppSelector((s) => s.drive.nodes)
  const accessible = useAppSelector(selectAccessibleWorkspaceIds)
  const name = log.targetName ?? node?.name ?? 'item'
  const openable = node && accessible.has(node.workspaceId) && !isInTrash(nodes, node.id)
  if (!openable) return <Strong>{name}</Strong>
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        dispatch(openNode(node.id))
      }}
      className="font-medium text-foreground underline-offset-2 hover:text-primary hover:underline"
    >
      {name}
    </button>
  )
}

/** Kalimat deskripsi aktivitas. */
function ActivitySentence({ log, actorName }: { log: ActivityLog; actorName: ReactNode }) {
  const m = log.meta ?? {}
  const kind = log.targetKind ? KIND_LABEL[log.targetKind] : 'item'
  const target = <TargetLink log={log} />
  const subject = <Strong>{m.subjectName ?? 'pengguna'}</Strong>

  let body: ReactNode
  switch (log.action) {
    case 'login':
      body = <>masuk ke sistem</>
      break
    case 'logout':
      body = <>keluar dari sistem</>
      break
    case 'login_failed':
      if (!log.actorId)
        return (
          <>
            Percobaan masuk sebagai <Strong>{m.identifier}</Strong> gagal
            {m.reason && <span className="text-destructive"> — {m.reason.toLowerCase()}</span>}
          </>
        )
      body = (
        <>
          gagal masuk{m.reason && <span className="text-destructive"> — {m.reason.toLowerCase()}</span>}
        </>
      )
      break
    case 'open':
      body = m.version ? (
        <>
          membuka <Strong>versi {m.version}</Strong> dari file {target}
        </>
      ) : (
        <>
          membuka {kind} {target}
        </>
      )
      break
    case 'download':
      body = (
        <>
          mengunduh {target}
          {m.version && <span className="text-muted-foreground"> (versi {m.version})</span>}
        </>
      )
      break
    case 'create':
      body = (
        <>
          membuat {kind} {target}
          {m.parentName && (
            <>
              {' '}
              di <Strong>{m.parentName}</Strong>
            </>
          )}
        </>
      )
      break
    case 'upload':
      body = (
        <>
          mengunggah {target}
          {m.parentName && (
            <>
              {' '}
              ke <Strong>{m.parentName}</Strong>
            </>
          )}
        </>
      )
      break
    case 'edit':
      body = (
        <>
          mengedit {target}
          {m.version && <span className="text-muted-foreground"> (versi {m.version})</span>}
          {m.note && <span className="text-muted-foreground italic"> — “{m.note}”</span>}
        </>
      )
      break
    case 'version_restore':
      body = (
        <>
          memulihkan {target} ke <Strong>versi {m.restoredFrom}</Strong>
          <span className="text-muted-foreground"> (disimpan sebagai versi {m.version})</span>
        </>
      )
      break
    case 'rename':
      body = (
        <>
          mengganti nama <Strong>{m.from}</Strong> menjadi {target}
        </>
      )
      break
    case 'delete':
      body = (
        <>
          menghapus {kind} {target} <span className="text-muted-foreground">(ke Sampah)</span>
        </>
      )
      break
    case 'restore':
      body = (
        <>
          memulihkan {kind} {target}
        </>
      )
      break
    case 'purge':
      body = (
        <>
          menghapus permanen {kind} <Strong>{log.targetName}</Strong>
        </>
      )
      break
    case 'member_add':
      body = (
        <>
          menambahkan {subject} ke {target} sebagai <Strong>{wsRole(m.role)}</Strong>
        </>
      )
      break
    case 'member_role':
      body = (
        <>
          mengubah peran {subject} di {target}: {wsRole(m.from)} → <Strong>{wsRole(m.to)}</Strong>
        </>
      )
      break
    case 'member_remove':
      body = (
        <>
          mengeluarkan {subject} dari {target}
        </>
      )
      break
    case 'user_create':
      body = (
        <>
          membuat akun {subject} sebagai <Strong>{sysRole(m.role)}</Strong>
        </>
      )
      break
    case 'user_role':
      body = (
        <>
          mengubah peran sistem {subject}: {sysRole(m.from)} → <Strong>{sysRole(m.to)}</Strong>
        </>
      )
      break
    case 'user_status':
      body = m.to === 'inactive' ? <>menonaktifkan akun {subject}</> : <>mengaktifkan kembali akun {subject}</>
      break
  }
  return (
    <>
      {actorName} {body}
    </>
  )
}

export function ActivityItem({
  log,
  compact = false,
  showWorkspace = true,
  now,
}: {
  log: ActivityLog
  compact?: boolean
  showWorkspace?: boolean
  now: number
}) {
  const me = useCurrentUser()
  const actor = useAppSelector((s) =>
    log.actorId ? s.users.byId[log.actorId] : log.meta?.subjectUserId ? s.users.byId[log.meta.subjectUserId] : undefined,
  )
  const ws = useAppSelector((s) => (log.workspaceId ? s.drive.nodes[log.workspaceId] : undefined))
  const meta = ACTIVITY_META[log.action]
  const Icon = meta.icon
  const actorName = log.actorId ? (
    <Strong>{log.actorId === me?.id ? 'Anda' : (actor?.name ?? 'Pengguna terhapus')}</Strong>
  ) : null

  return (
    <div className={cn('group/act flex gap-3', compact ? 'py-2' : 'py-3')}>
      <div className="relative shrink-0">
        <UserAvatar user={actor} size={compact ? 'sm' : 'md'} />
        <span
          className={cn(
            'absolute -right-1 -bottom-1 flex items-center justify-center rounded-full ring-2 ring-background',
            compact ? 'size-3.5 [&_svg]:size-2' : 'size-4 [&_svg]:size-2.5',
            meta.tone,
          )}
        >
          <Icon />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('leading-snug text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
          <ActivitySentence log={log} actorName={actorName} />
        </p>
        <div
          className={cn(
            'mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground',
            compact ? 'text-[11px]' : 'text-xs',
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <time dateTime={log.at} className="tabular-nums">
                {compact ? formatRelative(log.at, now) : `${formatTime(log.at)} · ${formatRelative(log.at, now)}`}
              </time>
            </TooltipTrigger>
            <TooltipContent>{formatDateTime(log.at)}</TooltipContent>
          </Tooltip>
          {showWorkspace && ws && (
            <span className="inline-flex items-center gap-1">
              <span className={cn('size-1.5 rounded-full', WORKSPACE_COLORS[ws.color ?? 'blue'].solid)} />
              {ws.name}
            </span>
          )}
          {!compact && log.meta?.device && (
            <span className="inline-flex items-center gap-1">
              <Monitor className="size-3" />
              {log.meta.device}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
