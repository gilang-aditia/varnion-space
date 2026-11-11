import { useRef, useState, type DragEvent } from 'react'
import { useAppDispatch, useAppStore } from '@/store/hooks'
import { getMoveBlocker } from '@/store/selectors'
import { uiActions } from '@/store/slices/uiSlice'
import { nodePermissions } from '@/lib/rbac'
import type { DriveNode } from '@/types/drive'

/**
 * Drag & drop untuk memindahkan file/folder ke folder, baris sidebar, atau
 * breadcrumb. Id item yang sedang diseret disimpan di modul ini karena
 * `dataTransfer.getData()` tidak bisa dibaca selama `dragover`.
 */
const MIME = 'application/x-varnion-node'
let draggingId: string | null = null

/** Props untuk elemen yang bisa diseret (kosong bila user tidak boleh memindahkan). */
export function useDraggableNode(node: DriveNode) {
  const [dragging, setDragging] = useState(false)
  if (node.kind === 'workspace' || !nodePermissions(node).canEdit) return { dragging: false, dragProps: {} }
  return {
    dragging,
    dragProps: {
      draggable: true,
      onDragStart: (e: DragEvent) => {
        e.stopPropagation()
        draggingId = node.id
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData(MIME, node.id)
        setDragging(true)
      },
      onDragEnd: () => {
        draggingId = null
        setDragging(false)
      },
    },
  }
}

/**
 * Props untuk tujuan drop. Hanya menerima item yang valid menurut
 * `getMoveBlocker` (izin, bukan diri sendiri / isinya, bukan lokasi saat ini).
 * `onHoverLong` dipanggil bila item ditahan di atas tujuan (mis. buka folder).
 */
export function useDropTarget(targetId: string, onHoverLong?: () => void) {
  const dispatch = useAppDispatch()
  const store = useAppStore()
  const [over, setOver] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  const accepts = (e: DragEvent) =>
    !!draggingId && e.dataTransfer.types.includes(MIME) && !getMoveBlocker(store.getState(), draggingId, targetId)

  const leave = () => {
    setOver(false)
    window.clearTimeout(timer.current)
  }

  return {
    over,
    dropProps: {
      onDragOver: (e: DragEvent) => {
        if (!accepts(e)) return
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'move'
        if (!over) {
          setOver(true)
          if (onHoverLong) timer.current = window.setTimeout(onHoverLong, 700)
        }
      },
      onDragLeave: (e: DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) leave()
      },
      onDrop: (e: DragEvent) => {
        if (!accepts(e)) return
        e.preventDefault()
        e.stopPropagation()
        leave()
        const id = draggingId!
        draggingId = null
        // validasi & konfirmasi dulu sebelum benar-benar memindahkan
        dispatch(uiActions.openDialog({ type: 'moveConfirm', id, targetId }))
      },
    },
  }
}
