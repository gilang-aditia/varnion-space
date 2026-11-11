import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'

export interface PickerOption {
  /** Nilai unik, mis. `user:<id>` atau `role:<id>`. */
  value: string
  label: string
  description?: string
  /** Label kecil di kanan, mis. "Anggota · Editor" atau "Di luar workspace". */
  tag?: string
  /** Teks yang dicocokkan saat mengetik (nama, email, username, …). */
  keywords: string
}

/**
 * Kolom ketik untuk mencari & memilih orang/peran (combobox).
 * Ketik nama/email → ↑↓ untuk memilih → Enter (atau klik) untuk menambahkan.
 */
export function PersonPicker({
  options,
  onPick,
  placeholder = 'Ketik nama atau email…',
}: {
  options: PickerOption[]
  onPick: (option: PickerOption) => void
  placeholder?: string
}) {
  const listId = useId()
  const anchorRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const q = query.trim().toLowerCase()
  const results = (q ? options.filter((o) => o.keywords.includes(q)) : options).slice(0, 8)
  const current = Math.min(active, Math.max(0, results.length - 1))

  const pick = (option: PickerOption) => {
    onPick(option)
    setQuery('')
    setActive(0)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((current + step + results.length) % Math.max(1, results.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && results[current]) pick(results[current])
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation() // tutup daftar saja, bukan dialog
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={anchorRef} className="relative w-full min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && results[current] ? `${listId}-${current}` : undefined}
            value={query}
            placeholder={placeholder}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="h-9 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/30 dark:bg-input/30"
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-(--radix-popover-trigger-width) p-1"
        onOpenAutoFocus={(e) => e.preventDefault()} // fokus tetap di kolom ketik
        onInteractOutside={(e) => {
          if (anchorRef.current?.contains(e.target as Node)) e.preventDefault()
        }}
      >
        <ul id={listId} role="listbox" className="max-h-72 overflow-y-auto">
          {results.length === 0 ? (
            <li className="px-2 py-3 text-center text-xs text-muted-foreground">
              {q ? `Tidak ada akun yang cocok dengan “${query.trim()}”.` : 'Semua akun sudah punya aturan.'}
            </li>
          ) : (
            results.map((o, i) => (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === current}
                onMouseDown={(e) => e.preventDefault()} // jangan ambil fokus dari kolom ketik
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(o)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5',
                  i === current && 'bg-accent text-accent-foreground',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{o.label}</p>
                  {o.description && <p className="truncate text-xs text-muted-foreground">{o.description}</p>}
                </div>
                {o.tag && <span className="shrink-0 text-[11px] text-muted-foreground">{o.tag}</span>}
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
