/**
 * Pemetaan user dari backend ke tipe `User` UI.
 *
 * Backend (setelah konversi camelCase oleh client):
 *   { id, email, displayName, status, roles?, permissions?, createdAt?, … }
 *   `roles` berupa `string[]` (login/me) atau `RoleDto[]` (/users).
 */
import type { AuthUserDto } from '@/types/auth'
import type { AvatarColor, SystemRole, User, UserStatus } from '@/types/drive'

/** DTO user + field opsional yang mungkin ditambahkan backend nanti. */
export type BackendUser = Partial<AuthUserDto> &
  Pick<AuthUserDto, 'id' | 'email'> & {
    name?: string
    username?: string
    title?: string
    lastLoginAt?: string
    lastLogoutAt?: string
  }

const AVATAR_COLORS: AvatarColor[] = ['blue', 'violet', 'emerald', 'amber', 'rose', 'cyan', 'orange', 'slate']

/** Warna avatar stabil per user (hash sederhana dari id). */
function avatarColorOf(id: string): AvatarColor {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

/** Peran utama dari daftar peran backend (prioritas: admin > auditor > member). */
export function primaryRole(roles: readonly string[] = []): SystemRole {
  const lower = roles.map((r) => r.toLowerCase())
  if (lower.includes('admin') || lower.includes('super_admin')) return 'admin'
  if (lower.includes('auditor')) return 'auditor'
  return 'member'
}

/** Normalisasi `roles` (string atau objek `RoleDto`) menjadi daftar kode peran. */
function roleCodes(roles: BackendUser['roles']): string[] {
  return (roles ?? []).map((r) => (typeof r === 'string' ? r : r.code)).filter(Boolean)
}

export function mapUser(raw: BackendUser): User {
  const roles = roleCodes(raw.roles)
  const status: UserStatus = raw.status === 'active' ? 'active' : 'inactive'
  return {
    id: raw.id,
    name: raw.displayName ?? raw.name ?? raw.email,
    email: raw.email,
    username: raw.username ?? raw.email.split('@')[0],
    role: primaryRole(roles),
    roles,
    permissions: raw.permissions ?? [],
    status,
    title: raw.title ?? '',
    avatarColor: avatarColorOf(raw.id),
    online: false,
    lastLoginAt: raw.lastLoginAt,
    lastLogoutAt: raw.lastLogoutAt,
    createdAt: raw.createdAt ?? new Date(0).toISOString(),
  }
}
