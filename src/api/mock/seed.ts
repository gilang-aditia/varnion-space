/**
 * Data contoh (mock backend). Dibangkitkan secara deterministik relatif
 * terhadap waktu "sekarang" agar timeline aktivitas selalu terasa segar.
 *
 * Hanya dipakai oleh mock API (src/api/mock) — backend sungguhan tidak membutuhkannya.
 */
import { fileTypeFromName } from '@/lib/file-types'
import { seededRandom, synthesizeVersions } from './versions'
import type { UserRecord } from './types'
import type {
  ActivityLog,
  AvatarColor,
  DriveNode,
  SystemRole,
  UserStatus,
  WorkspaceColor,
  WorkspaceRole,
} from '@/types/drive'

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const KB = 1024
const MB = 1024 * KB

export const DEMO_PASSWORD = 'varnion123'

/* -------------------------------------------------------------------------- */
/*                                    Users                                   */
/* -------------------------------------------------------------------------- */

interface SeedUser {
  id: string
  name: string
  username: string
  role: SystemRole
  status: UserStatus
  title: string
  avatarColor: AvatarColor
  online: boolean
  device: string
  createdDaysAgo: number
}

const SEED_USERS: SeedUser[] = [
  {
    id: 'u-rizky',
    name: 'Rizky Pratama',
    username: 'rizky',
    role: 'admin',
    status: 'active',
    title: 'IT Administrator',
    avatarColor: 'blue',
    online: false,
    device: 'Chrome · macOS',
    createdDaysAgo: 420,
  },
  {
    id: 'u-sinta',
    name: 'Sinta Maharani',
    username: 'sinta',
    role: 'member',
    status: 'active',
    title: 'Marketing Lead',
    avatarColor: 'rose',
    online: true,
    device: 'Safari · macOS',
    createdDaysAgo: 380,
  },
  {
    id: 'u-budi',
    name: 'Budi Santoso',
    username: 'budi',
    role: 'member',
    status: 'active',
    title: 'Content Specialist',
    avatarColor: 'amber',
    online: false,
    device: 'Chrome · Windows',
    createdDaysAgo: 300,
  },
  {
    id: 'u-dewi',
    name: 'Dewi Lestari',
    username: 'dewi',
    role: 'auditor',
    status: 'active',
    title: 'Internal Auditor',
    avatarColor: 'emerald',
    online: false,
    device: 'Edge · Windows',
    createdDaysAgo: 250,
  },
  {
    id: 'u-andi',
    name: 'Andi Wijaya',
    username: 'andi',
    role: 'member',
    status: 'active',
    title: 'Engineering Manager',
    avatarColor: 'violet',
    online: true,
    device: 'Firefox · Linux',
    createdDaysAgo: 390,
  },
  {
    id: 'u-maya',
    name: 'Maya Putri',
    username: 'maya',
    role: 'member',
    status: 'active',
    title: 'Finance Controller',
    avatarColor: 'cyan',
    online: false,
    device: 'Chrome · Windows',
    createdDaysAgo: 360,
  },
  {
    id: 'u-laras',
    name: 'Laras Anindya',
    username: 'laras',
    role: 'member',
    status: 'active',
    title: 'Product Designer',
    avatarColor: 'orange',
    online: true,
    device: 'Chrome · macOS',
    createdDaysAgo: 34,
  },
  {
    id: 'u-fajar',
    name: 'Fajar Nugroho',
    username: 'fajar',
    role: 'member',
    status: 'inactive',
    title: 'Product Intern (berakhir)',
    avatarColor: 'slate',
    online: false,
    device: 'Chrome · Android',
    createdDaysAgo: 140,
  },
]

/* -------------------------------------------------------------------------- */
/*                                 Drive tree                                 */
/* -------------------------------------------------------------------------- */

