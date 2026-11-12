/**
 * Pemetaan user dari respons backend (snake_case) ke tipe `User` UI
 * (dipakai cache `users` untuk avatar, nama, dan pengecekan izin).
 *
 * Bentuk `roles` berbeda per endpoint:
 * - `/auth/login`, `/auth/me` → `string[]` (kode peran)
 * - `/users` → objek `{ id, code, name, … }`, dan bisa tidak dikirim sama sekali
 */
import type { AvatarColor, Permission, SystemRole, User, UserStatus } from '@/types/drive'

export interface RawUser {
  id: string
  email: string
  display_name?: string
  status?: string
  roles?: Array<string | { code: string }>
  permissions?: Permission[]
  created_at?: string
}

const AVATAR_COLORS: AvatarColor[] = ['blue', 'violet', 'emerald', 'amber', 'rose', 'cyan', 'orange', 'slate']

/** Warna avatar stabil per user (hash sederhana dari id). */
function avatarColorOf(id: string): AvatarColor {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

/** Peran utama dari daftar kode peran (prioritas: admin > auditor > member). */
export function primaryRole(roles: readonly string[] = []): SystemRole {
  const lower = roles.map((r) => r.toLowerCase())
  if (lower.includes('admin') || lower.includes('super_admin')) return 'admin'
  if (lower.includes('auditor')) return 'auditor'
  return 'member'
}

export function mapUser(raw: RawUser): User {
  const roles = (raw.roles ?? []).map((r) => (typeof r === 'string' ? r : r.code)).filter(Boolean)
  const status: UserStatus = raw.status === 'active' ? 'active' : 'inactive'
  return {
    id: raw.id,
    name: raw.display_name ?? raw.email,
    email: raw.email,
    username: raw.email.split('@')[0],
    role: primaryRole(roles),
    roles,
    permissions: raw.permissions ?? [],
    status,
    title: '',
    avatarColor: avatarColorOf(raw.id),
    online: false,
    createdAt: raw.created_at ?? new Date(0).toISOString(),
  }
}
