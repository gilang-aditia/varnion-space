import { jwtDecode } from 'jwt-decode'

/**
 * Klaim access token dari backend. Backend memakai `expiresIn` (unix detik)
 * sebagai waktu kedaluwarsa — bukan `exp` standar — jadi keduanya didukung.
 */
export interface AccessTokenClaims {
  sub: string
  email: string
  name: string
  roles: string[]
  permissions: string[]
  expiresIn?: number
  exp?: number
  loginTime?: number
  ipAddress?: string
}

export interface RefreshTokenClaims {
  sub: string
  type: 'refresh'
  rememberMe?: boolean
  expiresIn?: number
  exp?: number
}

export function decodeToken<T extends { expiresIn?: number; exp?: number }>(token: string | null | undefined): T | null {
  if (!token) return null
  try {
    return jwtDecode<T>(token)
  } catch {
    return null
  }
}

/** Waktu kedaluwarsa token (ms epoch), atau null bila tidak diketahui / token rusak. */
export function tokenExpiry(token: string | null | undefined): number | null {
  const claims = decodeToken<{ expiresIn?: number; exp?: number }>(token)
  const seconds = claims?.expiresIn ?? claims?.exp
  return typeof seconds === 'number' ? seconds * 1000 : null
}

/** true bila token kosong, rusak, atau sudah (hampir) kedaluwarsa. */
export function isTokenExpired(token: string | null | undefined, leewayMs = 30_000): boolean {
  if (!token) return true
  const expiry = tokenExpiry(token)
  if (expiry === null) return decodeToken(token) === null
  return Date.now() + leewayMs >= expiry
}
