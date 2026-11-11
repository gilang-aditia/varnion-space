import { useEffect } from "react";
import { Check, KeyRound, Shield, ShieldX, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { mapUser } from "@/api/http/user-mapper";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { uiActions } from "@/store/slices/uiSlice";
import { fetchRoleCatalog, selectRoleCatalog } from "@/store/rbac";
import { fetchUserList, selectUserList } from "@/store/userList";
import { useCurrentUser, usePermissions } from "@/hooks/use-drive";
import type { UserDto, UserListQuery } from "@/types/user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/empty-state";
import { UserAvatar } from "@/components/common/user-avatar";
import { PagedTable } from "@/components/common/paged-table";
import { PermissionsTab, RolesTab, TokenPermissionMatrix } from "@/components/admin/rbac-tabs";

/** Nilai Select untuk "tanpa filter" (Radix Select tidak menerima string kosong). */
const ALL = "__all__";

/** Status sesuai Swagger `GET /users` (active, inactive, suspended). */
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
  { value: "suspended", label: "Ditangguhkan" },
];

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        status === "active" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        status === "inactive" && "bg-muted text-muted-foreground",
        status === "suspended" && "bg-destructive/10 text-destructive",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full bg-current",
          status !== "active" && status !== "suspended" && "opacity-50",
        )}
      />
      {label}
    </span>
  );
}

function UsersTable() {
  const dispatch = useAppDispatch();
  const me = useCurrentUser();
  const list = useAppSelector(selectUserList);
  const roleCatalog = useAppSelector(selectRoleCatalog);
  const load = (q?: Partial<UserListQuery>) => void dispatch(fetchUserList(q));

  useEffect(() => {
    void dispatch(fetchUserList());
    void dispatch(fetchRoleCatalog());
  }, [dispatch]);

  const filters = (
    <>
      <Select
        value={list.query.status || ALL}
        onValueChange={(v) => load({ status: v === ALL ? "" : v, page: 1 })}
      >
        <SelectTrigger className="w-40" aria-label="Filter status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value={ALL}>Semua status</SelectItem>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={list.query.role || ALL}
        onValueChange={(v) => load({ role: v === ALL ? "" : v, page: 1 })}
        disabled={roleCatalog.status === "failed"}
      >
        <SelectTrigger className="w-48" aria-label="Filter peran">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value={ALL}>Semua peran</SelectItem>
          {roleCatalog.items.map((r) => (
            <SelectItem key={r.id} value={r.code}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  return (
    <PagedTable<UserDto, UserListQuery>
      list={list}
      load={load}
      searchPlaceholder="Cari email atau nama…"
      emptyText="Belum ada pengguna."
      colSpan={5}
      filters={filters}
      head={
        <tr>
          <th className="h-10 px-4 font-medium">Pengguna</th>
          <th className="h-10 px-3 font-medium">Peran</th>
          <th className="h-10 px-3 font-medium">Izin</th>
          <th className="h-10 px-3 font-medium">Status</th>
          <th className="h-10 px-3 font-medium">Terdaftar</th>
        </tr>
      }
      renderRow={(u) => {
        const isMe = u.id === me?.id;
        const roles = u.roles ?? [];
        const permissions = u.permissions ?? [];
        return (
          <tr key={u.id} className={cn("border-b last:border-0", u.status !== "active" && "bg-muted/30")}>
            <td className="px-4 py-3">
              <div className="flex items-center gap-3">
                <UserAvatar user={mapUser(u)} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {u.displayName}
                    {isMe && <span className="text-muted-foreground"> (Anda)</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
              </div>
            </td>
            <td className="px-3 py-3">
              {roles.length ? (
                <div className="flex flex-wrap gap-1">
                  {roles.map((r) => (
                    <Badge key={r.id} variant="secondary" title={r.description}>
                      {r.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Belum ada peran</span>
              )}
            </td>
            <td className="px-3 py-3 text-xs text-muted-foreground" title={permissions.join("\n")}>
              {permissions.length ? `${permissions.length} izin` : "—"}
            </td>
            <td className="px-3 py-3">
              <StatusBadge status={u.status} />
            </td>
            <td className="px-3 py-3 text-xs whitespace-nowrap text-muted-foreground">
              {formatDateTime(u.createdAt)}
            </td>
          </tr>
        );
      }}
    />
  );
}

export function UsersPage() {
  const dispatch = useAppDispatch();
  const total = useAppSelector((s) => s.userList.meta?.total);
  const perms = usePermissions();

  if (!perms.canSystem("users.view")) {
    return (
      <EmptyState
        icon={ShieldX}
        title="Akses ditolak"
        description="Halaman ini hanya untuk Administrator dan Auditor."
        className="h-full"
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Pengguna & Peran
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {total ?? "—"} pengguna
          </p>
        </div>
        {perms.canSystem("users.manage") ? (
          <Button
            className="gap-1.5"
            onClick={() => dispatch(uiActions.openDialog({ type: "newUser" }))}
          >
            <UserPlus className="size-4" />
            Tambah pengguna
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            Mode hanya-baca (Auditor)
          </span>
        )}
      </div>

      <Tabs defaultValue="users" className="mt-5">
        <TabsList>
          <TabsTrigger value="users">
            <Users /> Pengguna
          </TabsTrigger>
          <TabsTrigger value="roles">
            <Shield /> Peran
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <KeyRound /> Izin
          </TabsTrigger>
          <TabsTrigger value="matrix">
            <Check /> Matriks hak akses
          </TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-3">
          <UsersTable />
        </TabsContent>
        <TabsContent value="roles" className="mt-3">
          <RolesTab />
        </TabsContent>
        <TabsContent value="permissions" className="mt-3">
          <PermissionsTab />
        </TabsContent>
        <TabsContent value="matrix" className="mt-3">
          <TokenPermissionMatrix />
        </TabsContent>
      </Tabs>
    </div>
  );
}
