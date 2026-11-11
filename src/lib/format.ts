const rtf = new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' })

const dateTimeFmt = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const dateFmt = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const timeFmt = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' })

const dayFmt = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export function formatBytes(bytes?: number): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toLocaleString('id-ID', { maximumFractionDigits: value < 10 ? 1 : 0 })} ${units[i]}`
}

export function formatRelative(iso?: string, now = Date.now()): string {
  if (!iso) return '—'
  const diff = new Date(iso).getTime() - now
  const abs = Math.abs(diff)
  const sec = 1000
  const min = 60 * sec
  const hour = 60 * min
  const day = 24 * hour
  if (abs < 45 * sec) return 'baru saja'
  if (abs < hour) return rtf.format(Math.round(diff / min), 'minute')
  if (abs < day) return rtf.format(Math.round(diff / hour), 'hour')
  if (abs < 7 * day) return rtf.format(Math.round(diff / day), 'day')
  return dateFmt.format(new Date(iso))
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—'
  return dateTimeFmt.format(new Date(iso))
}

export function formatDate(iso?: string): string {
  if (!iso) return '—'
  return dateFmt.format(new Date(iso))
}

export function formatTime(iso?: string): string {
  if (!iso) return '—'
  return timeFmt.format(new Date(iso))
}

/**
 * Waktu untuk jejak audit: relatif + jam bila < 7 hari ("3 jam yang lalu · 09.22"),
 * selain itu tanggal & jam lengkap — tidak pernah menampilkan tanggal dua kali.
 */
export function formatWhen(iso?: string, now = Date.now()): string {
  if (!iso) return '—'
  if (now - Date.parse(iso) < 7 * 86_400_000) return `${formatRelative(iso, now)} · ${formatTime(iso)}`
  return formatDateTime(iso)
}

/** Label grup hari: "Hari ini", "Kemarin", atau tanggal lengkap. */
export function formatDayGroup(iso: string, now = new Date()): string {
  const d = new Date(iso)
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86_400_000)
  if (diffDays === 0) return 'Hari ini'
  if (diffDays === 1) return 'Kemarin'
  return dayFmt.format(d)
}

export function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export function firstName(name: string): string {
  return name.split(/\s+/)[0] ?? name
}
