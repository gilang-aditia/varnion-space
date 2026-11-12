import { cn } from "@/lib/utils";
import { WORKSPACE_STATUS_OPTIONS } from "../constants";

/** `deleted` → workspace di-soft delete: tampil "Dihapus", mengalahkan status. */
export function WorkspaceStatusBadge({
  status,
  deleted = false,
}: {
  status: string;
  deleted?: boolean;
}) {
  if (deleted) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-2 py-0.5 text-xs font-medium text-destructive">
        <span className="size-1.5 rounded-full bg-current" />
        Dihapus
      </span>
    );
  }
  const label =
    WORKSPACE_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        status === "active" &&
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        status === "inactive" && "bg-muted text-muted-foreground",
        status === "archived" &&
          "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
