import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/format";

/**
 * Cap "DIHAPUS" ala stempel tinta untuk item yang di-soft delete.
 * `size="lg"` → kartu profil (detail pengguna); `size="sm"` → kartu workspace.
 */
export function DeletedStamp({
  deletedAt,
  size = "lg",
  className,
}: {
  deletedAt?: string | null;
  size?: "sm" | "lg";
  className?: string;
}) {
  const small = size === "sm";
  return (
    <div
      aria-hidden
      data-stamp
      className={cn(
        "pointer-events-none absolute z-10 -rotate-12 select-none",
        small
          ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          : "top-4 right-4 sm:top-5 sm:right-8",
        className,
      )}
    >
      <div className="rounded-lg border-[3px] border-destructive/70 bg-card/40 p-0.5 text-destructive/80 mix-blend-multiply dark:mix-blend-screen">
        <div
          className={cn(
            "rounded-md border border-destructive/60 text-center",
            small ? "px-3 py-1" : "px-4 py-1.5",
          )}
        >
          <p
            className={cn(
              "leading-none font-black tracking-[0.25em] uppercase",
              small ? "text-xl" : "text-2xl sm:text-3xl",
            )}
          >
            Dihapus
          </p>
          <p className="mt-1 text-[10px] font-semibold tracking-[0.2em] uppercase">
            Sementara
            {deletedAt
              ? ` · ${small ? formatDate(deletedAt) : formatDateTime(deletedAt)}`
              : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
