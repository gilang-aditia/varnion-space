import { useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import type { SerializedApiError } from '@/api'
import { validateName } from '@/lib/validation'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectChildrenIndex } from '@/store/selectors'
import { uiActions } from '@/store/slices/uiSlice'
import { createFolder, renameNode } from '@/store/thunks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/** Dialog untuk "Folder baru" dan "Ganti nama". */
export function NameDialog({ mode, id }: { mode: 'newFolder' | 'rename'; id: string }) {
  const dispatch = useAppDispatch()
  const node = useAppSelector((s) => s.drive.nodes[id])
  const index = useAppSelector(selectChildrenIndex)
  const allNodes = useAppSelector((s) => s.drive.nodes)
  const [value, setValue] = useState(mode === 'rename' ? (node?.name ?? '') : 'Folder baru')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const close = () => dispatch(uiActions.closeDialog())

  const parentId = mode === 'newFolder' ? id : (node?.parentId ?? null)
  const siblings = parentId
    ? (index[parentId] ?? [])
    : Object.values(allNodes).filter((n) => n.kind === 'workspace' && !n.deletedAt)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (mode === 'rename' && value.trim() === node?.name) return close()
    const invalid = validateName(value, siblings, mode === 'rename' ? id : undefined)
    if (invalid) return setError(invalid)

    setSaving(true)
    try {
      if (mode === 'newFolder') await dispatch(createFolder({ parentId: id, name: value })).unwrap()
      else await dispatch(renameNode({ id, name: value })).unwrap()
      close()
    } catch (err) {
      // error per field ditampilkan di form; error lain sudah tampil sebagai toast
      const apiError = err as SerializedApiError
      if (apiError.field) setError(apiError.message)
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{mode === 'newFolder' ? 'Folder baru' : 'Ganti nama'}</DialogTitle>
            <DialogDescription>
              {mode === 'newFolder' ? (
                <>
                  Dibuat di <span className="font-medium text-foreground">{node?.name}</span>
                </>
              ) : (
                'Perubahan nama akan tercatat di log aktivitas.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="node-name">Nama</Label>
            <Input
              id="node-name"
              autoFocus
              value={value}
              aria-invalid={!!error}
              onChange={(e) => {
                setValue(e.target.value)
                setError(null)
              }}
              onFocus={(e) => {
                // pilih nama tanpa ekstensi
                const dot = e.target.value.lastIndexOf('.')
                e.target.setSelectionRange(0, dot > 0 && node?.kind === 'file' ? dot : e.target.value.length)
              }}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <LoaderCircle className="animate-spin" />}
              {mode === 'newFolder' ? 'Buat' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
