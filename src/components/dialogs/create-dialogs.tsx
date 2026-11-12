import { useState, type FormEvent } from 'react'
import { Check, LoaderCircle } from 'lucide-react'
import type { SerializedApiError } from '@/api'
import { cn } from '@/lib/utils'
import { WORKSPACE_COLORS } from '@/lib/colors'
import { useAppDispatch } from '@/store/hooks'
import { uiActions } from '@/store/slices/uiSlice'
import { createWorkspace } from '@/store/thunks'
import type { WorkspaceColor } from '@/types/drive'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

export function NewWorkspaceDialog() {
  const dispatch = useAppDispatch()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<WorkspaceColor>('blue')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const close = () => dispatch(uiActions.closeDialog())

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await dispatch(createWorkspace({ name, description, color })).unwrap()
      close()
    } catch (err) {
      const apiError = err as SerializedApiError
      if (apiError.field) setError(apiError.message)
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Workspace baru</DialogTitle>
            <DialogDescription>Anda otomatis menjadi Pengelola workspace ini.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="ws-name">Nama workspace</Label>
            <Input
              id="ws-name"
              autoFocus
              value={name}
              aria-invalid={!!error}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              placeholder="mis. Operasional"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ws-desc">Deskripsi</Label>
            <Textarea
              id="ws-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Untuk apa workspace ini digunakan?"
              rows={2}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Warna</Label>
            <div className="flex gap-2">
              {(Object.keys(WORKSPACE_COLORS) as WorkspaceColor[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-background transition',
                    WORKSPACE_COLORS[c].solid,
                    color === c && 'ring-2 ring-foreground/40',
                  )}
                  aria-label={WORKSPACE_COLORS[c].label}
                  aria-pressed={color === c}
                >
                  {color === c && <Check className="size-4" />}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Batal
            </Button>
            <Button type="submit" disabled={!name.trim() || saving}>
              {saving && <LoaderCircle className="animate-spin" />}
              Buat workspace
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
