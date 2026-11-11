/**
 * Implementasi `DriveApi` untuk backend REST.
 * Daftar endpoint & bentuk payload: docs/backend-integration.md
 */
import type { DriveApi } from '../contract'
import type { AccessEntry, ActivityLog, DriveNode, PublicShare } from '@/types/drive'
import { createHttpClient } from './client'
import type { AuthUserDto, LoginRequestDto, LoginResponseDto, LogoutResponseDto, MeDto, RefreshRequestDto, RefreshResponseDto } from '@/types/auth'
import { mapUser } from './user-mapper'
import type { PageQuery, RbacPermissionDto, RbacRoleDto } from '@/types/rbac'
import type { UserDto, UserListQuery } from '@/types/user'

/** Identitas aplikasi & workspace untuk login (lihat .env.example). */
const CLIENT_ID = import.meta.env.VITE_AUTH_CLIENT_ID ?? 'web_browser'
const WORKSPACE_ID = import.meta.env.VITE_WORKSPACE_ID ?? '00000000-0000-0000-0000-000000000001'


const enc = encodeURIComponent

/** `PageQuery` → query string backend (`search` kosong tidak dikirim). */
const pageParams = ({ page, perPage, search }: PageQuery) => ({
  page,
  per_page: perPage,
  search: search.trim() || undefined,
})

export function createHttpApi(baseUrl: string): DriveApi {
  const http = createHttpClient(baseUrl)

  return {
    // Autentikasi
    login: async ({ email, password, rememberMe }) => {
      // body dikirim snake_case: client_id, email, password, remember_me, workspace_id
      const body: LoginRequestDto = { clientId: CLIENT_ID, email, password, rememberMe, workspaceId: WORKSPACE_ID }
      const res = await http.post<LoginResponseDto>('/auth/login', body, { skipRefresh: true })
      return {
        accessToken: res.accessToken,
        refreshToken: res.refreshToken ?? null,
        tokenType: res.tokenType ?? 'Bearer',
        expiresIn: res.expiresIn ?? 0,
        user: mapUser(res.user),
      }
    },
    logout: () => http.post<LogoutResponseDto>('/auth/logout', undefined, { skipRefresh: true }),
    refreshToken: (input: RefreshRequestDto) =>
      http.post<RefreshResponseDto>('/auth/refresh', input, { skipRefresh: true }),
    getMe: () => http.get<MeDto>('/auth/me'),

    // RBAC
    listRoles: (query) => http.getPage<RbacRoleDto>('/rbac/roles', pageParams(query)),
    listPermissions: (query) => http.getPage<RbacPermissionDto>('/rbac/permissions', pageParams(query)),

    // Data
    listUsers: async () => (await http.get<AuthUserDto[]>('/users')).map(mapUser),
    listUsersPaged: (query: UserListQuery) =>
      http.getPage<UserDto>('/users', {
        ...pageParams(query),
        status: query.status || undefined,
        role: query.role || undefined,
      }),
    listNodes: () => http.get<DriveNode[]>('/nodes'),
    listActivity: (query = {}) => http.get<ActivityLog[]>('/activity', { since: query.since, limit: query.limit }),

    // Workspace & anggota
    createWorkspace: (input) => http.post('/workspaces', input),
    addMember: (wsId, userId, role) => http.post(`/workspaces/${enc(wsId)}/members`, { userId, role }),
    updateMemberRole: (wsId, userId, role) => http.patch(`/workspaces/${enc(wsId)}/members/${enc(userId)}`, { role }),
    removeMember: (wsId, userId) => http.delete(`/workspaces/${enc(wsId)}/members/${enc(userId)}`),

    // Folder & file
    createFolder: (parentId, name) => http.post(`/nodes/${enc(parentId)}/folders`, { name }),
    uploadFiles: (parentId, files) => {
      const form = new FormData()
      for (const f of files) form.append('files[]', f, f.name)
      return http.postForm(`/nodes/${enc(parentId)}/files`, form)
    },
    renameNode: (id, name) => http.patch(`/nodes/${enc(id)}`, { name }),
    moveNode: (id, parentId) => http.post(`/nodes/${enc(id)}/move`, { parentId }),
    trashNode: (id) => http.post(`/nodes/${enc(id)}/trash`),
    restoreNode: (id) => http.post(`/nodes/${enc(id)}/restore`),
    purgeNode: (id) => http.delete(`/nodes/${enc(id)}`),
    recordOpen: (id, version) => http.post(`/nodes/${enc(id)}/views`, { version }),
    getDownload: (id, version) => http.get(`/nodes/${enc(id)}/download`, { version }),

    // Akses per folder/file (ACL) — JSON: { can_view, can_download, can_edit, can_delete, can_share,
    //   subject_type, subject_user_id, subject_role_id }
    getNodeAccess: (id) => http.get<AccessEntry[]>(`/nodes/${enc(id)}/access`),
    updateNodeAccess: (id, entries) => http.put(`/nodes/${enc(id)}/access`, { entries }),
    // { enabled, can_download, expires_at, regenerate } → node dengan share_link: { key, … }
    updateShareLink: (id, input) => http.put(`/nodes/${enc(id)}/share-link`, input),

    // Link publik — tanpa login
    getPublicShare: (key) => http.get<PublicShare>(`/public/shares/${enc(key)}`),
    getPublicDownload: (key, nodeId, version) =>
      http.get(`/public/shares/${enc(key)}/download`, { node_id: nodeId, version }),

    // Versi file
    uploadVersion: (id, file, note) => {
      const form = new FormData()
      form.append('file', file, file.name)
      if (note) form.append('note', note)
      return http.postForm(`/files/${enc(id)}/versions`, form)
    },
    restoreVersion: (id, version) => http.post(`/files/${enc(id)}/versions/${version}/restore`),

    // Pengguna
    createUser: (input) => http.post('/users', input),
    updateUser: (id, input) => http.patch(`/users/${enc(id)}`, input),
  }
}
