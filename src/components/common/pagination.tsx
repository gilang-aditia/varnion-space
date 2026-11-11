import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PageMeta } from '@/types/rbac'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PER_PAGE_OPTIONS = [10, 20, 50, 100]

/** Nomor halaman yang ditampilkan: 1 … (p-1) p (p+1) … N */
function pageWindow(page: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, page - 1, page, page + 1].filter((p) => p >= 1 && p <= total))
  const sorted = [...pages].sort((a, b) => a - b)
  const out: (number | '…')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…')
    out.push(p)
  })
  return out
}

/** Pagination berbasis `meta` backend: `{ total, page, per_page, total_pages, has_next, has_prev }`. */
export function Pagination({
  meta,
  disabled,
  onPageChange,
  onPerPageChange,
}: {
  meta: PageMeta
  disabled?: boolean
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
}) {
  const { total, page, perPage, totalPages, hasNext, hasPrev } = meta
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(total, page * perPage)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>
          {from}–{to} dari {total}
        </span>
        <span aria-hidden>·</span>
        <Select value={String(perPage)} onValueChange={(v) => onPerPageChange(Number(v))} disabled={disabled}>
          <SelectTrigger size="sm" className="w-auto" aria-label="Jumlah per halaman">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {PER_PAGE_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} / halaman
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav className="flex items-center gap-1" aria-label="Halaman">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={disabled || !hasPrev}
          onClick={() => onPageChange(page - 1)}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft />
        </Button>
        {pageWindow(page, Math.max(1, totalPages)).map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="px-1">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'secondary' : 'ghost'}
              size="icon-sm"
              disabled={disabled}
              onClick={() => p !== page && onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </Button>
          ),
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={disabled || !hasNext}
          onClick={() => onPageChange(page + 1)}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight />
        </Button>
      </nav>
    </div>
  )
}
