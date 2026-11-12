import type { PermissionData } from "../redux/permissionType";

export function PermissionChip({ permission }: { permission: PermissionData }) {
  return (
    <span
      title={`${permission.name} — ${permission.description}`}
      className="inline-flex items-center rounded-md border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px]"
    >
      {permission.code}
    </span>
  );
}
