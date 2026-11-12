import { useCallback, useEffect } from "react";
import { formatDateTime } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Badge } from "@/components/ui/badge";
import { PagedTable } from "@/components/common/paged-table";
import { fetchPermissions } from "../redux/permissionAction";
import {
  setPermissionCurrentPage,
  setPermissionLimit,
  setPermissionSearch,
} from "../redux/permissionSlice";
import type { PermissionData } from "../redux/permissionType";

export function PermissionsTab() {
  const dispatch = useAppDispatch();
  const { permissions, meta, loading, error, currentPage, limit, search } =
    useAppSelector((state) => state.permissions);

  const loadPermissions = useCallback(() => {
    void dispatch(
      fetchPermissions({ page: currentPage, per_page: limit, search }),
    );
  }, [dispatch, currentPage, limit, search]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  return (
    <PagedTable<PermissionData>
      items={permissions}
      meta={meta}
      loading={loading}
      error={error}
      search={search}
      onSearch={(v) => dispatch(setPermissionSearch(v))}
      onPageChange={(page) => dispatch(setPermissionCurrentPage(page))}
      onLimitChange={(value) => dispatch(setPermissionLimit(value))}
      onRetry={loadPermissions}
      searchPlaceholder="Cari action atau resource izin…"
      emptyText="Belum ada izin."
      colSpan={5}
      head={
        <tr>
          <th className="h-10 px-4 font-medium">Kode</th>
          <th className="h-10 px-3 font-medium">Nama</th>
          <th className="h-10 px-3 font-medium">Resource</th>
          <th className="h-10 px-3 font-medium">Action</th>
          <th className="h-10 px-3 font-medium">Dibuat</th>
        </tr>
      }
      renderRow={(p) => (
        <tr key={p.id} className="border-b last:border-0">
          <td className="px-4 py-3">
            <span className="font-mono text-xs">{p.code}</span>
          </td>
          <td className="px-3 py-3">
            <p className="text-sm">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.description}</p>
          </td>
          <td className="px-3 py-3">
            <Badge variant="outline">{p.resource}</Badge>
          </td>
          <td className="px-3 py-3 font-mono text-xs">{p.action}</td>
          <td className="px-3 py-3 text-xs whitespace-nowrap text-muted-foreground">
            {formatDateTime(p.created_at)}
          </td>
        </tr>
      )}
    />
  );
}