interface SeedMeta {
  deleted?: { by: string; hoursAgo: number }
  renamedFrom?: string
}
type SeedFile = SeedMeta & { kind: 'file'; name: string; size: number }
type SeedFolder = SeedMeta & { kind: 'folder'; name: string; children: SeedEntry[] }
type SeedEntry = SeedFile | SeedFolder

const folder = (name: string, children: SeedEntry[] = [], meta: SeedMeta = {}): SeedFolder => ({
  kind: 'folder',
  name,
  children,
  ...meta,
})
const file = (name: string, size: number, meta: SeedMeta = {}): SeedFile => ({
  kind: 'file',
  name,
  size,
  ...meta,
})

interface SeedWorkspace {
  id: string
  name: string
  color: WorkspaceColor
  description: string
  createdDaysAgo: number
  members: [userId: string, role: WorkspaceRole][]
  children: SeedEntry[]
}

const SEED_WORKSPACES: SeedWorkspace[] = [
  {
    id: 'ws-marketing',
    name: 'Marketing',
    color: 'blue',
    description: 'Kampanye, aset brand, dan laporan performa pemasaran.',
    createdDaysAgo: 210,
    members: [
      ['u-sinta', 'manager'],
      ['u-budi', 'editor'],
      ['u-andi', 'viewer'],
      ['u-laras', 'viewer'],
    ],
    children: [
      folder('Kampanye 2026', [
        folder('Q1 · Ramadan', [
          file('Brief Kampanye Ramadan.docx', 248 * KB),
          file('Key Visual Ramadan.png', 4.2 * MB),
          file('Media Plan Q1.xlsx', 182 * KB),
        ]),
        folder('Q2 · Mid Year Sale', [
          file('Konsep Kreatif.pptx', 8.9 * MB),
          file('Video Teaser.mp4', 86 * MB),
        ]),
        folder('Q3 · Hari Kemerdekaan', [
          file('Rundown Event.docx', 96 * KB),
          file('Daftar Vendor.xlsx', 64 * KB),
        ]),
        file('Draft Lama Kampanye.docx', 120 * KB, { deleted: { by: 'u-budi', hoursAgo: 30 } }),
      ]),
      folder('Aset Brand', [
        folder('Logo', [
          file('Varnion Logo Primary.svg', 38 * KB),
          file('Varnion Logo Mono.png', 210 * KB),
          file('Logo Pack.zip', 12.6 * MB),
        ]),
        folder('Foto Produk', [
          file('Hero Banner.jpg', 6.1 * MB),
          file('Produk Detail 01.jpg', 3.4 * MB),
          file('Produk Detail 02.jpg', 3.1 * MB),
        ]),
        file('Brand Guideline 2026.pdf', 12.4 * MB),
      ]),
      folder('Laporan', [
        file('Laporan Kinerja Iklan Q3.pdf', 2.3 * MB, { renamedFrom: 'Laporan Iklan Q3 (final).pdf' }),
        file('Analitik Sosial Media.xlsx', 540 * KB),
      ]),
      file('Rencana Konten Q4.xlsx', 312 * KB),
      file('Persona Pelanggan.pdf', 1.8 * MB),
    ],
  },
  {
    id: 'ws-engineering',
    name: 'Engineering',
    color: 'violet',
    description: 'Dokumentasi arsitektur, infrastruktur, dan rilis.',
    createdDaysAgo: 240,
    members: [
      ['u-andi', 'manager'],
      ['u-laras', 'editor'],
    ],
    children: [
      folder('Arsitektur', [
        file('Diagram Sistem.png', 1.2 * MB),
        file('ADR-012 Migrasi Storage.md', 14 * KB),
        file('Arsitektur Varnion Space.pdf', 3.6 * MB),
      ]),
      folder('Infrastruktur', [
        folder('Terraform', [file('main.tf', 8 * KB), file('variables.tf', 3 * KB)]),
        folder('Monitoring', [
          file('Grafana Dashboard.json', 46 * KB),
          file('Runbook Insiden.md', 22 * KB),
        ]),
      ]),
      folder('Release Notes', [file('v2.4.0.md', 9 * KB), file('v2.5.0.md', 11 * KB)]),
      folder('Eksperimen Lama', [file('poc-sync.zip', 24 * MB)], {
        deleted: { by: 'u-laras', hoursAgo: 52 },
      }),
      file('API Spec v2.yaml', 64 * KB),
      file('Onboarding Engineer.md', 18 * KB),
    ],
  },
  {
    id: 'ws-keuangan',
    name: 'Keuangan',
    color: 'emerald',
    description: 'Anggaran, invoice, pajak, dan laporan keuangan.',
    createdDaysAgo: 200,
    members: [
      ['u-maya', 'manager'],
      ['u-sinta', 'viewer'],
      ['u-budi', 'viewer'],
    ],
    children: [
      folder('Anggaran 2026', [
        file('Anggaran Operasional.xlsx', 420 * KB),
        file('Proyeksi Arus Kas.xlsx', 380 * KB),
      ]),
      folder('Invoice', [
        folder('Januari', [file('INV-2026-001.pdf', 180 * KB), file('INV-2026-002.pdf', 176 * KB)]),
        folder('Februari', [file('INV-2026-014.pdf', 190 * KB)]),
        folder('Maret', [
          file('INV-2026-027.pdf', 172 * KB),
          file('Invoice Duplikat.pdf', 172 * KB, { deleted: { by: 'u-maya', hoursAgo: 6 } }),
        ]),
      ]),
      folder('Pajak', [file('SPT Tahunan 2025.pdf', 2.1 * MB)]),
      file('Laporan Keuangan Q3.xlsx', 860 * KB),
      file('Kebijakan Reimbursement.pdf', 640 * KB),
    ],
  },
  {
    id: 'ws-hr',
    name: 'Human Resources',
    color: 'amber',
    description: 'Rekrutmen, kebijakan perusahaan, dan administrasi SDM.',
    createdDaysAgo: 180,
    members: [
      ['u-maya', 'editor'],
      ['u-sinta', 'viewer'],
    ],
    children: [
      folder('Rekrutmen', [
        folder('Kandidat Backend', [
          file('CV Kandidat 01.pdf', 420 * KB),
          file('CV Kandidat 02.pdf', 380 * KB),
        ]),
        file('Template Offering Letter.docx', 72 * KB),
      ]),
      folder('Kebijakan', [
        file('Peraturan Perusahaan 2026.pdf', 1.4 * MB),
        file('Kebijakan Kerja Hybrid.docx', 88 * KB),
      ]),
      folder('Payroll', [file('Rekap Payroll Oktober.xlsx', 290 * KB)]),
      file('Kalender Cuti 2026.xlsx', 74 * KB),
    ],
  },
  {
    id: 'ws-produk',
    name: 'Produk',
    color: 'rose',
    description: 'Roadmap, riset pengguna, dan desain antarmuka.',
    createdDaysAgo: 160,
    members: [
      ['u-laras', 'manager'],
      ['u-andi', 'editor'],
      ['u-sinta', 'editor'],
      ['u-fajar', 'editor'],
    ],
    children: [
      folder('Roadmap', [
        file('Roadmap 2026 H1.pptx', 6.4 * MB),
        file('PRD Fitur Berbagi.docx', 156 * KB),
      ]),
      folder('Riset Pengguna', [
        file('Rekaman Wawancara 01.mp3', 32 * MB),
        file('Ringkasan Riset.pdf', 2.2 * MB),
      ]),
      folder('Desain UI', [
        folder('Design System', [file('Komponen v3.fig', 18 * MB), file('Token Warna.json', 12 * KB)]),
        file('Mockup Dashboard.png', 2.8 * MB),
      ]),
      file('Changelog Produk.md', 16 * KB),
    ],
  },
  {
    id: 'ws-legal',
    name: 'Legal',
    color: 'cyan',
    description: 'Kontrak, NDA, dan dokumen kepatuhan.',
    createdDaysAgo: 120,
    members: [
      ['u-maya', 'editor'],
      ['u-sinta', 'viewer'],
    ],
    children: [
      folder('Kontrak Klien', [
        file('PT Nusantara Digital - MSA.pdf', 980 * KB),
        file('PT Arunika Media - SOW.pdf', 640 * KB),
      ]),
      folder('NDA', [file('Template NDA.docx', 54 * KB)]),
      folder('Kepatuhan', [file('Kebijakan Privasi Data.pdf', 1.1 * MB)]),
    ],
  },
]

