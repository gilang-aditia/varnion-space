import { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Badge } from "@/components/ui/badge";
import { PagedTable } from "@/components/common/paged-table";
import { fetchRoles } from "../redux/roleAction";
import {
  setRoleCurrentPage,
  setRoleLimit,
  setRoleSearch,
} from "../redux/roleSlice";
import type { Role } from "../redux/roleType";
import type { PermissionData } from "../redux/permissionType";
import { PermissionChip } from "./PermissionChip";

/** Jumlah izin yang langsung tampil sebelum "+N lainnya". */
const CHIP_LIMIT = 6;

function RolePermissions({ permissions }: { permissions: PermissionData[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!permissions.length)
    return (
      <span className="text-xs text-muted-foreground">Tidak ada izin</span>
    );
  const shown = expanded ? permissions : permissions.slice(0, CHIP_LIMIT);
  const rest = permissions.length - CHIP_LIMIT;
  return (
    <div className="flex max-w-xl flex-wrap items-center gap-1">
      {shown.map((p) => (
        <PermissionChip key={p.id} permission={p} />
      ))}
      {rest > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-primary hover:underline"
        >
          {expanded ? "Sembunyikan" : `+${rest} lainnya`}
        </button>
      )}
    </div>
  );
}

export function RolesTab() {
  const dispatch = useAppDispatch();
  const { roles, meta, loading, error, currentPage, limit, search } =
    useAppSelector((state) => state.roles);

  const loadRoles = useCallback(() => {
    void dispatch(fetchRoles({ page: currentPage, per_page: limit, search }));
  }, [dispatch, currentPage, limit, search]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  return (
    <PagedTable<Role>
      items={roles}
      meta={meta}
      loading={loading}
      error={error}
      search={search}
      onSearch={(v) => dispatch(setRoleSearch(v))}
      onPageChange={(page) => dispatch(setRoleCurrentPage(page))}
      onLimitChange={(value) => dispatch(setRoleLimit(value))}
      onRetry={loadRoles}
      searchPlaceholder="Cari nama atau deskripsi peran…"
      emptyText="Belum ada peran."
      colSpan={4}
      head={
        <tr>
          <th className="h-10 px-4 font-medium">Peran</th>
          <th className="h-10 px-3 font-medium">Deskripsi</th>
          <th className="h-10 px-3 font-medium">Izin</th>
          <th className="h-10 px-3 font-medium">Dibuat</th>
        </tr>
      }
      renderRow={(role) => (
        <tr key={role.id} className="border-b align-top last:border-0">
          <td className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium">{role.name}</span>
              {role.is_system && <Badge variant="secondary">Sistem</Badge>}
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              {role.code}
            </p>
          </td>
          <td className="px-3 py-3 text-xs text-muted-foreground">
            {role.description || "—"}
          </td>
          <td className="px-3 py-3">
            <p className="mb-1.5 text-xs text-muted-foreground">
              {role.permissions.length} izin
            </p>
            <RolePermissions permissions={role.permissions} />
          </td>
          <td className="px-3 py-3 text-xs whitespace-nowrap text-muted-foreground">
            {formatDateTime(role.created_at)}
          </td>
        </tr>
      )}
    />
  );
}
