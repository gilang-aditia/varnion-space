import { useState, type FormEvent } from 'react'
import { Check, LoaderCircle } from 'lucide-react'
import type { SerializedApiError } from '@/api'
import { isValidEmail } from '@/lib/validation'
import { cn } from '@/lib/utils'
import { WORKSPACE_COLORS } from '@/lib/colors'
import { SYSTEM_ROLE_DESC, SYSTEM_ROLE_LABEL } from '@/lib/rbac'
import { useAppDispatch } from '@/store/hooks'
import { uiActions } from '@/store/slices/uiSlice'
import { createUser, createWorkspace } from '@/store/thunks'
import type { SystemRole, WorkspaceColor } from '@/types/drive'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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

export function NewUserDialog() {
  const dispatch = useAppDispatch()
  const [form, setForm] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    title: '',
    role: 'member' as SystemRole,
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const close = () => dispatch(uiActions.closeDialog())
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setError(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.username.trim())
      return setError('Lengkapi nama, email, dan username.')
    if (!isValidEmail(form.email)) return setError('Format email tidak valid.')
    if (form.password.length < 8) return setError('Kata sandi minimal 8 karakter.')
    setSaving(true)
    try {
      await dispatch(createUser(form)).unwrap()
      close()
    } catch (err) {
      const apiError = err as SerializedApiError
      if (apiError.field) setError(apiError.message)
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Tambah pengguna</DialogTitle>
            <DialogDescription>Akun baru dapat langsung masuk menggunakan email atau username.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="u-name">Nama lengkap</Label>
              <Input id="u-name" autoFocus value={form.name} onChange={set('name')} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="u-email">Email</Label>
              <Input id="u-email" type="email" value={form.email} onChange={set('email')} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="u-username">Username</Label>
              <Input id="u-username" value={form.username} onChange={set('username')} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="u-pass">Kata sandi awal</Label>
              <Input id="u-pass" type="password" value={form.password} onChange={set('password')} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="u-title">Jabatan</Label>
              <Input id="u-title" value={form.title} onChange={set('title')} placeholder="opsional" />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Peran sistem</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as SystemRole }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {(Object.keys(SYSTEM_ROLE_LABEL) as SystemRole[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      <div>
                        <p>{SYSTEM_ROLE_LABEL[r]}</p>
                        <p className="text-[11px] text-muted-foreground">{SYSTEM_ROLE_DESC[r]}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <LoaderCircle className="animate-spin" />}
              Tambah pengguna
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
