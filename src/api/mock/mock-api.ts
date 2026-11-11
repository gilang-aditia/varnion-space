/**
 * Mock server: implementasi `DriveApi` yang berjalan di browser.
 *
 * Meniru perilaku backend sungguhan — aktor dari token, RBAC dicek di "server",
 * setiap aksi dicatat ke log aktivitas, data disimpan (localStorage), dan ada
 * latensi jaringan buatan. Saat backend siap, cukup ganti `VITE_API_MODE=http`.
 */
import { nanoid } from '@reduxjs/toolkit'
import { ApiError, type DriveApi } from '../contract'
import { getAuthToken } from '../token'
import { loadDb, resetDb, saveDb } from './database'
import { INITIAL_VERSION_NOTE, newVersionId } from './versions'
import type { MockDb, UserRecord } from './types'
import {
  accessLabel,
  accessRoleById,
  can,
  canAccessWorkspace,
  canSeeLog,
  canSystem,
  describePermissions,
  isNodeVisible,
  matchAccessRole,
  NODE_PERMISSIONS,
  normalizePermissions,
  resolveNodePermissions,
  type NodePermission,
  type WorkspacePermission,
} from '@/lib/rbac'
import { fileTypeFromName } from '@/lib/file-types'
import { isShareLinkActive, shareLinkSummary } from '@/lib/share-link'
import { isValidEmail, uniqueName as pickUniqueName, validateName } from '@/lib/validation'
import type { AccessEntry, ActivityLog, AvatarColor, DriveNode, FileVersion, PublicNode, User } from '@/types/drive'

const MINUTE = 60_000
const MAX_LOGS = 3000
const AVATAR_COLORS: AvatarColor[] = ['blue', 'violet', 'emerald', 'amber', 'rose', 'cyan', 'orange']

