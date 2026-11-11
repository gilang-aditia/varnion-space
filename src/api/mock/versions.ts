import type { DriveNode, FileType, FileVersion } from '@/types/drive'

/* -------------------------------------------------------------------------- */
/*                                   Random                                   */
/* -------------------------------------------------------------------------- */

/** PRNG deterministik (mulberry32). */
export function seededRandom(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a 32-bit. */
function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Hash pendek 8 karakter ala commit SHA. */
function shortHash(seed: string): string {
  const a = hashString(seed).toString(16).padStart(8, '0')
  const b = hashString(`${seed}#`).toString(16).padStart(8, '0')
  return (a + b).slice(0, 8)
}

export function newVersionId(): string {
  return shortHash(`${Date.now()}-${Math.random()}`)
}

/* -------------------------------------------------------------------------- */
/*                                Version notes                               */
/* -------------------------------------------------------------------------- */

export const INITIAL_VERSION_NOTE = 'Unggahan awal'

const NOTES: Partial<Record<FileType, string[]>> = {
  sheet: [
    'Perbarui angka realisasi bulan ini',
    'Tambah sheet ringkasan',
    'Koreksi rumus total',
    'Sesuaikan format mata uang',
  ],
  doc: ['Revisi paragraf pembuka', 'Perbaiki salah ketik', 'Tambah lampiran', 'Update sesuai masukan review'],
  slide: ['Ganti layout slide 3', 'Tambah slide ringkasan', 'Perbarui visual & warna', 'Rapikan urutan slide'],
  image: ['Ekspor ulang resolusi tinggi', 'Koreksi warna', 'Crop ulang untuk banner', 'Kompres ukuran file'],
  pdf: ['Versi final setelah review', 'Perbarui tanda tangan', 'Revisi halaman 2', 'Perbaiki tabel lampiran'],
  code: ['Perbarui konfigurasi', 'Tambah endpoint baru', 'Rapikan struktur', 'Perbaiki nilai default'],
  text: ['Rapikan dokumentasi', 'Tambah bagian troubleshooting', 'Perbarui langkah instalasi'],
  video: ['Render ulang dengan subtitle', 'Potong durasi intro', 'Perbaiki audio'],
  audio: ['Normalisasi volume', 'Potong bagian awal'],
  archive: ['Perbarui isi paket', 'Tambah aset terbaru'],
}

function versionNotesFor(type?: FileType): string[] {
  return NOTES[type ?? 'other'] ?? ['Perbarui file']
}

/* -------------------------------------------------------------------------- */
/*                                 Synthesizer                                */
/* -------------------------------------------------------------------------- */

/**
 * Bangun riwayat versi yang masuk akal dari metadata file
 * (`version`, `createdAt/By`, `updatedAt/By`, `size`).
 * Dipakai oleh seed dan migrasi data lama yang belum punya `versions`.
 */
export function synthesizeVersions(
  node: DriveNode,
  opts: { rand?: () => number; authors?: string[] } = {},
): FileVersion[] {
  const rand = opts.rand ?? seededRandom(hashString(node.id))
  const authors = opts.authors?.length ? opts.authors : [node.createdBy, node.updatedBy]
  const count = Math.max(1, node.version ?? 1)
  const created = Date.parse(node.createdAt)
  const updated = Math.max(created, Date.parse(node.updatedAt))
  const size = node.size ?? 0
  const notes = versionNotesFor(node.fileType)
  // catatan dipakai bergiliran dari titik awal acak agar tidak berulang berturut-turut
  const noteStart = Math.floor(rand() * notes.length)

  // waktu versi tengah: acak di antara created..updated, terurut
  const mids = Array.from({ length: Math.max(0, count - 2) }, () => created + rand() * (updated - created)).sort(
    (a, b) => a - b,
  )
  const times = count === 1 ? [created] : [created, ...mids, updated]

  return times.map((t, i) => {
    const version = i + 1
    const isFirst = i === 0
    const isLast = i === times.length - 1
    return {
      id: shortHash(`${node.id}:v${version}`),
      version,
      size: isLast ? size : Math.max(1, Math.round(size * (0.78 + rand() * 0.2))),
      createdBy: isFirst ? node.createdBy : isLast ? node.updatedBy : authors[Math.floor(rand() * authors.length)]!,
      createdAt: new Date(t).toISOString(),
      note: isFirst ? INITIAL_VERSION_NOTE : notes[(noteStart + i - 1) % notes.length]!,
    }
  })
}
