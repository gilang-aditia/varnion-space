import { useState, type FormEvent, type ReactNode } from "react";
import { ArchiveRestore, Loader2, Trash2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
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

type Mode = "soft" | "hard";

/**
 * Konfirmasi hapus dengan dua pilihan: hapus sementara (soft delete, bisa
 * dipulihkan) atau hapus permanen (wajib mengetik `confirmValue`).
 * `onlyHard` → item sudah di-soft delete, tinggal opsi hapus permanen.
 * `onConfirm` mengembalikan true bila berhasil → dialog ditutup.
 */
export function DeleteModeDialog({
  entity,
  subject,
  confirmValue,
  softDescription,
  hardDescription,
  onlyHard = false,
  doubleConfirm = false,
  loading,
  onConfirm,
  onClose,
}: {
  /** Nama jenis item untuk judul, mis. "pengguna", "workspace". */
  entity: string;
  /** Keterangan item yang dihapus (nama, email, …). */
  subject: ReactNode;
  /** Teks yang harus diketik untuk hapus permanen. */
  confirmValue: string;
  softDescription: string;
  hardDescription: string;
  onlyHard?: boolean;
  /** Hapus permanen butuh konfirmasi kedua setelah mengetik `confirmValue`. */
  doubleConfirm?: boolean;
  loading: boolean;
  onConfirm: (hard: boolean) => Promise<boolean>;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>(onlyHard ? "hard" : "soft");
  const [confirmText, setConfirmText] = useState("");
  /** Langkah konfirmasi kedua (hanya hapus permanen + `doubleConfirm`). */
  const [finalStep, setFinalStep] = useState(false);
  const hard = mode === "hard";
  const confirmed =
    !hard ||
    confirmText.trim().toLowerCase() === confirmValue.trim().toLowerCase();

  const options = [
    {
      mode: "soft" as const,
      icon: ArchiveRestore,
      title: "Hapus sementara",
      description: softDescription,
    },
    {
      mode: "hard" as const,
      icon: Trash2,
      title: "Hapus permanen",
      description: hardDescription,
    },
  ];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!confirmed) return;
    if (hard && doubleConfirm && !finalStep) return setFinalStep(true);
    if (await onConfirm(hard)) onClose();
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
              {onlyHard ? `Hapus permanen ${entity}?` : `Hapus ${entity}?`}
            </DialogTitle>
            <DialogDescription>{subject}</DialogDescription>
          </DialogHeader>

          {finalStep ? null : onlyHard ? (
            <p className="text-sm text-muted-foreground">{hardDescription}</p>
          ) : (
            <div
              role="radiogroup"
              aria-label="Jenis penghapusan"
              className="grid gap-2"
            >
              {options.map((o) => {
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

          {finalStep ? (
            // Konfirmasi kedua hapus permanen
            <div
              role="alert"
              className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="text-sm">
                <p className="font-medium text-destructive">
                  Konfirmasi terakhir
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {confirmValue}
                  </span>{" "}
                  akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
                  Lanjutkan?
                </p>
              </div>
            </div>
          ) : (
            hard && (
              <div className="grid gap-1.5">
                <Label htmlFor="dm-confirm" className="text-sm font-normal">
                  Ketik{" "}
                  <span className="font-mono font-medium">{confirmValue}</span>{" "}
                  untuk mengonfirmasi
                </Label>
                <Input
                  id="dm-confirm"
                  autoFocus
                  autoComplete="off"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={confirmValue}
                />
              </div>
            )
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => (finalStep ? setFinalStep(false) : onClose())}
              disabled={loading}
            >
              {finalStep ? "Kembali" : "Batal"}
            </Button>
            <Button
              type="submit"
              variant={hard ? "destructive" : "default"}
              disabled={loading || !confirmed}
            >
              {loading && <Loader2 className="animate-spin" />}
              {finalStep
                ? "Ya, hapus permanen"
                : hard
                  ? "Hapus permanen"
                  : "Hapus sementara"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
