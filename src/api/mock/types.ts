import type { ActivityLog, DriveNode, User } from '@/types/drive'

/** Data pengguna di "database" mock — termasuk password (tidak pernah dikirim ke UI). */
export interface UserRecord extends User {
  password: string
}

export interface MockSession {
  userId: string
  device: string
  createdAt: string
}

/** Isi "database" mock yang disimpan di localStorage browser. */
export interface MockDb {
  users: UserRecord[]
  nodes: Record<string, DriveNode>
  logs: ActivityLog[]
  /** token → sesi (meniru tabel sesi di server). */
  sessions: Record<string, MockSession>
}
