import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { DeleteModeDialog } from "@/components/common/delete-mode-dialog";
import { deleteUser } from "../redux/deleteUserAction";
import type { UserData } from "../redux/userType";

/**
 * Konfirmasi hapus pengguna → DELETE /users/{id}?hard=.
 * `onlyHard` → user sudah di-soft delete, tinggal opsi hapus permanen.
 */
export function DeleteUserDialog({
  user,
  onlyHard = false,
  onClose,
  onDeleted,
}: {
  user: UserData;
  onlyHard?: boolean;
  onClose: () => void;
  onDeleted?: (hard: boolean) => void;
}) {
  const dispatch = useAppDispatch();
  const loading = useAppSelector((state) => state.deleteUser.loading);

  return (
    <DeleteModeDialog
      entity="pengguna"
      subject={
        <>
          <span className="font-medium text-foreground">
            {user.display_name}
          </span>{" "}
          ({user.email})
        </>
      }
      // hapus permanen wajib mengetik email agar tidak terhapus tanpa sengaja
      confirmValue={user.email}
      softDescription="Pengguna tidak dapat masuk, tetapi akun dan datanya masih bisa dipulihkan kapan saja."
      hardDescription="Akun dihapus selamanya dan tidak dapat dipulihkan."
      onlyHard={onlyHard}
      loading={loading}
      onClose={onClose}
      onConfirm={async (hard) => {
        const result = await dispatch(deleteUser({ id: user.id, hard }));
        if (!deleteUser.fulfilled.match(result)) return false;
        onDeleted?.(hard);
        return true;
      }}
    />
  );
}