export function createMockApi({ latencyMs = 200 }: { latencyMs?: number } = {}): DriveApi {
  let db: MockDb = loadDb()

  /* ------------------------------- infrastruktur ------------------------------ */

  const delay = () => new Promise((r) => setTimeout(r, latencyMs * (0.6 + Math.random() * 0.8)))
  const nowIso = () => new Date().toISOString()
  /** Salinan data agar objek "server" tidak ikut dibekukan oleh Redux/Immer. */
  const out = <T,>(value: T): T => structuredClone(value)
  const commit = () => saveDb(db)

  /** Bungkus setiap endpoint: latensi → handler → simpan. */
  const endpoint =
    <A extends unknown[], R>(handler: (...args: A) => R) =>
    async (...args: A): Promise<Awaited<R>> => {
      await delay()
      const result = await handler(...args)
      commit()
      return out(result)
    }

  const toPublicUser = (u: UserRecord): User => {
    const copy: Partial<UserRecord> = { ...u }
    delete copy.password
    return copy as User
  }

  function log(entry: Omit<ActivityLog, 'id' | 'at'> & { at?: string }) {
    db.logs.unshift({ ...entry, id: `log-${nanoid(10)}`, at: entry.at ?? nowIso() })
    if (db.logs.length > MAX_LOGS) db.logs.length = MAX_LOGS
  }

  /** Aktor bila ada sesi valid; null untuk pengunjung tanpa login (endpoint publik). */
  function optionalActor(): UserRecord | null {
    const token = getAuthToken()
    const session = token ? db.sessions[token] : undefined
    const user = session && db.users.find((u) => u.id === session.userId)
    return user && user.status === 'active' ? user : null
  }

  /** Aktor dari token sesi — persis seperti middleware auth di server. */
  function actor(): UserRecord {
    const token = getAuthToken()
    const session = token ? db.sessions[token] : undefined
    const user = session && db.users.find((u) => u.id === session.userId)
    if (!user || user.status !== 'active') throw new ApiError('UNAUTHORIZED', 'Sesi berakhir. Silakan masuk kembali.')
    return user
  }

  function getNode(id: string): DriveNode {
    const node = db.nodes[id]
    if (!node) throw new ApiError('NOT_FOUND', 'Item tidak ditemukan.')
    return node
  }

  function isInTrash(id: string): boolean {
    for (let n: DriveNode | undefined = db.nodes[id]; n; n = n.parentId ? db.nodes[n.parentId] : undefined) {
      if (n.deletedAt) return true
    }
    return false
  }

  function subtreeIds(id: string): string[] {
    const ids = [id]
    for (let i = 0; i < ids.length; i++) {
      for (const n of Object.values(db.nodes)) if (n.parentId === ids[i]) ids.push(n.id)
    }
    return ids
  }

  const siblingsOf = (parentId: string | null) =>
    Object.values(db.nodes).filter((n) => n.parentId === parentId && !n.deletedAt)

  function assertValidName(parentId: string | null, name: string, excludeId?: string) {
    const error = validateName(name, siblingsOf(parentId), excludeId)
    if (error) throw new ApiError('VALIDATION', error, { field: 'name' })
  }

  /** "Laporan.pdf" → "Laporan (1).pdf" bila nama sudah dipakai. */
  function uniqueName(parentId: string, name: string, taken = new Set<string>()) {
    return pickUniqueName(name, [...taken, ...siblingsOf(parentId).map((n) => n.name)])
  }

  /** Izin level workspace (anggota, sampah). */
  function authorizeWorkspace(nodeId: string, permission: WorkspacePermission, what: string) {
    const user = actor()
    const node = getNode(nodeId)
    const ws = getNode(node.workspaceId)
    if (!canAccessWorkspace(user, ws)) throw new ApiError('NOT_FOUND', 'Item tidak ditemukan.')
    if (!can(user, ws, permission))
      throw new ApiError('FORBIDDEN', `Peran Anda tidak memiliki izin untuk ${what}.`)
    return { user, node, ws }
  }

  /** Izin pada folder/file (ACL): lihat, unduh, edit, hapus, bagikan. */
  function authorizeNode(nodeId: string, permission: NodePermission, what: string) {
    const user = actor()
    const node = getNode(nodeId)
    const ws = getNode(node.workspaceId)
    if (!isNodeVisible(user, node, db.nodes)) throw new ApiError('NOT_FOUND', 'Item tidak ditemukan.')
    if (!resolveNodePermissions(user, node, db.nodes)[permission])
      throw new ApiError('FORBIDDEN', `Anda tidak memiliki izin untuk ${what}.`)
    return { user, node, ws }
  }

  /** Node + izin efektif aktor (`myPermissions`) — bentuk yang dikirim ke client. */
  const present = (user: UserRecord, node: DriveNode): DriveNode => ({
    ...node,
    myPermissions: resolveNodePermissions(user, node, db.nodes),
  })

  /** Hanya field yang aman dikirim ke pengunjung tanpa login. */
  const toPublicNode = (n: DriveNode, isRoot = false): PublicNode => ({
    id: n.id,
    kind: n.kind,
    name: n.name,
    parentId: isRoot ? null : n.parentId,
    fileType: n.fileType,
    size: n.size,
    version: n.version,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  })

  /** Node milik access key yang masih berlaku (aktif, belum kedaluwarsa, tidak di sampah). */
  function findActiveShare(key: string) {
    const node = Object.values(db.nodes).find((n) => n.shareLink?.key === key)
    if (!node || !isShareLinkActive(node.shareLink) || isInTrash(node.id))
      throw new ApiError('NOT_FOUND', 'Link tidak valid atau sudah tidak berlaku.')
    return { node, link: node.shareLink! }
  }

  /** Nama subjek aturan akses untuk log: nama pengguna atau "Semua Editor". */
  const subjectName = (e: AccessEntry) =>
    e.subjectType === 'user'
      ? (db.users.find((u) => u.id === e.subjectUserId)?.name ?? 'Pengguna')
      : `Semua ${accessRoleById(e.subjectRoleId)?.label ?? 'peran'}`
  const subjectKey = (e: AccessEntry) => `${e.subjectType}:${e.subjectType === 'user' ? e.subjectUserId : e.subjectRoleId}`

  function requireSystem(permission: Parameters<typeof canSystem>[1], what: string) {
    const user = actor()
    if (!canSystem(user, permission)) throw new ApiError('FORBIDDEN', `Peran Anda tidak memiliki izin untuk ${what}.`)
    return user
  }

  const touch = (node: DriveNode, by: string, at: string) => {
    node.updatedBy = by
    node.updatedAt = at
  }

  const nodeLog = (node: DriveNode) =>
    ({ targetId: node.id, targetName: node.name, targetKind: node.kind, workspaceId: node.workspaceId }) as const

  function addVersion(node: DriveNode, by: string, entry: Omit<FileVersion, 'id' | 'version' | 'createdBy' | 'createdAt'>) {
    const at = nowIso()
    const versions = (node.versions ??= [])
    const version = (versions.at(-1)?.version ?? node.version ?? 1) + 1
    versions.push({ ...entry, id: newVersionId(), version, createdBy: by, createdAt: at })
    node.version = version
    node.size = entry.size
    touch(node, by, at)
    return { version, at }
  }

  function managerCount(ws: DriveNode) {
    return ws.members?.filter((m) => m.role === 'manager').length ?? 0
  }

  function findMember(ws: DriveNode, userId: string) {
    const member = ws.members?.find((m) => m.userId === userId)
    if (!member) throw new ApiError('NOT_FOUND', 'Pengguna bukan anggota workspace ini.')
    return member
  }

  /* --------------------------------- endpoint -------------------------------- */

  return {
    /* ------------------------------- autentikasi ------------------------------ */

    login: endpoint(({ identifier, password, device = 'Browser' }) => {
      const key = identifier.trim().toLowerCase()
      const user = db.users.find((u) => u.email.toLowerCase() === key || u.username.toLowerCase() === key)
      const fail = (reason: string, field: 'identifier' | 'password', message: string, actorId: string | null) => {
        log({
          actorId,
          action: 'login_failed',
          meta: { identifier: identifier.trim(), reason, device, subjectUserId: user?.id },
        })
        commit()
        throw new ApiError(field === 'password' ? 'UNAUTHORIZED' : 'VALIDATION', message, { field })
      }
      if (!user) return fail('Akun tidak ditemukan', 'identifier', 'Email atau username tidak terdaftar.', null)
      if (user.status !== 'active')
        return fail('Akun dinonaktifkan', 'identifier', 'Akun ini dinonaktifkan. Hubungi administrator.', null)
      if (user.password !== password) return fail('Kata sandi salah', 'password', 'Kata sandi yang Anda masukkan salah.', user.id)

      const at = nowIso()
      const token = `mock_${nanoid(32)}`
      db.sessions[token] = { userId: user.id, device, createdAt: at }
      user.online = true
      user.lastLoginAt = at
      log({ actorId: user.id, action: 'login', at, meta: { device } })
      return { token, user: toPublicUser(user) }
    }),

    logout: endpoint(() => {
      const token = getAuthToken()
      const session = token ? db.sessions[token] : undefined
      if (!token || !session) return
      delete db.sessions[token]
      const user = db.users.find((u) => u.id === session.userId)
      if (!user) return
      const at = nowIso()
      user.lastLogoutAt = at
      user.online = Object.values(db.sessions).some((s) => s.userId === user.id)
      log({ actorId: user.id, action: 'logout', at, meta: { device: session.device } })
    }),

    getMe: endpoint(() => toPublicUser(actor())),

    /* ---------------------------------- data ---------------------------------- */

    listUsers: endpoint(() => {
      actor()
      return db.users.map(toPublicUser)
    }),

    listNodes: endpoint(() => {
      const user = actor()
      // termasuk item yang dibagikan ke user walau ia bukan anggota workspace-nya
      return Object.values(db.nodes)
        .filter((n) => !!db.nodes[n.workspaceId] && isNodeVisible(user, n, db.nodes))
        .map((n) => present(user, n))
    }),

    listActivity: endpoint(({ since, limit } = {}) => {
      const user = actor()
      const visible = db.logs.filter((l) => (!since || l.at >= since) && canSeeLog(user, l, db.nodes))
      return limit ? visible.slice(0, limit) : visible
    }),

    /* -------------------------- workspace & anggota --------------------------- */

    createWorkspace: endpoint(({ name, description, color }) => {
      const user = requireSystem('workspace.create', 'membuat workspace')
      assertValidName(null, name)
      const at = nowIso()
      const id = `ws-${nanoid(8)}`
      const ws: DriveNode = {
        id,
        kind: 'workspace',
        name: name.trim(),
        parentId: null,
        workspaceId: id,
        description: description.trim(),
        color,
        members: [{ userId: user.id, role: 'manager', addedAt: at }],
        createdBy: user.id,
        createdAt: at,
        updatedBy: user.id,
        updatedAt: at,
      }
      db.nodes[id] = ws
      log({ actorId: user.id, action: 'create', at, ...nodeLog(ws) })
      return present(user, ws)
    }),

    addMember: endpoint((workspaceId, userId, role) => {
      const { user, ws } = authorizeWorkspace(workspaceId, 'members.manage', 'mengelola anggota')
      const subject = db.users.find((u) => u.id === userId)
      if (!subject) throw new ApiError('NOT_FOUND', 'Pengguna tidak ditemukan.')
      if (ws.members?.some((m) => m.userId === userId))
        throw new ApiError('CONFLICT', `${subject.name} sudah menjadi anggota.`)
      const at = nowIso()
      ;(ws.members ??= []).push({ userId, role, addedAt: at })
      touch(ws, user.id, at)
      log({
        actorId: user.id,
        action: 'member_add',
        at,
        ...nodeLog(ws),
        meta: { subjectUserId: userId, subjectName: subject.name, role },
      })
      return present(user, ws)
    }),

    updateMemberRole: endpoint((workspaceId, userId, role) => {
      const { user, ws } = authorizeWorkspace(workspaceId, 'members.manage', 'mengubah peran anggota')
      const member = findMember(ws, userId)
      if (member.role === role) return present(user, ws)
      if (member.role === 'manager' && managerCount(ws) <= 1)
        throw new ApiError('CONFLICT', 'Workspace harus memiliki minimal satu Pengelola.')
      const from = member.role
      const at = nowIso()
      member.role = role
      touch(ws, user.id, at)
      log({
        actorId: user.id,
        action: 'member_role',
        at,
        ...nodeLog(ws),
        meta: { subjectUserId: userId, subjectName: db.users.find((u) => u.id === userId)?.name, from, to: role },
      })
      return present(user, ws)
    }),

    removeMember: endpoint((workspaceId, userId) => {
      const { user, ws } = authorizeWorkspace(workspaceId, 'members.manage', 'mengeluarkan anggota')
      const member = findMember(ws, userId)
      if (member.role === 'manager' && managerCount(ws) <= 1)
        throw new ApiError('CONFLICT', 'Workspace harus memiliki minimal satu Pengelola.')
      const at = nowIso()
      ws.members = ws.members!.filter((m) => m.userId !== userId)
      touch(ws, user.id, at)
      log({
        actorId: user.id,
        action: 'member_remove',
        at,
        ...nodeLog(ws),
        meta: { subjectUserId: userId, subjectName: db.users.find((u) => u.id === userId)?.name, role: member.role },
      })
      return present(user, ws)
    }),

    /* ------------------------------ folder & file ----------------------------- */

    createFolder: endpoint((parentId, name) => {
      const { user, node: parent, ws } = authorizeNode(parentId, 'canEdit', 'membuat folder di sini')
      assertValidName(parentId, name)
      const at = nowIso()
      const folder: DriveNode = {
        id: `nd-${nanoid(8)}`,
        kind: 'folder',
        name: name.trim(),
        parentId,
        workspaceId: ws.id,
        createdBy: user.id,
        createdAt: at,
        updatedBy: user.id,
        updatedAt: at,
      }
      db.nodes[folder.id] = folder
      log({ actorId: user.id, action: 'create', at, ...nodeLog(folder), meta: { parentName: parent.name } })
      return present(user, folder)
    }),

    uploadFiles: endpoint((parentId, files) => {
      const { user, node: parent, ws } = authorizeNode(parentId, 'canEdit', 'mengunggah file di sini')
      const taken = new Set<string>()
      return files.map((file) => {
        const at = nowIso()
        const name = uniqueName(parentId, file.name, taken)
        taken.add(name.toLowerCase())
        const node: DriveNode = {
          id: `nd-${nanoid(8)}`,
          kind: 'file',
          name,
          parentId,
          workspaceId: ws.id,
          fileType: fileTypeFromName(name),
          size: file.size,
          version: 1,
          versions: [
            { id: newVersionId(), version: 1, size: file.size, note: INITIAL_VERSION_NOTE, createdBy: user.id, createdAt: at },
          ],
          createdBy: user.id,
          createdAt: at,
          updatedBy: user.id,
          updatedAt: at,
        }
        db.nodes[node.id] = node
        log({ actorId: user.id, action: 'upload', at, ...nodeLog(node), meta: { parentName: parent.name } })
        return present(user, node)
      })
    }),

    renameNode: endpoint((id, name) => {
      const node = getNode(id)
      const { user } =
        node.kind === 'workspace'
          ? authorizeWorkspace(id, 'members.manage', 'mengganti nama workspace')
          : authorizeNode(id, 'canEdit', 'mengganti nama')
      const clean = name.trim()
      if (clean === node.name) return present(user, node)
      assertValidName(node.parentId, clean, id)
      const from = node.name
      const at = nowIso()
      node.name = clean
      touch(node, user.id, at)
      log({ actorId: user.id, action: 'rename', at, ...nodeLog(node), meta: { from, to: clean } })
      return present(user, node)
    }),

    moveNode: endpoint((id, targetId) => {
      const { user, node, ws: fromWs } = authorizeNode(id, 'canEdit', 'memindahkan item')
      if (node.kind === 'workspace') throw new ApiError('FORBIDDEN', 'Workspace tidak dapat dipindahkan.')
      if (isInTrash(id)) throw new ApiError('CONFLICT', 'Item di sampah tidak dapat dipindahkan.')
      const { node: target, ws: toWs } = authorizeNode(targetId, 'canEdit', 'menambahkan item ke folder tujuan')
      if (target.kind === 'file' || isInTrash(targetId))
        throw new ApiError('VALIDATION', 'Tujuan harus berupa folder atau workspace yang aktif.')
      if (node.parentId === targetId) throw new ApiError('CONFLICT', `"${node.name}" sudah berada di ${target.name}.`)
      const subtree = subtreeIds(id)
      if (subtree.includes(targetId))
        throw new ApiError('VALIDATION', 'Folder tidak dapat dipindahkan ke dalam dirinya sendiri.')

      const fromParent = node.parentId ? db.nodes[node.parentId] : undefined
      const at = nowIso()
      // nama bentrok di tujuan → beri akhiran, mis. "Laporan (1).pdf"
      node.name = uniqueName(targetId, node.name)
      node.parentId = targetId
      for (const sid of subtree) db.nodes[sid]!.workspaceId = toWs.id
      log({
        actorId: user.id,
        action: 'move',
        at,
        ...nodeLog(node),
        meta: {
          from: fromParent?.name,
          to: target.name,
          fromWorkspaceId: fromWs.id !== toWs.id ? fromWs.id : undefined,
        },
      })
      return subtree.map((sid) => present(user, db.nodes[sid]!))
    }),

    trashNode: endpoint((id) => {
      const { user, node } = authorizeNode(id, 'canDelete', 'menghapus item')
      if (node.kind === 'workspace') throw new ApiError('FORBIDDEN', 'Workspace tidak dapat dihapus dari sini.')
      const at = nowIso()
      node.deletedBy = user.id
      node.deletedAt = at
      log({ actorId: user.id, action: 'delete', at, ...nodeLog(node) })
      return present(user, node)
    }),

    restoreNode: endpoint((id) => {
      const { user, node, ws } = authorizeWorkspace(id, 'trash.restore', 'memulihkan item')
      const at = nowIso()
      // induk sudah tidak ada / masih di sampah → pulihkan ke akar workspace
      if (!node.parentId || !db.nodes[node.parentId] || isInTrash(node.parentId)) node.parentId = ws.id
      delete node.deletedAt
      delete node.deletedBy
      node.name = uniqueName(node.parentId, node.name)
      touch(node, user.id, at)
      log({
        actorId: user.id,
        action: 'restore',
        at,
        ...nodeLog(node),
        meta: { parentName: db.nodes[node.parentId]?.name },
      })
      return present(user, node)
    }),

    purgeNode: endpoint((id) => {
      const { user, node } = authorizeWorkspace(id, 'trash.purge', 'menghapus permanen')
      log({ actorId: user.id, action: 'purge', ...nodeLog(node) })
      const removedIds = subtreeIds(id)
      for (const rid of removedIds) delete db.nodes[rid]
      return { removedIds }
    }),

    recordOpen: endpoint((id, version) => {
      const user = actor()
      const node = getNode(id)
      if (isInTrash(id) || !isNodeVisible(user, node, db.nodes)) return
      const latest = node.versions?.at(-1)?.version
      const oldVersion = version !== undefined && version !== latest ? version : undefined
      const at = nowIso()
      if (oldVersion === undefined) {
        node.lastOpenedBy = user.id
        node.lastOpenedAt = at
      }
      // dedupe: buka item yang sama berkali-kali dalam 10 menit cukup dicatat sekali
      const recentlyLogged = db.logs
        .slice(0, 100)
        .some(
          (l) =>
            l.action === 'open' &&
            l.actorId === user.id &&
            l.targetId === id &&
            l.meta?.version === oldVersion &&
            Date.now() - Date.parse(l.at) < 10 * MINUTE,
        )
      if (!recentlyLogged) {
        log({ actorId: user.id, action: 'open', at, ...nodeLog(node), meta: oldVersion ? { version: oldVersion } : undefined })
      }
    }),

    getDownload: endpoint((id, version) => {
      const { user, node } = authorizeNode(id, 'canDownload', 'mengunduh file')
      const latest = node.versions?.at(-1)?.version
      const oldVersion = version !== undefined && version !== latest ? version : undefined
      log({ actorId: user.id, action: 'download', ...nodeLog(node), meta: oldVersion ? { version: oldVersion } : undefined })
      return { url: null, fileName: node.name }
    }),

    /* ----------------------------- akses folder/file ---------------------------- */

    getNodeAccess: endpoint((id) => {
      const { node } = authorizeNode(id, 'canView', 'melihat akses')
      return node.access ?? []
    }),

    updateNodeAccess: endpoint((id, entries) => {
      const { user, node } = authorizeNode(id, 'canShare', 'mengatur akses')
      if (node.kind === 'workspace')
        throw new ApiError('VALIDATION', 'Akses workspace diatur lewat anggota & peran workspace.')

      // validasi & normalisasi
      const seen = new Set<string>()
      const next: AccessEntry[] = entries.map((e) => {
        const flags = normalizePermissions(e)
        if (e.subjectType === 'user') {
          // boleh siapa saja (termasuk di luar workspace) — item akan muncul di "Dibagikan ke saya"
          const subject = db.users.find((u) => u.id === e.subjectUserId)
          if (!subject) throw new ApiError('VALIDATION', 'Pengguna tidak ditemukan.')
          if (subject.status !== 'active') throw new ApiError('VALIDATION', `Akun ${subject.name} nonaktif.`)
        } else if (!accessRoleById(e.subjectRoleId)) {
          throw new ApiError('VALIDATION', 'Peran akses tidak dikenal.')
        }
        const key = subjectKey(e)
        if (seen.has(key)) throw new ApiError('VALIDATION', 'Setiap subjek hanya boleh punya satu aturan.')
        seen.add(key)
        return e.subjectType === 'user'
          ? { subjectType: 'user', subjectUserId: e.subjectUserId, subjectRoleId: matchAccessRole(flags)?.id ?? null, ...flags }
          : { subjectType: 'role', subjectUserId: null, subjectRoleId: e.subjectRoleId, ...flags }
      })

      // catat perubahan per subjek
      const before = new Map((node.access ?? []).map((e) => [subjectKey(e), e]))
      const at = nowIso()
      for (const e of next) {
        const prev = before.get(subjectKey(e))
        if (prev && NODE_PERMISSIONS.every((k) => prev[k] === e[k])) continue
        log({
          actorId: user.id,
          action: 'access_grant',
          at,
          ...nodeLog(node),
          meta: {
            subjectUserId: e.subjectUserId ?? undefined,
            subjectName: subjectName(e),
            to: `${accessLabel(e)} (${describePermissions(e)})`,
          },
        })
      }
      for (const [key, prev] of before) {
        if (seen.has(key)) continue
        log({
          actorId: user.id,
          action: 'access_revoke',
          at,
          ...nodeLog(node),
          meta: { subjectUserId: prev.subjectUserId ?? undefined, subjectName: subjectName(prev) },
        })
      }

      node.access = next
      return present(user, node)
    }),

    updateShareLink: endpoint((id, { enabled, canDownload, expiresAt, regenerate }) => {
      const { user, node } = authorizeNode(id, 'canShare', 'mengatur link publik')
      if (node.kind === 'workspace') throw new ApiError('VALIDATION', 'Workspace tidak bisa dibagikan lewat link publik.')
      if (expiresAt && Date.parse(expiresAt) <= Date.now())
        throw new ApiError('VALIDATION', 'Tanggal kedaluwarsa harus di masa depan.', { field: 'expiresAt' })
      const at = nowIso()
      const prev = regenerate ? null : node.shareLink
      node.shareLink = {
        key: prev?.key ?? `pub_${nanoid(24)}`, // access key acak; buat ulang → link lama mati
        enabled,
        canDownload,
        expiresAt,
        createdBy: prev?.createdBy ?? user.id,
        createdAt: prev?.createdAt ?? at,
        updatedAt: at,
      }
      const summary = shareLinkSummary(node.shareLink)
      log({
        actorId: user.id,
        action: 'link_update',
        at,
        ...nodeLog(node),
        meta: { to: regenerate ? `${summary} · link dibuat ulang` : summary },
      })
      return present(user, node)
    }),

    /* ------------------------------ link publik (tanpa login) ----------------------------- */

    getPublicShare: endpoint((key) => {
      const { node, link } = findActiveShare(key)
      const viewer = optionalActor()
      const at = nowIso()
      // catat kunjungan (dedupe 10 menit per pengunjung)
      const recentlyLogged = db.logs
        .slice(0, 100)
        .some(
          (l) =>
            l.action === 'link_view' &&
            l.targetId === node.id &&
            l.actorId === (viewer?.id ?? null) &&
            Date.now() - Date.parse(l.at) < 10 * MINUTE,
        )
      if (!recentlyLogged) {
        log({
          actorId: viewer?.id ?? null,
          action: 'link_view',
          at,
          ...nodeLog(node),
          meta: viewer ? undefined : { identifier: 'Pengunjung tanpa login' },
        })
      }
      const descendants =
        node.kind === 'folder'
          ? subtreeIds(node.id)
              .slice(1)
              .filter((nid) => !isInTrash(nid))
              .map((nid) => toPublicNode(db.nodes[nid]!))
          : []
      return {
        key,
        permissions: { canView: true, canDownload: link.canDownload },
        expiresAt: link.expiresAt,
        sharedBy: db.users.find((u) => u.id === link.createdBy)?.name ?? 'Varnion Space',
        root: toPublicNode(node, true),
        nodes: descendants,
      }
    }),

    getPublicDownload: endpoint((key, nodeId, version) => {
      const { node: root, link } = findActiveShare(key)
      if (!link.canDownload) throw new ApiError('FORBIDDEN', 'Link ini tidak mengizinkan unduhan.')
      const node = db.nodes[nodeId]
      const insideShare = root.id === nodeId || subtreeIds(root.id).includes(nodeId)
      if (!node || node.kind !== 'file' || !insideShare || isInTrash(nodeId))
        throw new ApiError('NOT_FOUND', 'File tidak ditemukan di link ini.')
      const viewer = optionalActor()
      log({
        actorId: viewer?.id ?? null,
        action: 'link_download',
        ...nodeLog(node),
        meta: { identifier: viewer ? undefined : 'Pengunjung tanpa login', version },
      })
      return { url: null, fileName: node.name }
    }),

    /* -------------------------------- versi file ------------------------------- */

    uploadVersion: endpoint((id, file, note) => {
      const { user, node } = authorizeNode(id, 'canEdit', 'memperbarui file')
      if (node.kind !== 'file') throw new ApiError('VALIDATION', 'Hanya file yang memiliki versi.')
      const cleanNote = note?.trim() || 'Memperbarui file'
      const { version, at } = addVersion(node, user.id, { size: file.size, note: cleanNote })
      log({ actorId: user.id, action: 'edit', at, ...nodeLog(node), meta: { version, note: cleanNote } })
      return present(user, node)
    }),

    restoreVersion: endpoint((id, fromVersion) => {
      const { user, node } = authorizeNode(id, 'canEdit', 'memulihkan versi file')
      const source = node.versions?.find((v) => v.version === fromVersion)
      if (!source) throw new ApiError('NOT_FOUND', `Versi ${fromVersion} tidak ditemukan.`)
      if (fromVersion === node.versions?.at(-1)?.version)
        throw new ApiError('CONFLICT', 'Versi tersebut sudah merupakan versi terbaru.')
      const note = `Memulihkan versi ${fromVersion}`
      const { version, at } = addVersion(node, user.id, { size: source.size, note, restoredFrom: fromVersion })
      log({
        actorId: user.id,
        action: 'version_restore',
        at,
        ...nodeLog(node),
        meta: { version, restoredFrom: fromVersion, note },
      })
      return present(user, node)
    }),

    /* -------------------------------- pengguna -------------------------------- */

    createUser: endpoint((input) => {
      const admin = requireSystem('users.manage', 'menambah pengguna')
      const email = input.email.trim().toLowerCase()
      const username = input.username.trim().toLowerCase()
      if (!input.name.trim()) throw new ApiError('VALIDATION', 'Nama wajib diisi.', { field: 'name' })
      if (!isValidEmail(email)) throw new ApiError('VALIDATION', 'Format email tidak valid.', { field: 'email' })
      if (input.password.length < 8)
        throw new ApiError('VALIDATION', 'Kata sandi minimal 8 karakter.', { field: 'password' })
      if (db.users.some((u) => u.email.toLowerCase() === email))
        throw new ApiError('CONFLICT', 'Email sudah terdaftar.', { field: 'email' })
      if (db.users.some((u) => u.username.toLowerCase() === username))
        throw new ApiError('CONFLICT', 'Username sudah dipakai.', { field: 'username' })
      const at = nowIso()
      const user: UserRecord = {
        id: `u-${nanoid(8)}`,
        name: input.name.trim(),
        email,
        username,
        password: input.password,
        role: input.role,
        status: 'active',
        title: input.title.trim() || 'Anggota tim',
        avatarColor: AVATAR_COLORS[db.users.length % AVATAR_COLORS.length]!,
        online: false,
        createdAt: at,
      }
      db.users.push(user)
      log({
        actorId: admin.id,
        action: 'user_create',
        at,
        meta: { subjectUserId: user.id, subjectName: user.name, role: user.role },
      })
      return toPublicUser(user)
    }),

    updateUser: endpoint((id, { role, status }) => {
      const admin = requireSystem('users.manage', 'mengubah pengguna')
      const user = db.users.find((u) => u.id === id)
      if (!user) throw new ApiError('NOT_FOUND', 'Pengguna tidak ditemukan.')
      if (admin.id === id) throw new ApiError('FORBIDDEN', 'Anda tidak dapat mengubah peran atau status akun sendiri.')
      const meta = { subjectUserId: id, subjectName: user.name }
      if (role && role !== user.role) {
        log({ actorId: admin.id, action: 'user_role', meta: { ...meta, from: user.role, to: role } })
        user.role = role
      }
      if (status && status !== user.status) {
        log({ actorId: admin.id, action: 'user_status', meta: { ...meta, from: user.status, to: status } })
        user.status = status
        if (status === 'inactive') {
          user.online = false
          // cabut semua sesi aktif pengguna yang dinonaktifkan
          for (const [token, s] of Object.entries(db.sessions)) if (s.userId === id) delete db.sessions[token]
        }
      }
      return toPublicUser(user)
    }),

    /* ---------------------------------- demo ---------------------------------- */

    resetDemo: endpoint(() => {
      db = resetDb(db)
    }),
  }
}
