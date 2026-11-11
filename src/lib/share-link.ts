import type { ShareLink } from '@/types/drive'
import { formatDate } from './format'

/** Link publik aktif: diaktifkan dan belum kedaluwarsa. */
export function isShareLinkActive(link?: ShareLink | null, now = Date.now()): link is ShareLink {
  return !!link?.enabled && (!link.expiresAt || Date.parse(link.expiresAt) > now)
}

/** "Siapa saja yang punya link · lihat & unduh · berlaku s/d 18 Nov 2026" */
export function shareLinkSummary(link?: ShareLink | null): string {
  if (!link?.enabled) return 'Terbatas — hanya orang yang ditambahkan'
  const permission = link.canDownload ? 'lihat & unduh' : 'lihat saja'
  const expiry = link.expiresAt ? ` · berlaku s/d ${formatDate(link.expiresAt)}` : ''
  return `Siapa saja yang punya link · ${permission}${expiry}`
}

/** URL halaman publik untuk sebuah access key. */
export function publicShareUrl(key: string, nodeId?: string): string {
  const base = `${window.location.origin}${window.location.pathname}#/s/${encodeURIComponent(key)}`
  return nodeId ? `${base}/${encodeURIComponent(nodeId)}` : base
}

/** Baca `#/s/<key>[/<nodeId>]` dari URL; null bila bukan halaman link publik. */
export function parseShareHash(hash: string): { key: string; nodeId?: string } | null {
  const match = hash.match(/^#\/s\/([^/]+)(?:\/([^/]+))?/)
  if (!match) return null
  return { key: decodeURIComponent(match[1]!), nodeId: match[2] ? decodeURIComponent(match[2]) : undefined }
}
