import { useMemo, type ReactNode } from "react";
import { Activity, Info, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FILE_TYPE_META } from "@/lib/file-types";
import {
  dayKey,
  formatBytes,
  formatDateTime,
  formatDayGroup,
  formatWhen,
} from "@/lib/format";
import { describePermissions, getWorkspaceRole, nodePermissions } from "@/lib/rbac";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  getPath,
  getSubtreeIds,
  selectChildrenIndex,
  selectLogs,
} from "@/store/selectors";
import { uiActions } from "@/store/slices/uiSlice";
import { navigate } from "@/store/thunks";
import { useCurrentUser, useNow } from "@/hooks/use-drive";
import type { ActivityLog, DriveNode, User } from "@/types/drive";
import { NodeIcon } from "@/components/common/node-icon";
import { UserAvatar } from "@/components/common/user-avatar";
import { AccessBadge, WorkspaceRoleBadge } from "@/components/common/role-badge";
import { ActivityItem } from "@/components/activity/activity-item";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileThumb } from "./node-views";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 py-1.5 text-xs">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-foreground">{children}</dd>
    </div>
  );
}

function Who({
  user,
  at,
  now,
  me,
}: {
  user?: User;
  at?: string;
  now: number;
  me: User | null;
}) {
  if (!at) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex items-start gap-2">
      <UserAvatar user={user} size="xs" className="mt-px" />
      <div className="min-w-0">
        <p className="truncate font-medium">
          {user
            ? user.id === me?.id
              ? `${user.name} (Anda)`
              : user.name
            : "—"}
        </p>
        <p className="text-muted-foreground" title={formatDateTime(at)}>
          {formatWhen(at, now)}
        </p>
      </div>
    </div>
  );
}

