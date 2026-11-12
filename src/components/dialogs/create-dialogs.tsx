import { useEffect, useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { uiActions } from '@/store/slices/uiSlice'
import { WORKSPACE_STATUS_OPTIONS } from '@/features/workspace/constants'
import { createWorkspace } from '@/features/workspace/redux/createWorkspaceAction'
import {
  clearCreateWorkspaceError,
  resetCreateWorkspaceState,
} from '@/features/workspace/redux/createWorkspaceSlice'
import { updateWorkspace } from '@/features/workspace/redux/updateWorkspaceAction'
import {
  clearUpdateWorkspaceError,
  resetUpdateWorkspaceState,
} from '@/features/workspace/redux/updateWorkspaceSlice'
import type { WorkspaceData, WorkspaceStatus } from '@/features/workspace/redux/workspaceType'
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

/**
 * Form workspace (nama, deskripsi, + status saat edit).
 * - tanpa `workspace` → "Workspace baru" (POST /workspaces)
 * - dengan `workspace` → "Edit workspace" (PUT /workspaces/{id})
 */
function WorkspaceFormDialog({ workspace }: { workspace?: WorkspaceData }) {
  const dispatch = useAppDispatch()
  const editing = !!workspace
  const create = useAppSelector((s) => s.createWorkspace)
  const update = useAppSelector((s) => s.updateWorkspace)
  const { loading, error } = editing ? update : create
  const [name, setName] = useState(workspace?.name ?? '')
  const [description, setDescription] = useState(workspace?.description ?? '')
  const [status, setStatus] = useState<WorkspaceStatus>((workspace?.status as WorkspaceStatus) ?? 'active')
  const close = () => dispatch(uiActions.closeDialog())
  const clearError = () => {
    if (!error) return
    dispatch(editing ? clearUpdateWorkspaceError() : clearCreateWorkspaceError())
  }
  const dirty =
    !editing ||
    name.trim() !== workspace.name ||
    description.trim() !== (workspace.description ?? '') ||
    status !== workspace.status

  // dialog ditutup → bersihkan error/hasil sebelumnya
  useEffect(
    () => () => {
      dispatch(resetCreateWorkspaceState())
      dispatch(resetUpdateWorkspaceState())
    },
    [dispatch],
  )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (!editing) {
      const result = await dispatch(createWorkspace({ name, description }))
      if (createWorkspace.fulfilled.match(result)) close()
      return
    }
    if (!dirty) return close()
    const result = await dispatch(updateWorkspace({ id: workspace.id, payload: { name, description, status } }))
    if (updateWorkspace.fulfilled.match(result)) close()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !loading && close()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit workspace' : 'Workspace baru'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Perbarui nama, deskripsi, dan status workspace.' : 'Anda otomatis menjadi Pengelola workspace ini.'}
            </DialogDescription>
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
                clearError()
              }}
              placeholder="mis. Engineering Team"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ws-desc">Deskripsi</Label>
            <Textarea
              id="ws-desc"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                clearError()
              }}
              placeholder="Untuk apa workspace ini digunakan?"
              rows={2}
            />
          </div>
          {editing && (
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => {
                  setStatus(v as WorkspaceStatus)
                  clearError()
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {WORKSPACE_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={loading}>
              Batal
            </Button>
            <Button type="submit" disabled={!name.trim() || loading || !dirty}>
              {loading && <LoaderCircle className="animate-spin" />}
              {editing ? 'Simpan perubahan' : 'Buat workspace'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Dialog "Workspace baru" → POST /workspaces. */
export function NewWorkspaceDialog() {
  return <WorkspaceFormDialog />
}

/** Dialog "Edit workspace" → PUT /workspaces/{id}. */
export function EditWorkspaceDialog({ id }: { id: string }) {
  const dispatch = useAppDispatch()
  const workspace = useAppSelector((s) => {
    const detail = s.workspaceDetail.workspace
    if (detail?.id === id) return detail
    return s.workspaceList.workspaces.find((w) => w.id === id) ?? null
  })
  // workspace sudah tidak ada di daftar (mis. terhapus) → tutup
  useEffect(() => {
    if (!workspace) dispatch(uiActions.closeDialog())
  }, [workspace, dispatch])
  if (!workspace) return null
  return <WorkspaceFormDialog workspace={workspace} />
}
