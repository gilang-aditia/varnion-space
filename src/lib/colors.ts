import type { AvatarColor, WorkspaceColor } from '@/types/drive'

/**
 * Kelas Tailwind ditulis lengkap (bukan string dinamis) agar
 * terdeteksi oleh scanner Tailwind.
 */
export const WORKSPACE_COLORS: Record<
  WorkspaceColor,
  { solid: string; soft: string; text: string; ring: string; gradient: string; label: string }
> = {
  blue: {
    solid: 'bg-blue-500',
    soft: 'bg-blue-500/10 dark:bg-blue-400/15',
    text: 'text-blue-600 dark:text-blue-400',
    ring: 'ring-blue-500/30',
    gradient: 'from-blue-500/15 via-blue-500/5 to-transparent',
    label: 'Biru',
  },
  violet: {
    solid: 'bg-violet-500',
    soft: 'bg-violet-500/10 dark:bg-violet-400/15',
    text: 'text-violet-600 dark:text-violet-400',
    ring: 'ring-violet-500/30',
    gradient: 'from-violet-500/15 via-violet-500/5 to-transparent',
    label: 'Ungu',
  },
  emerald: {
    solid: 'bg-emerald-500',
    soft: 'bg-emerald-500/10 dark:bg-emerald-400/15',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-500/30',
    gradient: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
    label: 'Hijau',
  },
  amber: {
    solid: 'bg-amber-500',
    soft: 'bg-amber-500/10 dark:bg-amber-400/15',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-500/30',
    gradient: 'from-amber-500/15 via-amber-500/5 to-transparent',
    label: 'Kuning',
  },
  rose: {
    solid: 'bg-rose-500',
    soft: 'bg-rose-500/10 dark:bg-rose-400/15',
    text: 'text-rose-600 dark:text-rose-400',
    ring: 'ring-rose-500/30',
    gradient: 'from-rose-500/15 via-rose-500/5 to-transparent',
    label: 'Merah muda',
  },
  cyan: {
    solid: 'bg-cyan-500',
    soft: 'bg-cyan-500/10 dark:bg-cyan-400/15',
    text: 'text-cyan-600 dark:text-cyan-400',
    ring: 'ring-cyan-500/30',
    gradient: 'from-cyan-500/15 via-cyan-500/5 to-transparent',
    label: 'Sian',
  },
}

export const AVATAR_COLORS: Record<AvatarColor, string> = {
  blue: 'bg-blue-500 text-white',
  violet: 'bg-violet-500 text-white',
  emerald: 'bg-emerald-600 text-white',
  amber: 'bg-amber-500 text-white',
  rose: 'bg-rose-500 text-white',
  cyan: 'bg-cyan-600 text-white',
  orange: 'bg-orange-500 text-white',
  slate: 'bg-slate-600 text-white',
}
