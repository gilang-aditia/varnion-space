import { Check, Minus, ShieldX, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime, formatRelative } from "@/lib/format";
import {
  defaultPermissions,
  NODE_PERMISSION_DESC,
  NODE_PERMISSION_LABEL,
  NODE_PERMISSIONS,
  SYSTEM_PERMISSION_LABEL,
  SYSTEM_ROLE_DESC,
  SYSTEM_ROLE_LABEL,
  SYSTEM_ROLE_PERMISSIONS,
  WORKSPACE_PERMISSION_LABEL,
  WORKSPACE_ROLE_DESC,
  WORKSPACE_ROLE_LABEL,
  WORKSPACE_ROLE_PERMISSIONS,
  getWorkspaceRole,
  type SystemPermission,
  type WorkspacePermission,
} from "@/lib/rbac";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectUsers } from "@/store/selectors";
import { uiActions } from "@/store/slices/uiSlice";
import { updateUser } from "@/store/thunks";
import { useCurrentUser, useNow, usePermissions } from "@/hooks/use-drive";
import type { DriveNode, SystemRole, WorkspaceRole } from "@/types/drive";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmptyState } from "@/components/common/empty-state";
import { UserAvatar } from "@/components/common/user-avatar";
import {
  SystemRoleBadge,
  WorkspaceRoleBadge,
} from "@/components/common/role-badge";
import { NodeIcon } from "@/components/common/node-icon";

