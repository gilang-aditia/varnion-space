import { api, type CreateUserInput, type CreateWorkspaceInput, type UpdateUserInput } from '@/api'
import { WORKSPACE_ROLE_LABEL } from '@/lib/rbac'
import type { DriveNode, User, WorkspaceRole } from '@/types/drive'
import { driveActions } from '../slices/driveSlice'
import { usersActions } from '../slices/usersSlice'
import { createMutation, notify } from './helpers'

/* -------------------------------- Workspace ------------------------------- */

export const createWorkspace = createMutation<DriveNode, CreateWorkspaceInput>(
  'admin/createWorkspace',
  'Gagal membuat workspace',
  async (input, { dispatch }) => {
    const ws = await api.createWorkspace(input)
    dispatch(driveActions.upserted(ws))
    notify(dispatch, `Workspace "${ws.name}" dibuat`)
    return ws
  },
)

interface MemberArgs {
  workspaceId: string
  userId: string
}

export const addMember = createMutation<DriveNode, MemberArgs & { role: WorkspaceRole }>(
  'admin/addMember',
  'Gagal menambah anggota',
  async ({ workspaceId, userId, role }, { dispatch, getState }) => {
    const ws = await api.addMember(workspaceId, userId, role)
    dispatch(driveActions.upserted(ws))
    notify(dispatch, `${getState().users.byId[userId]?.name ?? 'Anggota'} ditambahkan`, 'success', `sebagai ${WORKSPACE_ROLE_LABEL[role]}`)
    return ws
  },
)

export const changeMemberRole = createMutation<DriveNode, MemberArgs & { role: WorkspaceRole }>(
  'admin/changeMemberRole',
  'Gagal mengubah peran',
  async ({ workspaceId, userId, role }, { dispatch, getState }) => {
    const ws = await api.updateMemberRole(workspaceId, userId, role)
    dispatch(driveActions.upserted(ws))
    notify(dispatch, 'Peran diperbarui', 'success', `${getState().users.byId[userId]?.name} → ${WORKSPACE_ROLE_LABEL[role]}`)
    return ws
  },
)

export const removeMember = createMutation<DriveNode, MemberArgs>(
  'admin/removeMember',
  'Gagal mengeluarkan anggota',
  async ({ workspaceId, userId }, { dispatch, getState }) => {
    const ws = await api.removeMember(workspaceId, userId)
    dispatch(driveActions.upserted(ws))
    notify(dispatch, `${getState().users.byId[userId]?.name ?? 'Anggota'} dikeluarkan dari ${ws.name}`, 'info')
    return ws
  },
)

/* -------------------------------- Pengguna -------------------------------- */

export const createUser = createMutation<User, CreateUserInput>(
  'admin/createUser',
  'Gagal menambah pengguna',
  async (input, { dispatch }) => {
    const user = await api.createUser(input)
    dispatch(usersActions.upserted(user))
    notify(dispatch, `Pengguna ${user.name} ditambahkan`)
    return user
  },
)

export const updateUser = createMutation<User, { id: string } & UpdateUserInput>(
  'admin/updateUser',
  'Gagal memperbarui pengguna',
  async ({ id, ...input }, { dispatch }) => {
    const user = await api.updateUser(id, input)
    dispatch(usersActions.upserted(user))
    if (input.status) notify(dispatch, input.status === 'active' ? 'Akun diaktifkan' : 'Akun dinonaktifkan', 'info', user.name)
    else notify(dispatch, 'Peran sistem diperbarui', 'success', user.name)
    return user
  },
)
