/** Peran di level sistem (berlaku untuk seluruh aplikasi). */
export type SystemRole = 'admin' | 'auditor' | 'member'

/** Peran di level workspace (berlaku per workspace). */
export type WorkspaceRole = 'manager' | 'editor' | 'viewer'

export type UserStatus = 'active' | 'inactive'

/**
 * Izin RBAC dari backend (`user.permissions` di respons login / `/auth/me`).
 * `string & {}` → izin baru dari backend tetap diterima tanpa mengubah tipe.
 */
export type Permission =
  | 'audit.view'
  | 'file.delete'
  | 'file.download'
  | 'file.share'
  | 'file.update'
  | 'file.upload'
  | 'file.version.restore'
  | 'file.version.view'
  | 'file.view'
  | 'folder.create'
  | 'folder.delete'
  | 'folder.update'
  | 'folder.view'
  | 'members.manage'
  | 'members.view'
  | 'roles.manage'
  | 'storage.manage'
  | 'workspace.manage'
  | 'workspace.view'
  | (string & {})

/** Profil pengguna seperti yang dikirim API (tanpa data rahasia). */
export interface User {
  id: string
  name: string
  email: string
  username: string
  /** Peran utama (diturunkan dari `roles`) — dipakai untuk label & aturan workspace. */
  role: SystemRole
  /** Peran mentah dari backend, mis. `["admin"]`. */
  roles: string[]
  /** Izin RBAC dari backend. Kosong untuk user lain (mis. dari `/users`). */
  permissions: Permission[]
  status: UserStatus
  title: string
  avatarColor: AvatarColor
  online: boolean
  lastLoginAt?: string
  lastLogoutAt?: string
  createdAt: string
}

export type AvatarColor =
  | 'blue'
  | 'violet'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'orange'
  | 'slate'

export type WorkspaceColor = 'blue' | 'violet' | 'emerald' | 'amber' | 'rose' | 'cyan'

export type NodeKind = 'workspace' | 'folder' | 'file'

export type FileType =
  | 'pdf'
  | 'doc'
  | 'sheet'
  | 'slide'
  | 'image'
  | 'video'
  | 'audio'
  | 'archive'
  | 'code'
  | 'text'
  | 'other'

export interface WorkspaceMember {
  userId: string
  role: WorkspaceRole
  addedAt: string
}

/**
 * Izin pada sebuah folder/file. Nama field = flag ACL backend
 * (`can_view`, `can_download`, … — dikonversi otomatis ke camelCase).
 */
export interface NodePermissions {
  canView: boolean
  canDownload: boolean
  canEdit: boolean
  canDelete: boolean
  canShare: boolean
}

/**
 * Satu aturan akses (ACL) pada folder/file, sesuai respons backend:
 * `{ can_view, can_download, can_edit, can_delete, can_share,
 *    subject_type, subject_user_id, subject_role_id }`.
 */
export interface AccessEntry extends NodePermissions {
  /** `user` → berlaku untuk satu pengguna; `role` → untuk semua anggota dengan peran tsb. */
  subjectType: 'user' | 'role'
  subjectUserId: string | null
  /** Peran akses: subjek (untuk `role`) atau preset yang dipakai (untuk `user`). */
  subjectRoleId: string | null
}

/**
 * Link publik ("siapa saja yang punya link") sebuah folder/file.
 * `key` adalah access key dari backend → URL publik: `/#/s/<key>`.
 */
export interface ShareLink {
  key: string
  enabled: boolean
  /** Pengunjung tanpa login selalu bisa melihat; unduh opsional. */
  canDownload: boolean
  /** null = tidak kedaluwarsa. */
  expiresAt: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

/** Node versi publik — hanya field yang aman dilihat tanpa login. */
export type PublicNode = Pick<
  DriveNode,
  'id' | 'kind' | 'name' | 'parentId' | 'fileType' | 'size' | 'version' | 'createdAt' | 'updatedAt'
>

/** Isi halaman link publik (tanpa login). */
export interface PublicShare {
  key: string
  permissions: { canView: boolean; canDownload: boolean }
  expiresAt: string | null
  /** Nama pembuat link (tanpa id / email). */
  sharedBy: string
  root: PublicNode
  /** Seluruh isi folder (kosong untuk file). */
  nodes: PublicNode[]
}

/** Satu versi file — mirip satu commit di GitLab. */
export interface FileVersion {
  /** Hash pendek ala commit SHA, mis. "a1b2c3d4". */
  id: string
  version: number
  size: number
  createdBy: string
  createdAt: string
  /** Catatan perubahan (seperti commit message). */
  note: string
  /** Bila versi ini hasil pemulihan dari versi lama. */
  restoredFrom?: number
}

export interface DriveNode {
  id: string
  kind: NodeKind
  name: string
  /** null untuk workspace (root). */
  parentId: string | null
  /** Untuk workspace = id dirinya sendiri. */
  workspaceId: string
  // --- file ---
  fileType?: FileType
  size?: number
  /** Nomor versi saat ini (= versi terakhir di `versions`). */
  version?: number
  /** Riwayat versi, urut dari yang paling lama. */
  versions?: FileVersion[]
  // --- akses per folder/file ---
  /** Aturan akses khusus pada node ini; berlaku juga untuk isinya kecuali ditimpa. */
  access?: AccessEntry[]
  /** Izin efektif user yang sedang login — dihitung server. */
  myPermissions?: NodePermissions
  /** Link publik tanpa login (folder/file). */
  shareLink?: ShareLink | null
  // --- workspace ---
  description?: string
  color?: WorkspaceColor
  members?: WorkspaceMember[]
  // --- jejak audit ---
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
  lastOpenedBy?: string
  lastOpenedAt?: string
  deletedBy?: string
  deletedAt?: string
}

export type ActivityAction =
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'open'
  | 'create'
  | 'upload'
  | 'edit'
  | 'version_restore'
  | 'rename'
  | 'move'
  | 'delete'
  | 'restore'
  | 'purge'
  | 'download'
  | 'member_add'
  | 'member_role'
  | 'member_remove'
  | 'access_grant'
  | 'access_revoke'
  | 'link_update'
  | 'link_view'
  | 'link_download'
  | 'user_create'
  | 'user_role'
  | 'user_status'

export interface ActivityLog {
  id: string
  at: string
  /** null bila aktor tidak dikenali (mis. gagal login dengan akun tak terdaftar). */
  actorId: string | null
  action: ActivityAction
  targetId?: string
  targetName?: string
  targetKind?: NodeKind
  workspaceId?: string
  meta?: {
    from?: string
    to?: string
    role?: string
    subjectUserId?: string
    subjectName?: string
    identifier?: string
    reason?: string
    device?: string
    parentName?: string
    version?: number
    /** Catatan perubahan versi. */
    note?: string
    /** Nomor versi lama yang dipulihkan. */
    restoredFrom?: number
    /** Pindah antar workspace: workspace asal (log juga terlihat oleh anggotanya). */
    fromWorkspaceId?: string
  }
}
