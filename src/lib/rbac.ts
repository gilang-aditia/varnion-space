import type {
  AccessEntry,
  ActivityLog,
  DriveNode,
  NodePermissions,
  Permission,
  SystemRole,
  User,
  WorkspaceRole,
} from '@/types/drive'

/* -------------------------------------------------------------------------- */
/*                                 Permissions                                */
/* -------------------------------------------------------------------------- */

/**
 * Izin level workspace. Izin atas folder/file (lihat, unduh, edit, hapus,
 * bagikan) ada di bagian "Akses folder & file" di bawah.
 */
export type WorkspacePermission = 'workspace.view' | 'trash.restore' | 'trash.purge' | 'members.manage'

/** Izin di level sistem. */
export type SystemPermission =
  | 'users.view'
  | 'users.manage'
  | 'workspace.create'
  | 'audit.viewAll'

export const WORKSPACE_PERMISSION_LABEL: Record<WorkspacePermission, string> = {
  'workspace.view': 'Membuka workspace',
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
  manager: ['workspace.view', 'trash.restore', 'trash.purge', 'members.manage'],
  editor: ['workspace.view'],
  viewer: ['workspace.view'],
}

/**
 * Izin sistem UI → izin RBAC backend yang dibutuhkan. Sumber kebenaran adalah
 * `user.permissions` dari backend (respons login / `/auth/me`).
 */
export const SYSTEM_PERMISSION_REQUIRES: Record<SystemPermission, Permission> = {
  'users.view': 'members.view',
  'users.manage': 'members.manage',
  'workspace.create': 'workspace.manage',
  'audit.viewAll': 'audit.view',
}

/** Cadangan bila user tidak membawa daftar izin (mis. data lama). */
export const SYSTEM_ROLE_PERMISSIONS: Record<SystemRole, SystemPermission[]> = {
  admin: ['users.view', 'users.manage', 'workspace.create', 'audit.viewAll'],
  auditor: ['users.view', 'audit.viewAll'],
  member: [],
}

/* -------------------------------------------------------------------------- */
/*                          Akses folder & file (ACL)                         */
/* -------------------------------------------------------------------------- */

export type NodePermission = keyof NodePermissions

export const NODE_PERMISSIONS: NodePermission[] = ['canView', 'canDownload', 'canEdit', 'canDelete', 'canShare']

export const NODE_PERMISSION_LABEL: Record<NodePermission, string> = {
  canView: 'Lihat',
  canDownload: 'Unduh',
  canEdit: 'Edit',
  canDelete: 'Hapus',
  canShare: 'Bagikan',
}

export const NODE_PERMISSION_DESC: Record<NodePermission, string> = {
  canView: 'Melihat & membuka',
  canDownload: 'Mengunduh file',
  canEdit: 'Mengganti nama, mengunggah, membuat folder, memindahkan',
  canDelete: 'Memindahkan ke sampah',
  canShare: 'Mengatur akses orang lain',
}

const perms = (...granted: NodePermission[]): NodePermissions => ({
  canView: granted.includes('canView'),
  canDownload: granted.includes('canDownload'),
  canEdit: granted.includes('canEdit'),
  canDelete: granted.includes('canDelete'),
  canShare: granted.includes('canShare'),
})

export const NO_ACCESS = perms()
export const FULL_ACCESS = perms(...NODE_PERMISSIONS)

/**
 * Preset peran akses = tabel `roles` di backend (`subject_role_id`).
 * ⚠️ Samakan `id` dengan UUID di database backend.
 */
export const ACCESS_ROLES = [
  { id: '00000000-0000-0000-0000-000000000002', role: 'manager', label: 'Pengelola', permissions: FULL_ACCESS },
  {
    id: '00000000-0000-0000-0000-000000000003',
    role: 'editor',
    label: 'Editor',
    permissions: perms('canView', 'canDownload', 'canEdit', 'canDelete'),
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    role: 'viewer',
    label: 'Pelihat',
    permissions: perms('canView', 'canDownload'),
  },
] as const satisfies readonly { id: string; role: WorkspaceRole; label: string; permissions: NodePermissions }[]

export type AccessRole = (typeof ACCESS_ROLES)[number]

export const accessRoleOf = (role: WorkspaceRole): AccessRole => ACCESS_ROLES.find((r) => r.role === role)!
export const accessRoleById = (id?: string | null) => ACCESS_ROLES.find((r) => r.id === id)

/** Izin default di folder/file berdasarkan peran workspace (bila tidak ada aturan khusus). */
export const defaultPermissions = (role: WorkspaceRole): NodePermissions => accessRoleOf(role).permissions

export const pickPermissions = (p: NodePermissions): NodePermissions => ({
  canView: p.canView,
  canDownload: p.canDownload,
  canEdit: p.canEdit,
  canDelete: p.canDelete,
  canShare: p.canShare,
})

const samePermissions = (a: NodePermissions, b: NodePermissions) => NODE_PERMISSIONS.every((k) => a[k] === b[k])

/** Preset yang cocok persis dengan kumpulan izin (undefined = kustom). */
export const matchAccessRole = (p: NodePermissions) => ACCESS_ROLES.find((r) => samePermissions(r.permissions, p))

/** Label ringkas: "Pengelola" / "Editor" / "Pelihat" / "Tanpa akses" / "Kustom". */
export function accessLabel(p: NodePermissions): string {
  if (!p.canView) return 'Tanpa akses'
  return matchAccessRole(p)?.label ?? 'Kustom'
}

