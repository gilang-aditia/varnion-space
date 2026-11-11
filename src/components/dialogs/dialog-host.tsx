import { useAppSelector } from '@/store/hooks'
import { NameDialog } from './name-dialog'
import { ConfirmDialog } from './confirm-dialog'
import { PreviewDialog } from './preview-dialog'
import { MembersDialog } from './members-dialog'
import { NewUserDialog, NewWorkspaceDialog } from './create-dialogs'

/** Merender dialog aktif berdasarkan `ui.dialog` di store. */
export function DialogHost() {
  const dialog = useAppSelector((s) => s.ui.dialog)
  if (!dialog) return null
  switch (dialog.type) {
    case 'newFolder':
      return <NameDialog key={`nf-${dialog.parentId}`} mode="newFolder" id={dialog.parentId} />
    case 'rename':
      return <NameDialog key={`rn-${dialog.id}`} mode="rename" id={dialog.id} />
    case 'delete':
      return <ConfirmDialog key={`del-${dialog.id}`} mode="delete" id={dialog.id} />
    case 'purge':
      return <ConfirmDialog key={`pg-${dialog.id}`} mode="purge" id={dialog.id} />
    case 'preview':
      return (
        <PreviewDialog
          key={`pv-${dialog.id}-${dialog.tab ?? ''}-${dialog.version ?? ''}`}
          id={dialog.id}
          initialTab={dialog.tab}
          initialVersion={dialog.version}
        />
      )
    case 'members':
      return <MembersDialog key={`mb-${dialog.workspaceId}`} workspaceId={dialog.workspaceId} />
    case 'newWorkspace':
      return <NewWorkspaceDialog />
    case 'newUser':
      return <NewUserDialog />
  }
}
