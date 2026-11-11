import { useEffect } from 'react'
import { CloudOff, LoaderCircle } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logout, restoreSession, syncRouteFromUrl } from '@/store/thunks'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/common/toaster'
import { LogoMark } from '@/components/common/logo'
import { LoginPage } from '@/components/auth/login-page'
import { AppShell } from '@/components/layout/app-shell'

function useThemeClass() {
  const theme = useAppSelector((s) => s.ui.theme)
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mql.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
    }
    apply()
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [theme])
}

/** Tombol back/forward browser → ikuti URL hash. */
function useHistoryNavigation(enabled: boolean) {
  const dispatch = useAppDispatch()
  useEffect(() => {
    if (!enabled) return
    const onPop = () => dispatch(syncRouteFromUrl())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [dispatch, enabled])
}

/** Layar saat memulihkan sesi tersimpan (atau gagal memuat data awal). */
function SessionSplash({ failed }: { failed: boolean }) {
  const dispatch = useAppDispatch()
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-shell px-6 text-center">
      <LogoMark className="size-12" />
      {failed ? (
        <>
          <div className="flex items-center gap-2 text-sm font-medium">
            <CloudOff className="size-4 text-destructive" />
            Gagal memuat data dari server
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void dispatch(logout())}>
              Keluar
            </Button>
            <Button onClick={() => void dispatch(restoreSession())}>Coba lagi</Button>
          </div>
        </>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Memuat drive Anda…
        </p>
      )}
    </div>
  )
}

export default function App() {
  const status = useAppSelector((s) => s.auth.status)
  useThemeClass()
  useHistoryNavigation(status === 'ready')

  return (
    <TooltipProvider delayDuration={300}>
      {status === 'ready' ? (
        <AppShell />
      ) : status === 'anonymous' ? (
        <LoginPage />
      ) : (
        <SessionSplash failed={status === 'error'} />
      )}
      <Toaster />
    </TooltipProvider>
  )
}