/* -------------------------------------------------------------------------- */
/*                                  Generator                                 */
/* -------------------------------------------------------------------------- */

export interface SeedData {
  users: UserRecord[]
  nodes: Record<string, DriveNode>
  logs: ActivityLog[]
}

export function createSeed(now = Date.now()): SeedData {
  const rand = seededRandom(20261111)
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!
  const iso = (t: number) => new Date(t).toISOString()
  /** Waktu acak di antara a dan b, condong ke b (lebih baru). */
  const recentBetween = (a: number, b: number, skew = 2) => b - Math.pow(rand(), skew) * (b - a)

  const nodes: Record<string, DriveNode> = {}
  const logs: ActivityLog[] = []
  let nodeSeq = 0
  let logSeq = 0
  const nextNodeId = () => `nd-${(++nodeSeq).toString(36).padStart(3, '0')}`
  const log = (entry: Omit<ActivityLog, 'id' | 'at'> & { at: number }) => {
    if (entry.at > now - MIN) return
    logs.push({ ...entry, id: `log-seed-${++logSeq}`, at: iso(entry.at) })
  }

  const ADMIN = 'u-rizky'
  const userById = Object.fromEntries(SEED_USERS.map((u) => [u.id, u]))
  const activeIds = (ids: string[]) => ids.filter((id) => userById[id]?.status === 'active')

  /* ------------------------------ workspaces ----------------------------- */
  for (const ws of SEED_WORKSPACES) {
    const wsCreated = now - ws.createdDaysAgo * DAY
    const writers = activeIds(ws.members.filter(([, r]) => r !== 'viewer').map(([id]) => id))
    const everyone = activeIds(ws.members.map(([id]) => id))
    if (!writers.length) writers.push(ADMIN)

    const members = ws.members.map(([userId, role], i) => ({
      userId,
      // Budi awalnya Pelihat di Marketing lalu dinaikkan menjadi Editor (lihat log member_role)
      role,
      addedAt: iso(wsCreated + (i + 1) * 7 * MIN),
    }))

    nodes[ws.id] = {
      id: ws.id,
      kind: 'workspace',
      name: ws.name,
      parentId: null,
      workspaceId: ws.id,
      description: ws.description,
      color: ws.color,
      members,
      createdBy: ADMIN,
      createdAt: iso(wsCreated),
      updatedBy: ADMIN,
      updatedAt: iso(wsCreated),
    }
    log({ at: wsCreated, actorId: ADMIN, action: 'create', targetId: ws.id, targetName: ws.name, targetKind: 'workspace', workspaceId: ws.id })

    members.forEach((m) => {
      const isBudiMarketing = ws.id === 'ws-marketing' && m.userId === 'u-budi'
      log({
        at: new Date(m.addedAt).getTime(),
        actorId: ADMIN,
        action: 'member_add',
        targetId: ws.id,
        targetName: ws.name,
        targetKind: 'workspace',
        workspaceId: ws.id,
        meta: {
          subjectUserId: m.userId,
          subjectName: userById[m.userId]?.name,
          role: isBudiMarketing ? 'viewer' : m.role,
        },
      })
    })

    /* ------------------------------ children ----------------------------- */
    const walk = (entries: SeedEntry[], parentId: string, parentCreated: number, parentName: string) => {
      for (const entry of entries) {
        const id = nextNodeId()
        const created = recentBetween(parentCreated + HOUR, now - 3 * DAY, 0.8)
        const createdBy = pick(writers)
        const isFile = entry.kind === 'file'
        // file lebih sering diubah ketimbang folder
        const updated = isFile && rand() < 0.75 ? recentBetween(created, now - 4 * MIN, 2.4) : created
        const updatedBy = updated === created ? createdBy : pick(writers)
        const opened = recentBetween(updated, now - 2 * MIN, 1.6)
        const openedBy = pick(everyone.length ? everyone : writers)
        const version = isFile ? (updated === created ? 1 : 1 + Math.ceil(rand() * 4)) : undefined

        const node: DriveNode = {
          id,
          kind: entry.kind,
          name: entry.name,
          parentId,
          workspaceId: ws.id,
          fileType: isFile ? fileTypeFromName(entry.name) : undefined,
          size: isFile ? Math.round(entry.size) : undefined,
          version,
          createdBy,
          createdAt: iso(created),
          updatedBy,
          updatedAt: iso(updated),
          lastOpenedBy: openedBy,
          lastOpenedAt: iso(opened),
        }
        if (isFile) node.versions = synthesizeVersions(node, { rand, authors: writers })

        const base = { targetId: id, targetKind: entry.kind, workspaceId: ws.id } as const
        log({
          at: created,
          actorId: createdBy,
          action: isFile ? 'upload' : 'create',
          targetName: entry.renamedFrom ?? entry.name,
          meta: { parentName },
          ...base,
        })
        if (entry.renamedFrom) {
          log({
            at: created + (updated - created) * 0.4,
            actorId: updatedBy,
            action: 'rename',
            targetName: entry.name,
            meta: { from: entry.renamedFrom, to: entry.name },
            ...base,
          })
        }
        // satu log "mengedit" per versi (v2, v3, …) lengkap dengan catatan perubahannya
        for (const v of node.versions?.slice(1) ?? []) {
          log({
            at: Date.parse(v.createdAt),
            actorId: v.createdBy,
            action: 'edit',
            targetName: entry.name,
            meta: { version: v.version, note: v.note },
            ...base,
          })
        }
        log({ at: opened, actorId: openedBy, action: 'open', targetName: entry.name, ...base })
        if (isFile && rand() < 0.3) {
          log({
            at: recentBetween(updated, now - 5 * MIN),
            actorId: pick(everyone.length ? everyone : writers),
            action: 'download',
            targetName: entry.name,
            ...base,
          })
        }
        if (entry.deleted) {
          const at = now - entry.deleted.hoursAgo * HOUR
          node.deletedAt = iso(at)
          node.deletedBy = entry.deleted.by
          log({ at, actorId: entry.deleted.by, action: 'delete', targetName: entry.name, ...base })
        }

        nodes[id] = node
        if (entry.kind === 'folder') walk(entry.children, id, created, entry.name)
      }
    }
    walk(ws.children, ws.id, wsCreated, ws.name)
  }

  /* ----------------------- perubahan peran & pengguna ---------------------- */
  log({
    at: now - 5 * DAY - 3 * HOUR,
    actorId: 'u-sinta',
    action: 'member_role',
    targetId: 'ws-marketing',
    targetName: 'Marketing',
    targetKind: 'workspace',
    workspaceId: 'ws-marketing',
    meta: { subjectUserId: 'u-budi', subjectName: 'Budi Santoso', from: 'viewer', to: 'editor' },
  })
  const laras = userById['u-laras']!
  log({
    at: now - laras.createdDaysAgo * DAY,
    actorId: ADMIN,
    action: 'user_create',
    meta: { subjectUserId: laras.id, subjectName: laras.name, role: laras.role },
  })
  log({
    at: now - 10 * DAY - 2 * HOUR,
    actorId: ADMIN,
    action: 'user_status',
    meta: { subjectUserId: 'u-fajar', subjectName: 'Fajar Nugroho', from: 'active', to: 'inactive' },
  })
  log({
    at: now - 3 * DAY - 5 * HOUR,
    actorId: null,
    action: 'login_failed',
    meta: { identifier: 'fajar@varnion.id', reason: 'Akun dinonaktifkan', subjectUserId: 'u-fajar', device: 'Chrome · Android' },
  })
  log({
    at: now - 26 * HOUR,
    actorId: 'u-budi',
    action: 'login_failed',
    meta: { identifier: 'budi', reason: 'Kata sandi salah', device: 'Chrome · Windows' },
  })

  /* ----------------------------- sesi login ------------------------------ */
  const startOfDay = (t: number) => {
    const d = new Date(t)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  }
  const lastLogin: Record<string, number> = {}
  const lastLogout: Record<string, number> = {}

  for (const u of SEED_USERS) {
    const accessible = Object.values(nodes).filter(
      (n) =>
        n.kind === 'workspace' &&
        (u.role !== 'member' || n.members?.some((m) => m.userId === u.id)),
    )
    for (let d = 13; d >= 0; d--) {
      if (u.status === 'inactive' && d < 11) break
      const today = d === 0
      if (!(today && u.online) && rand() > 0.7) continue
      const day = startOfDay(now - d * DAY)
      const loginAt = day + 7.5 * HOUR + rand() * 2 * HOUR
      if (loginAt > now - 15 * MIN) continue
      log({ at: loginAt, actorId: u.id, action: 'login', meta: { device: u.device } })
      lastLogin[u.id] = loginAt

      // buka 1–2 workspace setelah login
      const opens = Math.min(accessible.length, 1 + Math.floor(rand() * 2))
      for (let i = 0; i < opens; i++) {
        const ws = pick(accessible)
        log({
          at: loginAt + (i + 1) * (3 + rand() * 20) * MIN,
          actorId: u.id,
          action: 'open',
          targetId: ws.id,
          targetName: ws.name,
          targetKind: 'workspace',
          workspaceId: ws.id,
        })
      }

      if (today && u.online) continue
      let logoutAt = day + 16.5 * HOUR + rand() * 2 * HOUR
      if (logoutAt > now - 5 * MIN) logoutAt = Math.max(loginAt + 20 * MIN, now - 10 * MIN)
      if (logoutAt <= now - MIN) {
        log({ at: logoutAt, actorId: u.id, action: 'logout', meta: { device: u.device } })
        lastLogout[u.id] = logoutAt
      }
    }
  }

  /* -------------------------------- users -------------------------------- */
  const users: UserRecord[] = SEED_USERS.map((u) => ({
    id: u.id,
    name: u.name,
    email: `${u.username}@varnion.id`,
    username: u.username,
    password: DEMO_PASSWORD,
    role: u.role,
    status: u.status,
    title: u.title,
    avatarColor: u.avatarColor,
    online: u.online,
    lastLoginAt: lastLogin[u.id] ? iso(lastLogin[u.id]!) : undefined,
    lastLogoutAt: lastLogout[u.id] ? iso(lastLogout[u.id]!) : undefined,
    createdAt: iso(now - u.createdDaysAgo * DAY),
  }))

  logs.sort((a, b) => (a.at < b.at ? 1 : -1))

  return { users, nodes, logs }
}

/** Akun demo yang ditampilkan di halaman login (hanya mode mock). */
export const DEMO_ACCOUNTS = [
  { username: 'rizky', label: 'Administrator', hint: 'Akses penuh + kelola pengguna' },
  { username: 'sinta', label: 'Pengelola Marketing', hint: 'Anggota · Pengelola & Pelihat' },
  { username: 'budi', label: 'Editor Marketing', hint: 'Anggota · Editor & Pelihat' },
  { username: 'dewi', label: 'Auditor', hint: 'Hanya-baca + seluruh log' },
].map((d) => {
  const u = SEED_USERS.find((x) => x.username === d.username)!
  return { ...d, name: u.name, avatarColor: u.avatarColor }
})
