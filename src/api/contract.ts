/**
 * Kontrak antara frontend dan backend.
 *
 * Seluruh UI hanya berbicara dengan `DriveApi` ini (lewat Redux thunk).
 * Ada dua implementasi:
 *   - `mock/mock-api.ts`  → simulasi server di browser (default, untuk slicing/demo)
 *   - `http/http-api.ts`  → REST API sungguhan (lihat docs/backend-integration.md)
 *
 * Aturan yang WAJIB dipenuhi implementasi mana pun (termasuk backend):
 *   - Aktor ditentukan dari token sesi, bukan dari data yang dikirim client.
 *   - Izin (RBAC + ACL folder/file) dicek di server; UI hanya menyembunyikan/mengunci tombol.
 *   - Setiap node yang dikirim menyertakan `myPermissions` (izin efektif aktor).
 *   - Setiap aksi dicatat ke log aktivitas oleh server.
 *   - `list*` hanya mengembalikan data yang boleh dilihat aktor.
 */
import type {
  PublicShare,
  AccessEntry,
  ActivityLog,
  DriveNode,
  SystemRole,
  User,
  UserStatus,
  WorkspaceColor,
  WorkspaceRole,
} from '@/types/drive'

/* --------------------------------- Inputs --------------------------------- */

export interface LoginInput {
  /** Email atau username. */
  identifier: string
  password: string
  /** Deskripsi perangkat untuk log (opsional; server boleh membaca User-Agent). */
  device?: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface ActivityQuery {
  /** Hanya log dengan `at` >= nilai ini (ISO 8601) — untuk sinkronisasi inkremental. */
  since?: string
  limit?: number
}

export interface CreateWorkspaceInput {
  name: string
  description: string
  color: WorkspaceColor
}

export interface CreateUserInput {
  name: string
  email: string
  username: string
  password: string
  title: string
  role: SystemRole
}

export interface UpdateUserInput {
  role?: SystemRole
  status?: UserStatus
}

export interface ShareLinkInput {
  enabled: boolean
  canDownload: boolean
  /** null = tidak kedaluwarsa. */
  expiresAt: string | null
  /** true → buat access key baru (link lama tidak berlaku lagi). */
  regenerate?: boolean
}

export interface DownloadInfo {
  /** URL unduhan (mis. signed URL). `null` bila storage belum tersedia. */
  url: string | null
  fileName: string
}

/* ---------------------------------- API ---------------------------------- */

export interface DriveApi {
  // Autentikasi
  login(input: LoginInput): Promise<LoginResponse>
  logout(): Promise<void>
  getMe(): Promise<User>

  // Data awal / sinkronisasi
  listUsers(): Promise<User[]>
  /** Semua node (workspace, folder, file — termasuk yang di sampah) yang dapat diakses aktor. */
  listNodes(): Promise<DriveNode[]>
  listActivity(query?: ActivityQuery): Promise<ActivityLog[]>

  // Workspace & anggota
  createWorkspace(input: CreateWorkspaceInput): Promise<DriveNode>
  addMember(workspaceId: string, userId: string, role: WorkspaceRole): Promise<DriveNode>
  updateMemberRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<DriveNode>
  removeMember(workspaceId: string, userId: string): Promise<DriveNode>

  // Folder & file
  createFolder(parentId: string, name: string): Promise<DriveNode>
  uploadFiles(parentId: string, files: File[]): Promise<DriveNode[]>
  renameNode(id: string, name: string): Promise<DriveNode>
  /**
   * Pindahkan node ke folder/workspace lain (boleh antar workspace).
   * Mengembalikan node yang dipindah + seluruh isinya (workspaceId bisa berubah).
   */
  moveNode(id: string, targetParentId: string): Promise<DriveNode[]>
  trashNode(id: string): Promise<DriveNode>
  restoreNode(id: string): Promise<DriveNode>
  /** Hapus permanen node beserta isinya. */
  purgeNode(id: string): Promise<{ removedIds: string[] }>
  /** Catat bahwa aktor membuka node (atau versi tertentu dari file). */
  recordOpen(id: string, version?: number): Promise<void>
  getDownload(id: string, version?: number): Promise<DownloadInfo>

  // Akses per folder/file (ACL)
  /** Aturan akses khusus pada folder/file. */
  getNodeAccess(id: string): Promise<AccessEntry[]>
  /** Ganti seluruh aturan akses folder/file (butuh izin `can_share`). */
  updateNodeAccess(id: string, entries: AccessEntry[]): Promise<DriveNode>
  /** Atur link publik folder/file (butuh izin `can_share`). */
  updateShareLink(id: string, input: ShareLinkInput): Promise<DriveNode>

  // Link publik — TANPA login (tidak butuh token)
  /** Isi link publik. 404 bila key salah, link nonaktif/kedaluwarsa, atau item di sampah. */
  getPublicShare(key: string): Promise<PublicShare>
  /** Unduh lewat link publik (butuh `canDownload` pada link). */
  getPublicDownload(key: string, nodeId: string, version?: number): Promise<DownloadInfo>

  // Versi file
  uploadVersion(id: string, file: File, note?: string): Promise<DriveNode>
  restoreVersion(id: string, version: number): Promise<DriveNode>

  // Pengguna (admin)
  createUser(input: CreateUserInput): Promise<User>
  updateUser(id: string, input: UpdateUserInput): Promise<User>

  /** Khusus mode mock: kembalikan data contoh ke kondisi awal. */
  resetDemo?(): Promise<void>
}

/* --------------------------------- Errors --------------------------------- */

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'NETWORK'
  | 'UNKNOWN'

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  CONFLICT: 409,
  NETWORK: 0,
  UNKNOWN: 500,
}

/** Error yang dilempar implementasi API. Bentuk body error backend: `{ message, code?, field? }`. */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  /** Nama field yang salah (untuk menampilkan error di form). */
  readonly field?: string

  constructor(code: ApiErrorCode, message: string, opts: { status?: number; field?: string } = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = opts.status ?? STATUS_BY_CODE[code]
    this.field = opts.field
  }
}

/** Bentuk error yang aman disimpan di Redux (serializable). */
export interface SerializedApiError {
  code: ApiErrorCode
  status: number
  message: string
  field?: string
}

export function toSerializedError(error: unknown): SerializedApiError {
  if (error instanceof ApiError) {
    return { code: error.code, status: error.status, message: error.message, field: error.field }
  }
  const message = error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui.'
  return { code: 'UNKNOWN', status: 500, message }
}
