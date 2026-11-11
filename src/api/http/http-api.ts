/**
 * Implementasi `DriveApi` untuk backend REST.
 * Daftar endpoint & bentuk payload: docs/backend-integration.md
 */
import type { DriveApi } from '../contract'
import type { ActivityLog, DriveNode, User } from '@/types/drive'
import { createHttpClient } from './client'

const enc = encodeURIComponent

export function createHttpApi(baseUrl: string): DriveApi {
  const http = createHttpClient(baseUrl)

  return {
    // Autentikasi
    login: (input) => http.post('/auth/login', input),
    logout: () => http.post('/auth/logout'),
    getMe: () => http.get<User>('/auth/me'),

    // Data
    listUsers: () => http.get<User[]>('/users'),
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
    trashNode: (id) => http.post(`/nodes/${enc(id)}/trash`),
    restoreNode: (id) => http.post(`/nodes/${enc(id)}/restore`),
    purgeNode: (id) => http.delete(`/nodes/${enc(id)}`),
    recordOpen: (id, version) => http.post(`/nodes/${enc(id)}/views`, { version }),
    getDownload: (id, version) => http.get(`/nodes/${enc(id)}/download`, { version }),

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
