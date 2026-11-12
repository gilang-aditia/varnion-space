import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { uiActions } from "@/store/slices/uiSlice";
import { DeleteModeDialog } from "@/components/common/delete-mode-dialog";
import { deleteWorkspace } from "../redux/deleteWorkspaceAction";
import type { WorkspaceData } from "../redux/workspaceType";

/**
 * Konfirmasi hapus workspace → DELETE /workspaces/{id}?hard=.
 * Hapus permanen: ketik nama workspace + konfirmasi kedua.
 * `onlyHard` → workspace sudah di-soft delete, tinggal opsi hapus permanen.
 */
export function DeleteWorkspaceDialog({
  workspace,
  onlyHard = false,
  onClose,
}: {
  workspace: WorkspaceData;
  onlyHard?: boolean;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const loading = useAppSelector((state) => state.deleteWorkspace.loading);
  const detailsOfThis = useAppSelector(
    (state) => state.ui.detailsOpen && state.ui.selectedId === workspace.id,
  );

  return (
    <DeleteModeDialog
      entity="workspace"
      subject={
        <span className="font-medium text-foreground">{workspace.name}</span>
      }
      confirmValue={workspace.name}
      softDescription="Workspace disembunyikan dari anggota, tetapi isinya masih bisa dipulihkan kapan saja."
      hardDescription="Workspace beserta seluruh folder dan file di dalamnya dihapus selamanya dan tidak dapat dipulihkan."
      onlyHard={onlyHard}
      doubleConfirm
      loading={loading}
      onClose={onClose}
      onConfirm={async (hard) => {
        const result = await dispatch(
          deleteWorkspace({ id: workspace.id, hard }),
        );
        if (!deleteWorkspace.fulfilled.match(result)) return false;
        // workspace terhapus → panel Detail & aktivitas-nya ikut ditutup
        if (detailsOfThis) dispatch(uiActions.setDetailsOpen(false));
        return true;
      }}
    />
  );
}
