import { useEffect, useRef } from 'react'
import { Menu, Search, X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { uiActions } from '@/store/slices/uiSlice'
import { navigate } from '@/store/thunks'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/common/logo'
import { UserMenu } from './user-menu'

export function Header() {
  const dispatch = useAppDispatch()
  const search = useAppSelector((s) => s.ui.search)
  const inputRef = useRef<HTMLInputElement>(null)

  // Tekan "/" untuk fokus ke pencarian
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(el.tagName) && !el.isContentEditable) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 px-3 sm:gap-4 lg:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => dispatch(uiActions.setMobileNavOpen(true))}
        aria-label="Buka navigasi"
      >
        <Menu className="size-5" />
      </Button>
      <button
        onClick={() => dispatch(navigate({ page: 'home' }))}
        className="hidden shrink-0 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:block lg:w-56 lg:text-left"
        aria-label="Beranda"
      >
        <Logo />
      </button>

      <div className="relative max-w-2xl flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => dispatch(uiActions.setSearch(e.target.value))}
          onKeyDown={(e) => e.key === 'Escape' && dispatch(uiActions.setSearch(''))}
          placeholder="Telusuri file & folder"
          aria-label="Telusuri file dan folder"
          className="h-11 w-full rounded-full border border-transparent bg-background pr-20 pl-11 text-sm shadow-xs transition outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/30 dark:bg-input/30"
        />
        {search ? (
          <button
            onClick={() => dispatch(uiActions.setSearch(''))}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Hapus pencarian"
          >
            <X className="size-4" />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute top-1/2 right-4 hidden -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-[11px] text-muted-foreground sm:block">
            /
          </kbd>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1 pl-1">
        <UserMenu />
      </div>
    </header>
  )
}
