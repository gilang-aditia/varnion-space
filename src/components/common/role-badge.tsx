import { Crown, Eye, PencilLine, ScanSearch, ShieldCheck, User as UserIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { accessLabel, describePermissions, matchAccessRole, SYSTEM_ROLE_LABEL, WORKSPACE_ROLE_LABEL } from '@/lib/rbac'
import type { NodePermissions, SystemRole, WorkspaceRole } from '@/types/drive'

const WS_STYLE: Record<WorkspaceRole, { cls: string; icon: typeof Crown }> = {
  manager: { cls: 'bg-primary/10 text-primary', icon: Crown },
  editor: { cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', icon: PencilLine },
  viewer: { cls: 'bg-muted text-muted-foreground', icon: Eye },
}

const SYS_STYLE: Record<SystemRole, { cls: string; icon: typeof Crown }> = {
  admin: { cls: 'bg-primary/10 text-primary', icon: ShieldCheck },
  auditor: { cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400', icon: ScanSearch },
  member: { cls: 'bg-muted text-muted-foreground', icon: UserIcon },
}

export function WorkspaceRoleBadge({
  role,
  icon = true,
  className,
}: {
  role: WorkspaceRole
  /** false → tanpa ikon (mis. di dalam chip yang sudah padat). */
  icon?: boolean
  className?: string
}) {
  const { cls, icon: Icon } = WS_STYLE[role]
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-medium whitespace-nowrap',
        cls,
        className,
      )}
    >
      {icon && <Icon className="size-3" />}
      {WORKSPACE_ROLE_LABEL[role]}
    </span>
  )
}

export function SystemRoleBadge({
  role,
  icon = true,
  className,
}: {
  role: SystemRole
  /** false → tanpa ikon (mis. di dalam chip yang sudah padat). */
  icon?: boolean
  className?: string
}) {
  const { cls, icon: Icon } = SYS_STYLE[role]
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-medium whitespace-nowrap',
        cls,
        className,
      )}
    >
      {icon && <Icon className="size-3" />}
      {SYSTEM_ROLE_LABEL[role]}
    </span>
  )
}

/** Akses efektif pada folder/file: Pengelola / Editor / Pelihat / Kustom / Tanpa akses. */
export function AccessBadge({ permissions, className }: { permissions: NodePermissions; className?: string }) {
  const preset = matchAccessRole(permissions)
  const cls = !permissions.canView
    ? 'bg-destructive/10 text-destructive'
    : preset
      ? WS_STYLE[preset.role].cls
      : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
  return (
    <span
      title={describePermissions(permissions)}
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium whitespace-nowrap',
        cls,
        className,
      )}
    >
      {accessLabel(permissions)}
    </span>
  )
}