function UsersTable() {
  const dispatch = useAppDispatch();
  const now = useNow();
  const me = useCurrentUser();
  const users = useAppSelector(selectUsers);
  const nodes = useAppSelector((s) => s.drive.nodes);
  const perms = usePermissions();
  const canManage = perms.canSystem("users.manage");
  const workspaces = Object.values(nodes).filter(
    (n): n is DriveNode => n.kind === "workspace",
  );

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-205">
        <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>
            <th className="h-10 px-4 font-medium">Pengguna</th>
            <th className="h-10 px-3 font-medium">Peran sistem</th>
            <th className="h-10 px-3 font-medium">Akses workspace</th>
            <th className="h-10 px-3 font-medium">Sesi</th>
            <th className="h-10 px-3 font-medium">Aktif</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isMe = u.id === me?.id;
            const access = workspaces
              .map((ws) => ({ ws, role: getWorkspaceRole(u, ws) }))
              .filter(
                (x): x is { ws: DriveNode; role: WorkspaceRole } => !!x.role,
              );
            return (
              <tr
                key={u.id}
                className={cn(
                  "border-b last:border-0",
                  u.status === "inactive" && "bg-muted/30",
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={u} size="md" showStatus />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {u.name}
                        {isMe && (
                          <span className="text-muted-foreground"> (Anda)</span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {u.email} · @{u.username}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {u.title}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  {canManage && !isMe ? (
                    <Select
                      value={u.role}
                      onValueChange={(v) =>
                        void dispatch(
                          updateUser({ id: u.id, role: v as SystemRole }),
                        )
                      }
                    >
                      <SelectTrigger size="sm" className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {(Object.keys(SYSTEM_ROLE_LABEL) as SystemRole[]).map(
                          (r) => (
                            <SelectItem key={r} value={r}>
                              {SYSTEM_ROLE_LABEL[r]}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <SystemRoleBadge role={u.role} />
                  )}
                </td>
                <td className="px-3 py-3">
                  {u.role !== "member" ? (
                    <span className="text-xs text-muted-foreground">
                      Semua workspace (
                      {u.role === "admin" ? "penuh" : "hanya-baca"})
                    </span>
                  ) : access.length ? (
                    <div className="flex max-w-72 flex-wrap gap-1">
                      {access.map(({ ws, role }) => (
                        <Tooltip key={ws.id}>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 rounded-full border py-0.5 pr-2 pl-0.5 text-[11px]">
                              <NodeIcon
                                node={ws}
                                size="xs"
                                className="size-4 rounded-full text-[8px]"
                              />
                              {ws.name}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {WORKSPACE_ROLE_LABEL[role]}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Belum ada
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-xs">
                  {u.online ? (
                    <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-500" />{" "}
                      Online
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Offline</span>
                  )}
                  <p
                    className="text-muted-foreground"
                    title={formatDateTime(u.lastLoginAt)}
                  >
                    Masuk:{" "}
                    {u.lastLoginAt ? formatRelative(u.lastLoginAt, now) : "—"}
                  </p>
                  <p
                    className="text-muted-foreground"
                    title={formatDateTime(u.lastLogoutAt)}
                  >
                    Keluar:{" "}
                    {u.lastLogoutAt ? formatRelative(u.lastLogoutAt, now) : "—"}
                  </p>
                </td>
                <td className="px-3 py-3">
                  <Switch
                    checked={u.status === "active"}
                    disabled={!canManage || isMe}
                    onCheckedChange={(v) =>
                      void dispatch(
                        updateUser({
                          id: u.id,
                          status: v ? "active" : "inactive",
                        }),
                      )
                    }
                    aria-label={`Status akun ${u.name}`}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Cell({ on }: { on: boolean }) {
  return (
    <td className="px-3 py-2.5 text-center">
      {on ? (
        <Check
          className="mx-auto size-4 text-emerald-600 dark:text-emerald-400"
          aria-label="Diizinkan"
        />
      ) : (
        <Minus
          className="mx-auto size-4 text-muted-foreground/40"
          aria-label="Tidak diizinkan"
        />
      )}
    </td>
  );
}

function PermissionMatrix() {
  const wsRoles: WorkspaceRole[] = ["manager", "editor", "viewer"];
  const sysRoles: SystemRole[] = ["admin", "auditor", "member"];
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Peran workspace</h3>
          <p className="text-xs text-muted-foreground">
            Diberikan per workspace oleh Pengelola atau Administrator. Izin folder & file adalah
            default — bisa ditimpa per folder/file lewat menu “Kelola akses”.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-xs">
            <tr>
              <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                Izin
              </th>
              {wsRoles.map((r) => (
                <th key={r} className="h-10 px-3 text-center font-medium">
                  <WorkspaceRoleBadge role={r} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b bg-muted/20">
              <td colSpan={4} className="px-4 py-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Folder & file (default)
              </td>
            </tr>
            {NODE_PERMISSIONS.map((p) => (
              <tr key={p} className="border-b">
                <td className="px-4 py-2.5 text-xs">
                  {NODE_PERMISSION_LABEL[p]}{" "}
                  <span className="text-muted-foreground">— {NODE_PERMISSION_DESC[p]}</span>
                </td>
                {wsRoles.map((r) => (
                  <Cell key={r} on={defaultPermissions(r)[p]} />
                ))}
              </tr>
            ))}
            <tr className="border-b bg-muted/20">
              <td colSpan={4} className="px-4 py-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Workspace
              </td>
            </tr>
            {(
              Object.keys(WORKSPACE_PERMISSION_LABEL) as WorkspacePermission[]
            ).map((p) => (
              <tr key={p} className="border-b last:border-0">
                <td className="px-4 py-2.5 text-xs">
                  {WORKSPACE_PERMISSION_LABEL[p]}
                </td>
                {wsRoles.map((r) => (
                  <Cell
                    key={r}
                    on={WORKSPACE_ROLE_PERMISSIONS[r].includes(p)}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="space-y-1 border-t bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          {wsRoles.map((r) => (
            <li key={r}>
              <span className="font-medium text-foreground">
                {WORKSPACE_ROLE_LABEL[r]}
              </span>{" "}
              — {WORKSPACE_ROLE_DESC[r]}
            </li>
          ))}
        </ul>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Peran sistem</h3>
          <p className="text-xs text-muted-foreground">
            Berlaku di seluruh aplikasi, diatur oleh Administrator.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-xs">
            <tr>
              <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                Izin
              </th>
              {sysRoles.map((r) => (
                <th key={r} className="h-10 px-3 text-center font-medium">
                  <SystemRoleBadge role={r} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Object.keys(SYSTEM_PERMISSION_LABEL) as SystemPermission[]).map(
              (p) => (
                <tr key={p} className="border-b last:border-0">
                  <td className="px-4 py-2.5 text-xs">
                    {SYSTEM_PERMISSION_LABEL[p]}
                  </td>
                  {sysRoles.map((r) => (
                    <Cell key={r} on={SYSTEM_ROLE_PERMISSIONS[r].includes(p)} />
                  ))}
                </tr>
              ),
            )}
            <tr className="border-t">
              <td className="px-4 py-2.5 text-xs">Akses ke semua workspace</td>
              <td className="px-3 py-2.5 text-center text-[11px] text-muted-foreground">
                Pengelola
              </td>
              <td className="px-3 py-2.5 text-center text-[11px] text-muted-foreground">
                Pelihat
              </td>
              <td className="px-3 py-2.5 text-center text-[11px] text-muted-foreground">
                Sesuai anggota
              </td>
            </tr>
          </tbody>
        </table>
        <ul className="space-y-1 border-t bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          {sysRoles.map((r) => (
            <li key={r}>
              <span className="font-medium text-foreground">
                {SYSTEM_ROLE_LABEL[r]}
              </span>{" "}
              — {SYSTEM_ROLE_DESC[r]}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function UsersPage() {
  const dispatch = useAppDispatch();
  const users = useAppSelector(selectUsers);
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

  const online = users.filter((u) => u.online).length;
  const inactive = users.filter((u) => u.status === "inactive").length;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Pengguna & Peran
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {users.length} pengguna · {online} online · {inactive} nonaktif
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
          <TabsTrigger value="matrix">
            <Check /> Matriks hak akses
          </TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-3">
          <UsersTable />
        </TabsContent>
        <TabsContent value="matrix" className="mt-3">
          <PermissionMatrix />
        </TabsContent>
      </Tabs>
    </div>
  );
}