export function GroupedLogs({
  logs,
  now,
  compact = true,
  showWorkspace = false,
}: {
  logs: ActivityLog[];
  now: number;
  compact?: boolean;
  showWorkspace?: boolean;
}) {
  const groups = useMemo(() => {
    const out: { key: string; label: string; items: ActivityLog[] }[] = [];
    for (const l of logs) {
      const k = dayKey(l.at);
      const last = out[out.length - 1];
      if (last?.key === k) last.items.push(l);
      else out.push({ key: k, label: formatDayGroup(l.at), items: [l] });
    }
    return out;
  }, [logs]);
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.key}>
          <p className="sticky top-0 z-1 bg-inherit py-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {g.label}
          </p>
          <div className="divide-y divide-border/60">
            {g.items.map((l) => (
              <ActivityItem
                key={l.id}
                log={l}
                compact={compact}
                showWorkspace={showWorkspace}
                now={now}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function NodeDetails({ node, now }: { node: DriveNode; now: number }) {
  const dispatch = useAppDispatch();
  const me = useCurrentUser();
  const users = useAppSelector((s) => s.users.byId);
  const nodes = useAppSelector((s) => s.drive.nodes);
  const index = useAppSelector(selectChildrenIndex);
  const ws = nodes[node.workspaceId];
  const role = getWorkspaceRole(me, ws);
  const location = getPath(nodes, node.id).slice(0, -1);
  const subtree = node.kind !== "file" ? getSubtreeIds(index, node.id) : null;
  const totalSize = subtree
    ? [...subtree].reduce(
        (s, id) =>
          s + (nodes[id]?.kind === "file" ? (nodes[id]?.size ?? 0) : 0),
        0,
      )
    : node.size;

  return (
    <div className="space-y-4">
      {node.kind === "file" && (
        <FileThumb node={node} className="aspect-16/10 rounded-xl" />
      )}

      {node.kind === "workspace" && node.description && (
        <p className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
          {node.description}
        </p>
      )}

      {node.kind === "workspace" ? (
        <div className="flex items-center justify-between rounded-lg border px-3 py-2">
          <span className="text-xs text-muted-foreground">Peran Anda</span>
          {role && <WorkspaceRoleBadge role={role} />}
        </div>
      ) : (
        <div className="rounded-lg border px-3 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Akses Anda</span>
            <AccessBadge permissions={nodePermissions(node)} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Boleh {describePermissions(nodePermissions(node))}.
          </p>
          <div className="mt-2 flex items-center justify-between border-t pt-2">
            <span className="text-xs text-muted-foreground">
              {node.access?.length
                ? `${node.access.length} aturan akses khusus`
                : "Mengikuti peran workspace"}
            </span>
            <div className="flex gap-1">
              {nodePermissions(node).canShare && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() =>
                    dispatch(uiActions.openDialog({ type: "share", id: node.id }))
                  }
                >
                  Bagikan
                </Button>
              )}
              <Button
                variant="ghost"
                size="xs"
                onClick={() =>
                  dispatch(uiActions.openDialog({ type: "access", id: node.id }))
                }
              >
                {nodePermissions(node).canShare ? "Kelola akses" : "Lihat akses"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <section>
        <h4 className="mb-1 text-xs font-semibold">Informasi</h4>
        <dl className="divide-y divide-border/60">
          <Row label="Jenis">
            {node.kind === "workspace"
              ? "Workspace"
              : node.kind === "folder"
                ? "Folder"
                : FILE_TYPE_META[node.fileType ?? "other"].label}
          </Row>
          <Row label="Ukuran">{formatBytes(totalSize)}</Row>
          {subtree && (
            <Row label="Isi">
              {(index[node.id]?.length ?? 0).toLocaleString("id-ID")} item
              langsung
            </Row>
          )}
          {node.kind === "file" && (
            <Row label="Versi">
              <span className="flex flex-wrap items-center gap-x-2">
                v{node.version ?? 1} · {node.versions?.length ?? 1} versi
                <button
                  className="text-primary hover:underline"
                  onClick={() =>
                    dispatch(
                      uiActions.openDialog({
                        type: "preview",
                        id: node.id,
                        tab: "versions",
                      }),
                    )
                  }
                >
                  Lihat riwayat
                </button>
              </span>
            </Row>
          )}
          {location.length > 0 && (
            <Row label="Lokasi">
              <span className="flex flex-wrap gap-x-1">
                {location.map((p, i) => (
                  <span key={p.id} className="inline-flex items-center gap-1">
                    <button
                      className="hover:text-primary hover:underline"
                      onClick={() =>
                        dispatch(navigate({ page: "folder", id: p.id }))
                      }
                    >
                      {p.name}
                    </button>
                    {i < location.length - 1 && (
                      <span className="text-muted-foreground">›</span>
                    )}
                  </span>
                ))}
              </span>
            </Row>
          )}
        </dl>
      </section>

      <section>
        <h4 className="mb-1 text-xs font-semibold">Jejak audit</h4>
        <dl className="divide-y divide-border/60">
          <Row label="Dibuat oleh">
            <Who
              user={users[node.createdBy]}
              at={node.createdAt}
              now={now}
              me={me}
            />
          </Row>
          <Row label="Terakhir diubah">
            <Who
              user={users[node.updatedBy]}
              at={node.updatedAt}
              now={now}
              me={me}
            />
          </Row>
          <Row label="Terakhir dibuka">
            <Who
              user={node.lastOpenedBy ? users[node.lastOpenedBy] : undefined}
              at={node.lastOpenedAt}
              now={now}
              me={me}
            />
          </Row>
        </dl>
      </section>

      {node.kind === "workspace" && (
        <section>
          <div className="mb-1.5 flex items-center justify-between">
            <h4 className="text-xs font-semibold">
              Anggota ({node.members?.length ?? 0})
            </h4>
            <Button
              variant="ghost"
              size="xs"
              onClick={() =>
                dispatch(
                  uiActions.openDialog({
                    type: "members",
                    workspaceId: node.id,
                  }),
                )
              }
            >
              <Users /> Kelola
            </Button>
          </div>
          <ul className="space-y-1.5">
            {(node.members ?? []).map((m) => {
              const u = users[m.userId];
              return (
                <li key={m.userId} className="flex items-center gap-2 text-xs">
                  <UserAvatar user={u} size="sm" showStatus />
                  <span className="min-w-0 flex-1 truncate">{u?.name}</span>
                  <WorkspaceRoleBadge role={m.role} />
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function NodeActivity({ node, now }: { node: DriveNode | null; now: number }) {
  const dispatch = useAppDispatch();
  const logs = useAppSelector(selectLogs);
  const index = useAppSelector(selectChildrenIndex);
  const filtered = useMemo(() => {
    if (!node) return logs.slice(0, 40);
    if (node.kind === "workspace")
      return logs.filter((l) => l.workspaceId === node.id).slice(0, 60);
    const ids =
      node.kind === "folder"
        ? getSubtreeIds(index, node.id)
        : new Set([node.id]);
    return logs.filter((l) => l.targetId && ids.has(l.targetId)).slice(0, 60);
  }, [logs, index, node]);

  if (!filtered.length)
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        Belum ada aktivitas.
      </p>
    );
  return (
    <div>
      <GroupedLogs logs={filtered} now={now} />
      <Button
        variant="outline"
        size="sm"
        className="mt-4 w-full"
        onClick={() => dispatch(navigate({ page: "activity" }))}
      >
        Buka Log Aktivitas lengkap
      </Button>
    </div>
  );
}

export function DetailsPanelContent({ onClose }: { onClose: () => void }) {
  const now = useNow();
  const route = useAppSelector((s) => s.ui.route);
  const selectedId = useAppSelector((s) => s.ui.selectedId);
  const nodes = useAppSelector((s) => s.drive.nodes);
  const id = selectedId ?? (route.page === "folder" ? route.id : null);
  const node = id ? (nodes[id] ?? null) : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        {node ? (
          <NodeIcon node={node} size="sm" />
        ) : (
          <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Activity className="size-4" />
          </span>
        )}
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">
          {node ? node.name : "Aktivitas terbaru"}
        </h3>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Tutup panel detail"
        >
          <X />
        </Button>
      </div>
      <Tabs
        key={node?.id ?? "none"}
        defaultValue={node ? "details" : "activity"}
        className="min-h-0 flex-1 gap-0"
      >
        {node && (
          <TabsList className="mx-4 mt-3 w-[calc(100%-2rem)]">
            <TabsTrigger value="details">
              <Info /> Detail
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity /> Aktivitas
            </TabsTrigger>
          </TabsList>
        )}
        <TabsContent
          value="details"
          className="min-h-0 overflow-y-auto px-4 py-4"
        >
          {node && <NodeDetails node={node} now={now} />}
        </TabsContent>
        <TabsContent
          value="activity"
          className={cn("min-h-0 overflow-y-auto bg-background px-4 py-3")}
        >
          <NodeActivity node={node} now={now} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
