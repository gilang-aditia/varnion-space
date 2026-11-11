import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-primary to-indigo-500 text-primary-foreground shadow-sm',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-[60%]" aria-hidden>
        <path
          d="M7.5 18.5h9.25a4.25 4.25 0 0 0 .6-8.46A5.5 5.5 0 0 0 6.7 8.6 4.98 4.98 0 0 0 7.5 18.5Z"
          fill="currentColor"
          fillOpacity=".25"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="m9.5 11.5 2.5 3.5 2.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="text-[17px] leading-none font-semibold tracking-tight">
        Varnion <span className="text-primary">Space</span>
      </span>
    </span>
  )
}
