import { nodePermissions } from '@/lib/rbac'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { uiActions } from '@/store/slices/uiSlice'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { NodeIcon } from '@/components/common/node-icon'
import { GeneralAccess } from './general-access'

/** Bagikan folder/file lewat link (akses umum, salin link, masa berlaku). */
export function ShareDialog({ id }: { id: string }) {
  const dispatch = useAppDispatch()
  const node = useAppSelector((s) => s.drive.nodes[id])
  const close = () => dispatch(uiActions.closeDialog())
  if (!node) return null

  const canShare = nodePermissions(node).canShare
  const rules = node.access?.length ?? 0
  const kind = node.kind === 'folder' ? 'folder' : 'file'

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="gap-4 sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <NodeIcon node={node} size="md" />
            <div className="min-w-0">
              <DialogTitle className="truncate">Bagikan “{node.name}”</DialogTitle>
              <DialogDescription>
                {canShare
                  ? `Bagikan ${kind} ini lewat link. Aktifkan akses umum agar link bisa dibuka tanpa login.`
                  : 'Anda dapat menyalin link yang aktif, tetapi tidak punya izin “Bagikan” untuk mengubahnya.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <GeneralAccess node={node} canManage={canShare} />

        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            {rules
              ? `${rules} aturan akses khusus untuk orang/peran tertentu.`
              : 'Belum ada akses khusus — anggota mengikuti peran workspace.'}
          </span>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => dispatch(uiActions.openDialog({ type: 'access', id }))}
          >
            {canShare ? 'Kelola akses' : 'Lihat akses'}
          </Button>
        </div>

        <DialogFooter>
          <Button onClick={close}>Selesai</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
