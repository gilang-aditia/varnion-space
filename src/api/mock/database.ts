import { createSeed } from './seed'
import { synthesizeVersions } from './versions'
import type { MockDb } from './types'

const DB_KEY = 'varnion-drive:db:v1'

/** Lengkapi data lama yang tersimpan sebelum fitur tertentu ada. */
function migrate(db: MockDb): MockDb {
  db.sessions ??= {}
  for (const node of Object.values(db.nodes)) {
    if (node.kind === 'file' && !node.versions?.length) node.versions = synthesizeVersions(node)
  }
  for (const user of db.users) {
    // versi lama menyimpan password di tipe User publik; tetap kompatibel
    user.password ??= 'varnion123'
  }
  return db
}

function freshDb(): MockDb {
  return { ...createSeed(), sessions: {} }
}

export function loadDb(): MockDb {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as MockDb
      if (parsed.users && parsed.nodes && parsed.logs) return migrate(parsed)
    }
  } catch {
    /* storage diblokir / data rusak → mulai dari seed */
  }
  return freshDb()
}

export function saveDb(db: MockDb) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    /* storage penuh / diblokir — data tetap ada di memori selama tab terbuka */
  }
}

/** Data contoh baru, dengan sesi login yang sedang aktif dipertahankan. */
export function resetDb(current: MockDb): MockDb {
  const db = freshDb()
  db.sessions = current.sessions
  return db
}
