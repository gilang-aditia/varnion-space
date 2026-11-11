/** Peran di level sistem (berlaku untuk seluruh aplikasi). */
export type SystemRole = 'admin' | 'auditor' | 'member'

/** Peran di level workspace (berlaku per workspace). */
export type WorkspaceRole = 'manager' | 'editor' | 'viewer'

export type UserStatus = 'active' | 'inactive'

/** Profil pengguna seperti yang dikirim API (tanpa data rahasia). */
export interface User {
  id: string
  name: string
  email: string
  username: string
  role: SystemRole
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
  | 'delete'
  | 'restore'
  | 'purge'
  | 'download'
  | 'member_add'
  | 'member_role'
  | 'member_remove'
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
  }
}
