import { useCallback, useEffect, useState } from "react";
import { ArchiveRestore, Loader2, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { mapUser } from "@/lib/user-mapper";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useCurrentUser, usePermissions } from "@/hooks/use-drive";
import { Button } from "@/components/ui/button";
import { navigate } from "@/store/thunks";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/common/user-avatar";
import { PagedTable } from "@/components/common/paged-table";
import { fetchUsers } from "../redux/userAction";
import { restoreUser } from "../redux/restoreUserAction";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { fetchAllRoles } from "../redux/roleAction";
import {
  clearFilters,
  setCurrentPage,
  setDeletedView,
  setLimit,
  setRoleFilter,
  setSearch,
  setStatusFilter,
} from "../redux/userSlice";
import type { UserData } from "../redux/userType";
import { USER_STATUS_OPTIONS } from "../constants";

/** `deleted` → user di-soft delete: tampil "Dihapus", mengalahkan status akun. */
export function StatusBadge({
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
    USER_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        status === "active" &&
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        status === "inactive" && "bg-muted text-muted-foreground",
        status === "suspended" && "bg-destructive/10 text-destructive",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function UsersTab() {
  const dispatch = useAppDispatch();
  const me = useCurrentUser();
  const {
    users,
    meta,
    loading,
    error,
    currentPage,
    limit,
    search,
    status,
    role,
    deleted,
  } = useAppSelector((state) => state.userList);
  const canManage = usePermissions().canSystem("users.manage");
  const restoring = useAppSelector((state) => state.restoreUser.loading);
  /** Baris yang sedang dipulihkan (spinner per baris). */
  const [restoringId, setRestoringId] = useState<string | null>(null);
  /** User terhapus yang akan dihapus permanen. */
  const [purgeTarget, setPurgeTarget] = useState<UserData | null>(null);
  const showActions = deleted && canManage;
  const { allRoles, loadingAll: loadingRoles } = useAppSelector(
    (state) => state.roles,
  );

  const loadUsers = useCallback(() => {
    void dispatch(
      fetchUsers({
        page: currentPage,
        per_page: limit,
        search,
        status,
        role,
        deleted,
      }),
    );
  }, [dispatch, currentPage, limit, search, status, role, deleted]);

  const restore = async (u: UserData) => {
    setRestoringId(u.id);
    await dispatch(restoreUser({ id: u.id }));
    setRestoringId(null);
  };

  // muat ulang setiap page / limit / search / filter berubah
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filters = (
    <>
      {/* Daftar pengguna ↔ terhapus (soft delete) */}
      <div
        role="tablist"
        aria-label="Tampilan pengguna"
        className="inline-flex h-9 items-center rounded-lg border bg-muted/40 p-0.5"
      >
        {[
          { value: false, label: "Pengguna", icon: Users },
          { value: true, label: "Terhapus", icon: Trash2 },
        ].map((v) => (
          <button
            key={v.label}
            type="button"
            role="tab"
            aria-selected={deleted === v.value}
            onClick={() => dispatch(setDeletedView(v.value))}
            className={cn(
              "inline-flex h-full items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
              deleted === v.value
                ? cn("bg-background shadow-xs", v.value && "text-destructive")
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <v.icon className="size-4" />
            {v.label}
          </button>
        ))}
      </div>
      <Select
        value={status}
        onValueChange={(v) => dispatch(setStatusFilter(v))}
      >
        <SelectTrigger className="w-40" aria-label="Filter status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value="all">Semua status</SelectItem>
          {USER_STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={role}
        onValueChange={(v) => dispatch(setRoleFilter(v))}
        // pilihan peran dari /rbac/roles — baru diambil saat dropdown pertama kali dibuka
        onOpenChange={(open) => {
          if (open && allRoles.length === 0) void dispatch(fetchAllRoles());
        }}
      >
        <SelectTrigger className="w-48" aria-label="Filter peran">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value="all">Semua peran</SelectItem>
          {loadingRoles && allRoles.length === 0 && (
            <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Memuat peran…
            </div>
          )}
          {allRoles.map((r) => (
            <SelectItem key={r.id} value={r.code}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  return (
    <>
      <PagedTable<UserData>
        items={users}
        meta={meta}
        loading={loading}
        error={error}
        search={search}
        onSearch={(v) => dispatch(setSearch(v))}
        onPageChange={(page) => dispatch(setCurrentPage(page))}
        onLimitChange={(value) => dispatch(setLimit(value))}
        onRetry={loadUsers}
        searchPlaceholder="Cari email atau nama…"
        emptyText={
          deleted
            ? "Tidak ada pengguna yang dihapus sementara."
            : "Belum ada pengguna."
        }
        filtered={status !== "all" || role !== "all"}
        filters={filters}
        onResetFilters={() => dispatch(clearFilters())}
        colSpan={showActions ? 6 : 5}
        head={
          <tr>
            <th className="h-10 px-4 font-medium">Pengguna</th>
            <th className="h-10 px-3 font-medium">Peran</th>
            <th className="h-10 px-3 font-medium">Izin</th>
            <th className="h-10 px-3 font-medium">Status</th>
            <th className="h-10 px-3 font-medium">Terdaftar</th>
            {showActions && (
              <th className="h-10 px-3 text-right font-medium">Aksi</th>
            )}
          </tr>
        }
        renderRow={(u) => {
          const roles = u.roles ?? [];
          const permissions = u.permissions ?? [];
          // di tampilan terhapus semua baris = terhapus, walau backend tidak mengirim `deleted_at`
          const isDeleted = deleted || !!u.deleted_at;
          return (
            <tr
              key={u.id}
              role="link"
              tabIndex={0}
              aria-label={`Lihat detail ${u.display_name}`}
              onClick={() =>
                dispatch(navigate({ page: "userDetail", id: u.id }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  dispatch(navigate({ page: "userDetail", id: u.id }));
              }}
              className={cn(
                "cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none",
                u.status !== "active" && "bg-muted/30",
                isDeleted &&
                  "bg-muted/40 text-muted-foreground [&_td:not([data-actions])]:opacity-60 [&_td:not([data-actions])]:grayscale",
              )}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <UserAvatar user={mapUser(u)} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {u.display_name}
                      {u.id === me?.id && (
                        <span className="text-muted-foreground"> (Anda)</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.email}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3">
                {roles.length ? (
                  <div className="flex flex-wrap gap-1">
                    {roles.map((r) => (
                      <Badge
                        key={r.id}
                        variant="secondary"
                        title={r.description}
                      >
                        {r.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Belum ada peran
                  </span>
                )}
              </td>
              <td
                className="px-3 py-3 text-xs text-muted-foreground"
                title={permissions.join("\n")}
              >
                {permissions.length ? `${permissions.length} izin` : "—"}
              </td>
              <td className="px-3 py-3">
                <StatusBadge status={u.status} deleted={isDeleted} />
              </td>
              <td className="px-3 py-3 text-xs whitespace-nowrap text-muted-foreground">
                {formatDateTime(u.created_at)}
              </td>
              {showActions && (
                // aksi tidak ikut efek abu-abu baris & tidak membuka detail
                <td
                  data-actions
                  className="px-3 py-2 text-right"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={restoring}
                      onClick={() => void restore(u)}
                    >
                      {restoringId === u.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ArchiveRestore className="size-4" />
                      )}
                      Pulihkan
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1.5"
                      disabled={restoring}
                      onClick={() => setPurgeTarget(u)}
                      aria-label={`Hapus permanen ${u.display_name}`}
                    >
                      <Trash2 className="size-4" />
                      Hapus permanen
                    </Button>
                  </div>
                </td>
              )}
            </tr>
          );
        }}
      />
      {purgeTarget && (
        <DeleteUserDialog
          user={purgeTarget}
          onlyHard
          onClose={() => setPurgeTarget(null)}
        />
      )}
    </>
  );
}
