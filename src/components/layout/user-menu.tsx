import { Activity, LogOut, Monitor, Moon, RotateCcw, ShieldCheck, Sun } from 'lucide-react'
import { api } from '@/api'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { uiActions, type Theme } from '@/store/slices/uiSlice'
import { logout, navigate, resetDemoData } from '@/store/thunks'
import { useCurrentUser } from '@/hooks/use-drive'
import { formatDateTime } from '@/lib/format'
import { UserAvatar } from '@/components/common/user-avatar'
import { SystemRoleBadge } from '@/components/common/role-badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function UserMenu() {
  const dispatch = useAppDispatch()
  const user = useCurrentUser()
  const session = useAppSelector((s) => s.auth.session)
  const theme = useAppSelector((s) => s.ui.theme)
  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={`Akun: ${user.name}`}
        >
          <UserAvatar user={user} size="md" showStatus />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="flex items-center gap-3 px-2 py-2.5">
          <UserAvatar user={user} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <SystemRoleBadge role={user.role} className="mt-1.5" />
          </div>
        </div>
        {session && (
          <div className="mx-2 mb-2 rounded-lg bg-muted/60 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-3" />
              {session.remember ? 'Sesi diingat di perangkat ini' : 'Sesi berakhir saat browser ditutup'}
            </div>
            <div>
              Masuk {formatDateTime(session.startedAt)} · {session.device}
            </div>
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => dispatch(navigate({ page: 'activity' }))}>
          <Activity />
          Log aktivitas
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            {theme === 'dark' ? <Moon /> : theme === 'light' ? <Sun /> : <Monitor />}
            Tema
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={theme} onValueChange={(v) => dispatch(uiActions.setTheme(v as Theme))}>
              <DropdownMenuRadioItem value="light">Terang</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">Gelap</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">Ikuti sistem</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {api.resetDemo && (
          <DropdownMenuItem onSelect={() => void dispatch(resetDemoData())}>
            <RotateCcw />
            Reset data demo
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => void dispatch(logout())}>
          <LogOut />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
