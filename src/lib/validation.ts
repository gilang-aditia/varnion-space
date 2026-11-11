const INVALID_CHARS = /[\\/:*?"<>|]/
const MAX_NAME_LENGTH = 120

/**
 * Validasi nama file/folder/workspace. Mengembalikan pesan error atau `null`.
 * Dipakai form (umpan balik instan) dan mock server; backend sebaiknya
 * menerapkan aturan yang sama.
 */
export function validateName(
  name: string,
  siblings: readonly { id: string; name: string }[],
  excludeId?: string,
): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Nama tidak boleh kosong.'
  if (trimmed.length > MAX_NAME_LENGTH) return `Nama terlalu panjang (maksimal ${MAX_NAME_LENGTH} karakter).`
  if (INVALID_CHARS.test(trimmed)) return 'Nama tidak boleh mengandung karakter \\ / : * ? " < > |'
  const lower = trimmed.toLowerCase()
  if (siblings.some((s) => s.id !== excludeId && s.name.toLowerCase() === lower))
    return `Sudah ada item bernama "${trimmed}" di lokasi ini.`
  return null
}

export const isValidEmail = (email: string) => /^\S+@\S+\.\S+$/.test(email.trim())

/**
 * Nama unik di sebuah folder: "Laporan.pdf" → "Laporan (1).pdf" bila sudah dipakai.
 * `taken` = nama yang sudah ada (tidak peka huruf besar/kecil).
 */
export function uniqueName(name: string, taken: Iterable<string>): string {
  const used = new Set([...taken].map((n) => n.toLowerCase()))
  if (!used.has(name.toLowerCase())) return name
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  for (let i = 1; ; i++) {
    const candidate = `${base} (${i})${ext}`
    if (!used.has(candidate.toLowerCase())) return candidate
  }
}
