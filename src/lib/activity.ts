import type { LucideIcon } from 'lucide-react'
import {
  Download,
  Eye,
  FolderInput,
  FolderPlus,
  Globe,
  KeyRound,
  Link2,
  LogIn,
  LogOut,
  PencilLine,
  RotateCcw,
  ShieldX,
  TextCursorInput,
  Undo2,
  Trash,
  Upload,
  UserCog,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import type { ActivityAction } from '@/types/drive'

export type ActivityCategory = 'auth' | 'access' | 'change' | 'delete' | 'permission'

export const ACTIVITY_CATEGORY_LABEL: Record<ActivityCategory, string> = {
  auth: 'Masuk & keluar',
  access: 'Membuka & mengunduh',
  change: 'Membuat & mengedit',
  delete: 'Menghapus',
  permission: 'Anggota & peran',
}

export const ACTIVITY_META: Record<
  ActivityAction,
  { label: string; icon: LucideIcon; tone: string; category: ActivityCategory }
> = {
  login: { label: 'Masuk', icon: LogIn, tone: 'bg-emerald-500 text-white', category: 'auth' },
  logout: { label: 'Keluar', icon: LogOut, tone: 'bg-slate-500 text-white', category: 'auth' },
  login_failed: { label: 'Gagal masuk', icon: ShieldX, tone: 'bg-red-500 text-white', category: 'auth' },
  open: { label: 'Membuka', icon: Eye, tone: 'bg-sky-500 text-white', category: 'access' },
  download: { label: 'Mengunduh', icon: Download, tone: 'bg-sky-600 text-white', category: 'access' },
  create: { label: 'Membuat', icon: FolderPlus, tone: 'bg-primary text-primary-foreground', category: 'change' },
  upload: { label: 'Mengunggah', icon: Upload, tone: 'bg-primary text-primary-foreground', category: 'change' },
  edit: { label: 'Mengedit', icon: PencilLine, tone: 'bg-amber-500 text-white', category: 'change' },
  version_restore: {
    label: 'Pulihkan versi',
    icon: Undo2,
    tone: 'bg-amber-600 text-white',
    category: 'change',
  },
  rename: { label: 'Ganti nama', icon: TextCursorInput, tone: 'bg-amber-500 text-white', category: 'change' },
  move: { label: 'Memindahkan', icon: FolderInput, tone: 'bg-indigo-500 text-white', category: 'change' },
  restore: { label: 'Memulihkan', icon: RotateCcw, tone: 'bg-emerald-600 text-white', category: 'change' },
  delete: { label: 'Menghapus', icon: Trash, tone: 'bg-red-500 text-white', category: 'delete' },
  purge: { label: 'Hapus permanen', icon: X, tone: 'bg-red-700 text-white', category: 'delete' },
  member_add: { label: 'Tambah anggota', icon: UserPlus, tone: 'bg-violet-500 text-white', category: 'permission' },
  member_role: { label: 'Ubah peran', icon: UserCog, tone: 'bg-violet-500 text-white', category: 'permission' },
  member_remove: {
    label: 'Keluarkan anggota',
    icon: UserMinus,
    tone: 'bg-violet-600 text-white',
    category: 'permission',
  },
  access_grant: { label: 'Atur akses', icon: KeyRound, tone: 'bg-violet-500 text-white', category: 'permission' },
  access_revoke: { label: 'Cabut akses', icon: KeyRound, tone: 'bg-violet-600 text-white', category: 'permission' },
  link_update: { label: 'Atur link publik', icon: Link2, tone: 'bg-violet-500 text-white', category: 'permission' },
  link_view: { label: 'Buka link publik', icon: Globe, tone: 'bg-sky-500 text-white', category: 'access' },
  link_download: { label: 'Unduh via link', icon: Globe, tone: 'bg-sky-600 text-white', category: 'access' },
  user_create: { label: 'Akun baru', icon: UserPlus, tone: 'bg-violet-500 text-white', category: 'permission' },
  user_role: { label: 'Ubah peran sistem', icon: Users, tone: 'bg-violet-500 text-white', category: 'permission' },
  user_status: { label: 'Status akun', icon: UserCog, tone: 'bg-violet-600 text-white', category: 'permission' },
}

export const KIND_LABEL = { workspace: 'workspace', folder: 'folder', file: 'file' } as const
