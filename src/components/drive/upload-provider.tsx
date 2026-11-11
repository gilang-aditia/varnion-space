import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAppDispatch, useAppStore } from '@/store/hooks'
import { uiActions } from '@/store/slices/uiSlice'
import { uploadFiles } from '@/store/thunks'
import { NewVersionDialog } from '@/components/dialogs/new-version-dialog'
import { UploadContext } from './upload-context'

type Target = { mode: 'new'; parentId: string } | { mode: 'version'; id: string }

interface PendingVersion {
  id: string
  file: File
  /** Kembali ke dialog pratinjau setelah selesai bila dipicu dari sana. */
  returnToPreview: boolean
}

/**
 * Satu `<input type="file">` tersembunyi untuk seluruh aplikasi.
 * Objek `File` diteruskan apa adanya ke API (multipart di backend);
 * karena `File` tidak serializable, dialog versi baru dikelola di sini,
 * bukan di Redux.
 */
export function UploadProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch()
  const store = useAppStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const target = useRef<Target | null>(null)
  const [pendingVersion, setPendingVersion] = useState<PendingVersion | null>(null)

  const open = useCallback((t: Target) => {
    target.current = t
    const input = inputRef.current
    if (!input) return
    input.multiple = t.mode === 'new'
    input.value = ''
    input.click()
  }, [])

  const api = useMemo(
    () => ({
      pickFiles: (parentId: string) => open({ mode: 'new', parentId }),
      pickVersion: (id: string) => open({ mode: 'version', id }),
    }),
    [open],
  )

  const onFilesChosen = (files: File[]) => {
    const t = target.current
    target.current = null
    if (!files.length || !t) return
    if (t.mode === 'new') {
      void dispatch(uploadFiles({ parentId: t.parentId, files }))
      return
    }
    // versi baru → minta catatan perubahan dulu (seperti commit message)
    const dialog = store.getState().ui.dialog
    const returnToPreview = dialog?.type === 'preview' && dialog.id === t.id
    if (returnToPreview) dispatch(uiActions.closeDialog())
    setPendingVersion({ id: t.id, file: files[0]!, returnToPreview })
  }

  const finishVersion = () => {
    if (pendingVersion?.returnToPreview) {
      dispatch(uiActions.openDialog({ type: 'preview', id: pendingVersion.id, tab: 'versions' }))
    }
    setPendingVersion(null)
  }

  return (
    <UploadContext.Provider value={api}>
      {children}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => onFilesChosen(Array.from(e.target.files ?? []))}
      />
      {pendingVersion && (
        <NewVersionDialog id={pendingVersion.id} file={pendingVersion.file} onDone={finishVersion} />
      )}
    </UploadContext.Provider>
  )
}
