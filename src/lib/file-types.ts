import type { LucideIcon } from 'lucide-react'
import {
  File,
  FileArchive,
  FileCode,
  FileImage,
  FileMusic,
  FilePlay,
  FileSpreadsheet,
  FileText,
  Presentation,
} from 'lucide-react'
import type { FileType } from '@/types/drive'

export const FILE_TYPE_META: Record<
  FileType,
  { label: string; icon: LucideIcon; text: string; soft: string }
> = {
  pdf: { label: 'PDF', icon: FileText, text: 'text-red-600 dark:text-red-400', soft: 'bg-red-500/10' },
  doc: { label: 'Dokumen', icon: FileText, text: 'text-blue-600 dark:text-blue-400', soft: 'bg-blue-500/10' },
  sheet: {
    label: 'Spreadsheet',
    icon: FileSpreadsheet,
    text: 'text-emerald-600 dark:text-emerald-400',
    soft: 'bg-emerald-500/10',
  },
  slide: {
    label: 'Presentasi',
    icon: Presentation,
    text: 'text-amber-600 dark:text-amber-400',
    soft: 'bg-amber-500/10',
  },
  image: { label: 'Gambar', icon: FileImage, text: 'text-rose-600 dark:text-rose-400', soft: 'bg-rose-500/10' },
  video: { label: 'Video', icon: FilePlay, text: 'text-violet-600 dark:text-violet-400', soft: 'bg-violet-500/10' },
  audio: { label: 'Audio', icon: FileMusic, text: 'text-pink-600 dark:text-pink-400', soft: 'bg-pink-500/10' },
  archive: {
    label: 'Arsip',
    icon: FileArchive,
    text: 'text-yellow-700 dark:text-yellow-400',
    soft: 'bg-yellow-500/10',
  },
  code: { label: 'Kode', icon: FileCode, text: 'text-slate-600 dark:text-slate-300', soft: 'bg-slate-500/10' },
  text: { label: 'Teks', icon: FileText, text: 'text-slate-600 dark:text-slate-300', soft: 'bg-slate-500/10' },
  other: { label: 'File', icon: File, text: 'text-muted-foreground', soft: 'bg-muted' },
}

const EXT_MAP: Record<string, FileType> = {
  pdf: 'pdf',
  doc: 'doc',
  docx: 'doc',
  odt: 'doc',
  rtf: 'doc',
  xls: 'sheet',
  xlsx: 'sheet',
  csv: 'sheet',
  ods: 'sheet',
  ppt: 'slide',
  pptx: 'slide',
  key: 'slide',
  odp: 'slide',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  fig: 'image',
  mp4: 'video',
  mov: 'video',
  webm: 'video',
  mkv: 'video',
  mp3: 'audio',
  wav: 'audio',
  m4a: 'audio',
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
  gz: 'archive',
  tar: 'archive',
  js: 'code',
  ts: 'code',
  tsx: 'code',
  json: 'code',
  yaml: 'code',
  yml: 'code',
  sql: 'code',
  py: 'code',
  go: 'code',
  tf: 'code',
  sh: 'code',
  md: 'text',
  txt: 'text',
  log: 'text',
}

export function fileTypeFromName(name: string): FileType {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return EXT_MAP[ext] ?? 'other'
}
