import { useState } from 'react'
import { Copy, Globe, Lock } from 'lucide-react'
import type { ShareLinkInput } from '@/api'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'
import { isShareLinkActive, publicShareUrl } from '@/lib/share-link'
import { useAppDispatch } from '@/store/hooks'
import { uiActions } from '@/store/slices/uiSlice'
import { updateShareLink } from '@/store/thunks'
import type { DriveNode } from '@/types/drive'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const DAY = 86_400_000
const EXPIRY_OPTIONS = [
  { value: 'never', label: 'Tanpa batas waktu', days: null },
  { value: '1', label: '1 hari', days: 1 },
  { value: '7', label: '7 hari', days: 7 },
  { value: '30', label: '30 hari', days: 30 },
] as const

/**
 * "Akses umum" — link publik yang bisa dibuka tanpa login.
 * Perubahan di bagian ini langsung diterapkan (agar link bisa langsung disalin).
 */
export function GeneralAccess({ node, canManage }: { node: DriveNode; canManage: boolean }) {
  const dispatch = useAppDispatch()
  const [busy, setBusy] = useState(false)
  const link = node.shareLink
  const enabled = !!link?.enabled
  const active = isShareLinkActive(link)
  const expired = enabled && !active

  const apply = async (patch: Partial<ShareLinkInput>) => {
    setBusy(true)
    try {
      await dispatch(
        updateShareLink({
          id: node.id,
          enabled,
          canDownload: link?.canDownload ?? false,
          expiresAt: link?.expiresAt ?? null,
          ...patch,
        }),
      ).unwrap()
    } catch {
      /* pesan error sudah tampil sebagai toast */
    } finally {
      setBusy(false)
    }
  }

  const url = link ? publicShareUrl(link.key) : ''
  const copy = () => {
    void navigator.clipboard?.writeText(url).catch(() => {})
    dispatch(uiActions.toastAdded({ title: 'Link disalin', description: url, tone: 'success' }))
  }

  return (
    <section className="rounded-xl border p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full',
            active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground',
          )}
        >
          {active ? <Globe className="size-4" /> : <Lock className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Akses umum</p>
          <p className="text-xs text-muted-foreground">
            {enabled
              ? 'Siapa saja yang punya link bisa membuka tanpa login.'
              : 'Hanya orang & peran yang diberi akses (lihat Kelola akses).'}
          </p>
        </div>
        <Select
          value={enabled ? 'public' : 'restricted'}
          onValueChange={(v) => void apply({ enabled: v === 'public' })}
          disabled={!canManage || busy}
        >
          <SelectTrigger size="sm" className="w-52" aria-label="Akses umum">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="end" className="w-64">
            <SelectItem value="restricted" description="Hanya orang yang ditambahkan">
              Terbatas
            </SelectItem>
            <SelectItem value="public" description="Siapa saja yang punya link, tanpa login">
              Siapa saja dengan link
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {enabled && link && (
        <div className="mt-3 space-y-2.5 border-t pt-3">
          <div className="flex gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.target.select()}
              aria-label="Link publik"
              className="h-8 min-w-0 flex-1 rounded-lg border bg-muted/40 px-2.5 font-mono text-xs outline-none focus:border-ring"
            />
            <Button size="sm" onClick={copy} disabled={!active}>
              <Copy />
              Salin link
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <label className="flex items-center gap-2">
              Pengunjung boleh
              <Select
                value={link.canDownload ? 'download' : 'view'}
                onValueChange={(v) => void apply({ canDownload: v === 'download' })}
                disabled={!canManage || busy}
              >
                <SelectTrigger size="sm" className="w-36" aria-label="Izin pengunjung">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="view">Lihat saja</SelectItem>
                  <SelectItem value="download">Lihat & unduh</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="flex items-center gap-2">
              Berlaku
              <Select
                value={link.expiresAt ? 'current' : 'never'}
                onValueChange={(v) => {
                  const days = EXPIRY_OPTIONS.find((o) => o.value === v)?.days
                  if (v !== 'current') void apply({ expiresAt: days ? new Date(Date.now() + days * DAY).toISOString() : null })
                }}
                disabled={!canManage || busy}
              >
                <SelectTrigger size="sm" className="w-40" aria-label="Masa berlaku link">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {link.expiresAt && <SelectItem value="current">s/d {formatDate(link.expiresAt)}</SelectItem>}
                  {EXPIRY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            {canManage && (
              <Button
                variant="ghost"
                size="xs"
                className="ml-auto"
                disabled={busy}
                onClick={() => void apply({ regenerate: true })}
              >
                Buat ulang link
              </Button>
            )}
          </div>

          {expired && (
            <p className="text-xs text-destructive">
              Link sudah kedaluwarsa. Atur masa berlaku baru agar bisa dibuka lagi.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
