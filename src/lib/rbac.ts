import type {
  ActivityLog,
  DriveNode,
  SystemRole,
  User,
  WorkspaceRole,
} from '@/types/drive'

/* -------------------------------------------------------------------------- */
/*                                 Permissions                                */
/* -------------------------------------------------------------------------- */

/** Izin di dalam sebuah workspace. */
export type WorkspacePermission =
  | 'workspace.view'
  | 'file.download'
  | 'file.create'
  | 'file.edit'
  | 'file.delete'
  | 'trash.restore'
  | 'trash.purge'
  | 'members.manage'

/** Izin di level sistem. */
export type SystemPermission =
  | 'users.view'
  | 'users.manage'
  | 'workspace.create'
  | 'audit.viewAll'

export const WORKSPACE_PERMISSION_LABEL: Record<WorkspacePermission, string> = {
  'workspace.view': 'Melihat isi workspace',
  'file.download': 'Mengunduh file',
  'file.create': 'Membuat folder & mengunggah file',
  'file.edit': 'Mengganti nama & memperbarui file',
  'file.delete': 'Memindahkan ke sampah',
  'trash.restore': 'Memulihkan dari sampah',
  'trash.purge': 'Menghapus permanen',
  'members.manage': 'Mengelola anggota & peran',
}

export const SYSTEM_PERMISSION_LABEL: Record<SystemPermission, string> = {
  'users.view': 'Melihat daftar pengguna',
  'users.manage': 'Mengelola pengguna & peran sistem',
  'workspace.create': 'Membuat workspace baru',
  'audit.viewAll': 'Melihat seluruh log aktivitas',
}

export const WORKSPACE_ROLE_PERMISSIONS: Record<WorkspaceRole, WorkspacePermission[]> = {
  manager: [
    'workspace.view',
    'file.download',
    'file.create',
    'file.edit',
    'file.delete',
    'trash.restore',
    'trash.purge',
    'members.manage',
  ],
  editor: ['workspace.view', 'file.download', 'file.create', 'file.edit', 'file.delete'],
  viewer: ['workspace.view', 'file.download'],
}

export const SYSTEM_ROLE_PERMISSIONS: Record<SystemRole, SystemPermission[]> = {
  admin: ['users.view', 'users.manage', 'workspace.create', 'audit.viewAll'],
  auditor: ['users.view', 'audit.viewAll'],
  member: [],
}

/* -------------------------------------------------------------------------- */
/*                                   Labels                                   */
/* -------------------------------------------------------------------------- */

export const SYSTEM_ROLE_LABEL: Record<SystemRole, string> = {
  admin: 'Administrator',
  auditor: 'Auditor',
  member: 'Anggota',
}

export const SYSTEM_ROLE_DESC: Record<SystemRole, string> = {
  admin: 'Akses penuh ke semua workspace, pengguna, dan log.',
  auditor: 'Hanya-baca ke semua workspace dan seluruh log aktivitas.',
  member: 'Akses sesuai keanggotaan workspace.',
}

export const WORKSPACE_ROLE_LABEL: Record<WorkspaceRole, string> = {
  manager: 'Pengelola',
  editor: 'Editor',
  viewer: 'Pelihat',
}

export const WORKSPACE_ROLE_DESC: Record<WorkspaceRole, string> = {
  manager: 'Kendali penuh termasuk anggota & sampah',
  editor: 'Membuat, mengunggah, mengubah, menghapus',
  viewer: 'Hanya melihat dan mengunduh',
}

/* -------------------------------------------------------------------------- */
/*                                  Resolvers                                 */
/* -------------------------------------------------------------------------- */

/**
 * Peran efektif user di sebuah workspace.
 * - admin   → selalu `manager`
 * - auditor → peran keanggotaan, atau `viewer` bila bukan anggota
 * - member  → peran keanggotaan, atau null (tidak punya akses)
 */
export function getWorkspaceRole(
  user: User | null | undefined,
  workspace: DriveNode | null | undefined,
): WorkspaceRole | null {
  if (!user || !workspace) return null
  if (user.role === 'admin') return 'manager'
  const membership = workspace.members?.find((m) => m.userId === user.id)
  if (membership) return membership.role
  if (user.role === 'auditor') return 'viewer'
  return null
}

export function can(
  user: User | null | undefined,
  workspace: DriveNode | null | undefined,
  permission: WorkspacePermission,
): boolean {
  const role = getWorkspaceRole(user, workspace)
  if (!role) return false
  return WORKSPACE_ROLE_PERMISSIONS[role].includes(permission)
}

export function canSystem(user: User | null | undefined, permission: SystemPermission): boolean {
  if (!user) return false
  return SYSTEM_ROLE_PERMISSIONS[user.role].includes(permission)
}

export function canAccessWorkspace(user: User | null | undefined, workspace: DriveNode) {
  return getWorkspaceRole(user, workspace) !== null
}

/**
 * Siapa yang boleh melihat sebuah entri log:
 * - admin/auditor → semua
 * - member → aktivitas miliknya sendiri + aktivitas di workspace tempat ia menjadi anggota
 */
export function canSeeLog(
  user: User | null | undefined,
  log: ActivityLog,
  nodes: Record<string, DriveNode>,
): boolean {
  if (!user) return false
  if (canSystem(user, 'audit.viewAll')) return true
  if (log.actorId === user.id) return true
  if (log.workspaceId) {
    const ws = nodes[log.workspaceId]
    return !!ws && canAccessWorkspace(user, ws)
  }
  return false
}
