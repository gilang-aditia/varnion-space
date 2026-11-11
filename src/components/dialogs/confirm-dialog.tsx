import { TriangleAlert } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectChildrenIndex, getSubtreeIds } from '@/store/selectors'
import { uiActions } from '@/store/slices/uiSlice'
import { purgeNode, trashNode } from '@/store/thunks'
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

export function ConfirmDialog({ mode, id }: { mode: 'delete' | 'purge'; id: string }) {
  const dispatch = useAppDispatch()
  const node = useAppSelector((s) => s.drive.nodes[id])
  const index = useAppSelector(selectChildrenIndex)
  const close = () => dispatch(uiActions.closeDialog())
  if (!node) return null
  const inside = node.kind === 'folder' ? getSubtreeIds(index, id).size - 1 : 0

  const confirm = () => {
    if (mode === 'delete') void dispatch(trashNode(id))
    else void dispatch(purgeNode(id))
    close()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <TriangleAlert className="size-5" />
          </div>
          <DialogTitle>{mode === 'delete' ? 'Pindahkan ke Sampah?' : 'Hapus permanen?'}</DialogTitle>
          <DialogDescription>
            {mode === 'delete'
              ? 'Item akan dipindahkan ke Sampah dan dapat dipulihkan oleh Pengelola workspace.'
              : 'Tindakan ini tidak dapat dibatalkan. Item dan seluruh isinya akan hilang selamanya.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
          <NodeIcon node={node} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{node.name}</p>
            {inside > 0 && <p className="text-xs text-muted-foreground">beserta {inside} item di dalamnya</p>}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Tindakan ini akan tercatat atas nama Anda di log aktivitas.</p>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Batal
          </Button>
          <Button
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={confirm}
            autoFocus
          >
            {mode === 'delete' ? 'Pindahkan ke Sampah' : 'Hapus permanen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
