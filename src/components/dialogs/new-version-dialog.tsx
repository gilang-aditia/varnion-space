import { useState, type FormEvent } from 'react'
import { ArrowRight, Info, LoaderCircle, TriangleAlert } from 'lucide-react'
import { formatBytes } from '@/lib/format'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { uploadVersion } from '@/store/thunks'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { NodeIcon } from '@/components/common/node-icon'
import { SizeDelta, VersionBadge } from '@/components/drive/version-history'

/** Konfirmasi unggah versi baru + catatan perubahan (seperti commit message). */
export function NewVersionDialog({ id, file, onDone }: { id: string; file: File; onDone: () => void }) {
  const dispatch = useAppDispatch()
  const node = useAppSelector((s) => s.drive.nodes[id])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const latest = node?.versions?.at(-1)
  if (!node || !latest) return null

  const next = latest.version + 1
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await dispatch(uploadVersion({ id, file, note })).unwrap()
      onDone()
    } catch {
      setSaving(false) // pesan error sudah tampil sebagai toast
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onDone()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Unggah versi baru</DialogTitle>
            <DialogDescription>Versi sebelumnya tetap tersimpan di riwayat versi.</DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border bg-muted/30 p-3">
            <div className="flex items-center gap-3">
              <NodeIcon node={node} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{node.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  File dipilih: {file.name} · {formatBytes(file.size)}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3 text-xs">
              <div className="flex items-center gap-2">
                <VersionBadge version={latest.version} />
                <ArrowRight className="size-3.5 text-muted-foreground" />
                <VersionBadge version={next} latest />
              </div>
              <span className="text-muted-foreground">
                Ukuran <SizeDelta delta={file.size - latest.size} />
              </span>
            </div>
          </div>

          {file.name !== node.name && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              <TriangleAlert className="mt-px size-3.5 shrink-0" />
              Nama file yang dipilih berbeda. File di Drive tetap bernama “{node.name}”.
            </p>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="version-note">Catatan perubahan</Label>
            <Textarea
              id="version-note"
              autoFocus
              rows={3}
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Jelaskan apa yang berubah, mis. “Perbarui angka penjualan Q3”"
            />
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Info className="size-3" />
              Catatan tampil di riwayat versi & log aktivitas. Kosongkan untuk “Memperbarui file”.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onDone}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <LoaderCircle className="animate-spin" />}
              Simpan sebagai versi {next}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
