import { cn } from '@/lib/utils'
import { AVATAR_COLORS } from '@/lib/colors'
import { initials } from '@/lib/format'
import type { User } from '@/types/drive'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const SIZES = {
  xs: 'size-5 text-[9px]',
  sm: 'size-6 text-[10px]',
  md: 'size-8 text-xs',
  lg: 'size-10 text-sm',
  xl: 'size-14 text-lg',
} as const

export function UserAvatar({
  user,
  size = 'md',
  showStatus = false,
  tooltip = false,
  className,
}: {
  user?: (Pick<User, 'name' | 'avatarColor'> & Partial<Pick<User, 'status' | 'online'>>) | null
  size?: keyof typeof SIZES
  showStatus?: boolean
  tooltip?: boolean
  className?: string
}) {
  const avatar = (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none',
        user ? AVATAR_COLORS[user.avatarColor] : 'bg-muted text-muted-foreground',
        user?.status === 'inactive' && 'opacity-50 grayscale',
        SIZES[size],
        className,
      )}
      aria-label={user?.name ?? 'Tidak dikenal'}
    >
      {user ? initials(user.name) : '?'}
      {showStatus && user && (
        <span
          className={cn(
            'absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-background',
            user.online ? 'bg-emerald-500' : 'bg-muted-foreground/40',
          )}
        />
      )}
    </span>
  )
  if (!tooltip || !user) return avatar
  return (
    <Tooltip>
      <TooltipTrigger asChild>{avatar}</TooltipTrigger>
      <TooltipContent>{user.name}</TooltipContent>
    </Tooltip>
  )
}
