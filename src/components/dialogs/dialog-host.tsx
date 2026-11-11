import { useAppSelector } from '@/store/hooks'
import { NameDialog } from './name-dialog'
import { MoveDialog } from './move-dialog'
import { MoveConfirmDialog } from './move-confirm-dialog'
import { AccessDialog } from './access-dialog'
import { ShareDialog } from './share-dialog'
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
    case 'access':
      return <AccessDialog key={`ac-${dialog.id}`} id={dialog.id} />
    case 'share':
      return <ShareDialog key={`sh-${dialog.id}`} id={dialog.id} />
    case 'move':
      return <MoveDialog key={`mv-${dialog.id}`} id={dialog.id} initialTarget={dialog.targetId} />
    case 'moveConfirm':
      return (
        <MoveConfirmDialog
          key={`mvc-${dialog.id}-${dialog.targetId}`}
          id={dialog.id}
          targetId={dialog.targetId}
          fromDialog={dialog.fromDialog}
        />
      )
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
