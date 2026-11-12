/**
 * Penyimpanan di browser khusus state milik client: sesi login, preferensi
 * tampilan, dan identifier yang diingat. Data drive TIDAK disimpan di sini —
 * itu milik server.
 */

import type { AuthSession } from '@/features/login/redux/loginType'

const SESSION_KEY = 'varnion-drive:session'
const PREFS_KEY = 'varnion-drive:prefs'
const REMEMBERED_ID_KEY = 'varnion-drive:remembered-identifier'

/**
 * Metadata sesi (tanpa token). Token JWT disimpan terpisah di cookie —
 * lihat `src/api/token.ts`. remember = true → localStorage, false → sessionStorage.
 */
export type StoredSession = AuthSession

export interface StoredPrefs {
  viewMode?: 'grid' | 'list'
  theme?: 'light' | 'dark' | 'system'
  detailsOpen?: boolean
}

const local = typeof window !== 'undefined' ? window.localStorage : undefined
const session = typeof window !== 'undefined' ? window.sessionStorage : undefined

function read<T>(storage: Storage | undefined, key: string): T | null {
  try {
    const raw = storage?.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(storage: Storage | undefined, key: string, value: unknown) {
  try {
    if (value === null) storage?.removeItem(key)
    else storage?.setItem(key, JSON.stringify(value))
  } catch {
    /* storage penuh / diblokir — abaikan */
  }
}

/* --------------------------------- Sesi --------------------------------- */

export function loadSession(): StoredSession | null {
  const stored = read<StoredSession>(local, SESSION_KEY) ?? read<StoredSession>(session, SESSION_KEY)
  return stored?.userId ? stored : null
}

export function saveSession(value: StoredSession | null) {
  write(local, SESSION_KEY, value?.remember ? value : null)
  write(session, SESSION_KEY, value && !value.remember ? value : null)
}

/* ---------------------- Identifier yang diingat (login) --------------------- */

export const loadRememberedIdentifier = () => read<string>(local, REMEMBERED_ID_KEY) ?? ''
export const saveRememberedIdentifier = (value: string | null) => write(local, REMEMBERED_ID_KEY, value)

/* ------------------------------- Preferensi ------------------------------- */

export const loadPrefs = (): StoredPrefs => read<StoredPrefs>(local, PREFS_KEY) ?? {}
export const savePrefs = (prefs: StoredPrefs) => write(local, PREFS_KEY, prefs)
