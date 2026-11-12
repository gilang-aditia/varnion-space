import { useState, type FormEvent } from "react";
import { ArchiveRestore, Loader2, Trash2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteUser } from "../redux/deleteUserAction";
import type { UserData } from "../redux/userType";

type Mode = "soft" | "hard";

const OPTIONS: {
  mode: Mode;
  icon: typeof Trash2;
  title: string;
  description: string;
}[] = [
  {
    mode: "soft",
    icon: ArchiveRestore,
    title: "Hapus sementara",
    description:
      "Pengguna tidak dapat masuk, tetapi akun dan datanya masih bisa dipulihkan kapan saja.",
  },
  {
    mode: "hard",
    icon: Trash2,
    title: "Hapus permanen",
    description: "Akun dihapus selamanya dan tidak dapat dipulihkan.",
  },
];

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
  const [mode, setMode] = useState<Mode>(onlyHard ? "hard" : "soft");
  const [confirmText, setConfirmText] = useState("");
  const hard = mode === "hard";
  // hapus permanen wajib mengetik email agar tidak terhapus tanpa sengaja
  const confirmed =
    !hard || confirmText.trim().toLowerCase() === user.email.toLowerCase();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!confirmed) return;
    const result = await dispatch(deleteUser({ id: user.id, hard }));
    if (deleteUser.fulfilled.match(result)) {
      onClose();
      onDeleted?.(hard);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <TriangleAlert className="size-5" />
            </div>
            <DialogTitle>
              {onlyHard ? "Hapus permanen pengguna?" : "Hapus pengguna?"}
            </DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">
                {user.display_name}
              </span>{" "}
              ({user.email})
            </DialogDescription>
          </DialogHeader>

          {!onlyHard && (
            <div
              role="radiogroup"
              aria-label="Jenis penghapusan"
              className="grid gap-2"
            >
              {OPTIONS.map((o) => {
                const selected = mode === o.mode;
                const danger = o.mode === "hard";
                return (
                  <button
                    key={o.mode}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setMode(o.mode);
                      setConfirmText("");
                    }}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                      selected
                        ? danger
                          ? "border-destructive bg-destructive/5 ring-1 ring-destructive"
                          : "border-primary bg-primary/5 ring-1 ring-primary"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                        selected &&
                          (danger ? "border-destructive" : "border-primary"),
                      )}
                    >
                      {selected && (
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            danger ? "bg-destructive" : "bg-primary",
                          )}
                        />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "flex items-center gap-1.5 text-sm font-medium",
                          danger && selected && "text-destructive",
                        )}
                      >
                        <o.icon className="size-4" />
                        {o.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {o.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {hard && (
            <div className="grid gap-1.5">
              <Label htmlFor="du-confirm" className="text-sm font-normal">
                Ketik{" "}
                <span className="font-mono font-medium">{user.email}</span>{" "}
                untuk mengonfirmasi
              </Label>
              <Input
                id="du-confirm"
                autoFocus
                autoComplete="off"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={user.email}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant={hard ? "destructive" : "default"}
              disabled={loading || !confirmed}
            >
              {loading && <Loader2 className="animate-spin" />}
              {hard ? "Hapus permanen" : "Hapus sementara"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
