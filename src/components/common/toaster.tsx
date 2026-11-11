import { useEffect } from 'react'
import { CircleCheck, CircleX, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { uiActions, type Toast } from '@/store/slices/uiSlice'

const TONE = {
  success: { icon: CircleCheck, cls: 'text-emerald-500' },
  error: { icon: CircleX, cls: 'text-destructive' },
  info: { icon: Info, cls: 'text-primary' },
} as const

function ToastItem({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch()
  useEffect(() => {
    const t = setTimeout(() => dispatch(uiActions.toastDismissed(toast.id)), toast.tone === 'error' ? 6000 : 4000)
    return () => clearTimeout(t)
  }, [dispatch, toast.id, toast.tone])
  const { icon: Icon, cls } = TONE[toast.tone]
  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex w-full items-start gap-3 rounded-xl border bg-popover p-3 pr-2 text-popover-foreground shadow-lg animate-in fade-in-0 slide-in-from-bottom-2"
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', cls)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{toast.title}</p>
        {toast.description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{toast.description}</p>}
      </div>
      <button
        onClick={() => dispatch(uiActions.toastDismissed(toast.id))}
        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Tutup notifikasi"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

export function Toaster() {
  const toasts = useAppSelector((s) => s.ui.toasts)
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 left-4 z-[60] flex flex-col items-end gap-2 sm:left-auto sm:w-96"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}
