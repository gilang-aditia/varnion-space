/**
 * Penyimpanan token sesi (access + refresh token JWT).
 *
 * Utama: cookie (`SameSite=Strict`, `Secure` bila HTTPS). Bila cookie tidak
 * tersedia/diblokir browser → fallback ke localStorage. Nilai juga di-cache di
 * memori agar pembacaan per-request murah.
 *
 * - remember = true  → cookie persisten sampai refresh token kedaluwarsa
 * - remember = false → cookie sesi (hilang saat browser ditutup)
 */
import { tokenExpiry } from '@/lib/jwt'

const ACCESS_KEY = 'vcd_access_token'
const REFRESH_KEY = 'vcd_refresh_token'
const REMEMBER_KEY = 'vcd_remember'

export interface AuthTokens {
  accessToken: string
  refreshToken: string | null
  remember: boolean
}

/* -------------------------------- Cookie -------------------------------- */

const isBrowser = typeof document !== 'undefined'

function readCookie(name: string): string | null {
  if (!isBrowser) return null
  const prefix = `${name}=`
  for (const part of document.cookie.split('; ')) {
    if (part.startsWith(prefix)) return decodeURIComponent(part.slice(prefix.length))
  }
  return null
}

function writeCookie(name: string, value: string | null, expiresAt?: number | null) {
  if (!isBrowser) return
  const attrs = ['Path=/', 'SameSite=Strict']
  if (window.location.protocol === 'https:') attrs.push('Secure')
  if (value === null) attrs.push('Max-Age=0')
  else if (expiresAt) attrs.push(`Expires=${new Date(expiresAt).toUTCString()}`)
  document.cookie = `${name}=${value === null ? '' : encodeURIComponent(value)}; ${attrs.join('; ')}`
}

/** Cek sekali apakah browser benar-benar menyimpan cookie (bisa diblokir walau `cookieEnabled`). */
let cookieSupport: boolean | null = null
function cookiesAvailable(): boolean {
  if (cookieSupport !== null) return cookieSupport
  if (!isBrowser || !navigator.cookieEnabled) return (cookieSupport = false)
  writeCookie('vcd_cookie_test', '1')
  cookieSupport = readCookie('vcd_cookie_test') === '1'
  writeCookie('vcd_cookie_test', null)
  return cookieSupport
}

/* ----------------------------- localStorage ----------------------------- */

function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocal(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    /* storage penuh / diblokir — abaikan */
  }
}

/* --------------------------------- API ---------------------------------- */

let cache: AuthTokens | null | undefined

function readStored(): AuthTokens | null {
  const read = cookiesAvailable() ? readCookie : readLocal
  const accessToken = read(ACCESS_KEY)
  if (!accessToken) return null
  return { accessToken, refreshToken: read(REFRESH_KEY), remember: read(REMEMBER_KEY) === '1' }
}

export function getAuthTokens(): AuthTokens | null {
  if (cache === undefined) cache = readStored()
  return cache
}

export const getAuthToken = () => getAuthTokens()?.accessToken ?? null
export const getRefreshToken = () => getAuthTokens()?.refreshToken ?? null

export function setAuthTokens(tokens: AuthTokens | null) {
  cache = tokens
  if (cookiesAvailable()) {
    // sesi bertahan selama refresh token berlaku (atau access token bila tidak ada refresh token)
    const expiresAt = tokens?.remember ? tokenExpiry(tokens.refreshToken ?? tokens.accessToken) : null
    writeCookie(ACCESS_KEY, tokens?.accessToken ?? null, expiresAt)
    writeCookie(REFRESH_KEY, tokens?.refreshToken ?? null, expiresAt)
    writeCookie(REMEMBER_KEY, tokens ? (tokens.remember ? '1' : '0') : null, expiresAt)
  } else {
    writeLocal(ACCESS_KEY, tokens?.accessToken ?? null)
    writeLocal(REFRESH_KEY, tokens?.refreshToken ?? null)
    writeLocal(REMEMBER_KEY, tokens ? (tokens.remember ? '1' : '0') : null)
  }
}

export const clearAuthTokens = () => setAuthTokens(null)