/** "lihat, unduh, edit" */
export function describePermissions(p: NodePermissions): string {
  const granted = NODE_PERMISSIONS.filter((k) => p[k]).map((k) => NODE_PERMISSION_LABEL[k].toLowerCase())
  return granted.length ? granted.join(', ') : 'tidak ada akses'
}

/** Izin tidak konsisten (mis. bisa edit tapi tidak bisa lihat) → tanpa "lihat" berarti tanpa akses. */
export const normalizePermissions = (p: NodePermissions): NodePermissions => (p.canView ? pickPermissions(p) : NO_ACCESS)

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
  manager: 'Kendali penuh termasuk anggota, akses & sampah',
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

/** Izin level workspace (anggota, sampah). */
export function can(
  user: User | null | undefined,
  workspace: DriveNode | null | undefined,
  permission: WorkspacePermission,
): boolean {
  const role = getWorkspaceRole(user, workspace)
  if (!role) return false
  return WORKSPACE_ROLE_PERMISSIONS[role].includes(permission)
}

/** Cek izin RBAC backend secara langsung, mis. `hasPermission(me, 'file.upload')`. */
export function hasPermission(user: User | null | undefined, permission: Permission): boolean {
  return !!user?.permissions?.includes(permission)
}

/** true bila user memiliki salah satu peran backend, mis. `hasRole(me, 'admin')`. */
export function hasRole(user: User | null | undefined, ...roles: string[]): boolean {
  return !!user?.roles?.some((r) => roles.includes(r))
}

export function canSystem(user: User | null | undefined, permission: SystemPermission): boolean {
  if (!user) return false
  if (user.permissions?.length) return hasPermission(user, SYSTEM_PERMISSION_REQUIRES[permission])
  return SYSTEM_ROLE_PERMISSIONS[user.role].includes(permission)
}

export function canAccessWorkspace(user: User | null | undefined, workspace: DriveNode) {
  return getWorkspaceRole(user, workspace) !== null
}

/**
 * Izin efektif user pada sebuah node — aturan yang WAJIB diterapkan server:
 *
 * 1. Administrator & Pengelola workspace → akses penuh (tidak bisa terkunci).
 * 2. Cari aturan akses mulai dari node itu sendiri lalu naik ke folder induk;
 *    aturan pertama yang cocok menang (aturan `user` didahulukan dari `role`).
 * 3. Tidak ada aturan → default dari peran workspace; bukan anggota → tanpa akses.
 *    (Jadi orang di luar workspace hanya bisa mengakses item yang dibagikan ke dia.)
 * 4. Auditor selalu boleh melihat & mengunduh.
 */
export function resolveNodePermissions(
  user: User | null | undefined,
  node: DriveNode,
  nodes: Record<string, DriveNode>,
): NodePermissions {
  if (!user) return NO_ACCESS
  const role = getWorkspaceRole(user, nodes[node.workspaceId])
  if (user.role === 'admin' || role === 'manager') return FULL_ACCESS

  let result = role ? defaultPermissions(role) : NO_ACCESS
  const roleId = role ? accessRoleOf(role).id : null
  for (let n: DriveNode | undefined = node; n && n.kind !== 'workspace'; n = n.parentId ? nodes[n.parentId] : undefined) {
    const entries: AccessEntry[] = n.access ?? []
    const own = entries.find((e) => e.subjectType === 'user' && e.subjectUserId === user.id)
    const byRole = roleId ? entries.filter((e) => e.subjectType === 'role' && e.subjectRoleId === roleId) : []
    if (own) {
      result = pickPermissions(own)
      break
    }
    if (byRole.length) {
      result = NODE_PERMISSIONS.reduce((acc, k) => ({ ...acc, [k]: byRole.some((e) => e[k]) }), NO_ACCESS)
      break
    }
  }
  if (user.role === 'auditor') result = { ...result, canView: true, canDownload: true }
  return normalizePermissions(result)
}

/**
 * Node terlihat bila user boleh melihatnya. Karena aturan diwariskan, isi
 * folder yang disembunyikan ikut tersembunyi — kecuali item di dalamnya
 * dibagikan langsung ke user (muncul di "Dibagikan ke saya").
 */
export function isNodeVisible(user: User | null | undefined, node: DriveNode, nodes: Record<string, DriveNode>) {
  return resolveNodePermissions(user, node, nodes).canView
}

/** Izin efektif dari cache client (hasil hitungan server). */
export const nodePermissions = (node?: DriveNode | null): NodePermissions => node?.myPermissions ?? NO_ACCESS

/**
 * Siapa yang boleh melihat sebuah entri log:
 * - admin/auditor → semua
 * - member → aktivitas miliknya sendiri; aktivitas pada folder/file yang boleh ia
 *   lihat (termasuk yang dibagikan ke dia); aktivitas workspace (mis. anggota) di
 *   workspace tempat ia menjadi anggota
 */
export function canSeeLog(
  user: User | null | undefined,
  log: ActivityLog,
  nodes: Record<string, DriveNode>,
): boolean {
  if (!user) return false
  if (canSystem(user, 'audit.viewAll')) return true
  if (log.actorId === user.id) return true
  // log tentang folder/file mengikuti apakah user boleh melihat item tsb
  const target = log.targetId ? nodes[log.targetId] : undefined
  if (target && target.kind !== 'workspace') return isNodeVisible(user, target, nodes)
  // perpindahan antar workspace terlihat oleh anggota workspace asal maupun tujuan
  return [log.workspaceId, log.meta?.fromWorkspaceId].some((id) => {
    const ws = id ? nodes[id] : undefined
    return !!ws && canAccessWorkspace(user, ws)
  })
}
