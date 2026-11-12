import { useEffect, useMemo, type ReactNode } from "react";
import { Activity, Info, Loader2, RotateCw, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FILE_TYPE_META } from "@/lib/file-types";
import {
  dayKey,
  formatBytes,
  formatDateTime,
  formatDayGroup,
  formatWhen,
} from "@/lib/format";
import {
  describePermissions,
  getWorkspaceRole,
  nodePermissions,
} from "@/lib/rbac";
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
import { ACTIVITY_META } from "@/lib/activity";
import { avatarColorOf } from "@/lib/user-mapper";
import { WorkspaceStatusBadge } from "@/features/workspace/components/WorkspaceStatusBadge";
import { fetchWorkspaceDetail } from "@/features/workspace/redux/workspaceDetailAction";
import { fetchWorkspaceLogs } from "@/features/workspace/redux/workspaceLogsAction";
import type { WorkspaceLog } from "@/features/workspace/redux/workspaceLogsType";
import type {
  WorkspaceCreator,
  WorkspaceData,
} from "@/features/workspace/redux/workspaceType";
import type { WorkspaceDetail } from "@/features/workspace/redux/workspaceDetailType";
import {
  workspaceColorOf,
  workspaceLogAction,
} from "@/features/workspace/utils";
import type { ActivityLog, DriveNode, User } from "@/types/drive";
import { NodeIcon } from "@/components/common/node-icon";
import { UserAvatar } from "@/components/common/user-avatar";
import {
  AccessBadge,
  WorkspaceRoleBadge,
} from "@/components/common/role-badge";
import {
  ActivityItem,
  ActivityItemView,
} from "@/components/activity/activity-item";
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
  user?: (Pick<User, "name" | "avatarColor"> & { id?: string }) | null;
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
            ? user.id && user.id === me?.id
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

/** Kelompokkan item per hari (label "Hari ini", "Kemarin", …) — tampilan log aktivitas. */
function GroupedByDay<T>({
  items,
  getAt,
  getKey,
  render,
}: {
  items: T[];
  getAt: (item: T) => string;
  getKey: (item: T, index: number) => string;
  render: (item: T) => ReactNode;
}) {
  const groups = useMemo(() => {
    const out: { key: string; label: string; items: T[] }[] = [];
    for (const item of items) {
      const at = getAt(item);
      const k = dayKey(at);
      const last = out[out.length - 1];
      if (last?.key === k) last.items.push(item);
      else out.push({ key: k, label: formatDayGroup(at), items: [item] });
    }
    return out;
  }, [items, getAt]);
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.key}>
          <p className="sticky top-0 z-1 bg-inherit py-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {g.label}
          </p>
          <div className="divide-y divide-border/60">
            {g.items.map((item, i) => (
              <div key={getKey(item, i)}>{render(item)}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const logAt = (l: ActivityLog) => l.at;
const logKey = (l: ActivityLog) => l.id;

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
  return (
    <GroupedByDay
      items={logs}
      getAt={logAt}
      getKey={logKey}
      render={(l) => (
        <ActivityItem
          log={l}
          compact={compact}
          showWorkspace={showWorkspace}
          now={now}
        />
      )}
    />
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
                    dispatch(
                      uiActions.openDialog({ type: "share", id: node.id }),
                    )
                  }
                >
                  Bagikan
                </Button>
              )}
              <Button
                variant="ghost"
                size="xs"
                onClick={() =>
                  dispatch(
                    uiActions.openDialog({ type: "access", id: node.id }),
                  )
                }
              >
                {nodePermissions(node).canShare
                  ? "Kelola akses"
                  : "Lihat akses"}
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

/** Orang dari respons API (`{ name, email }`) → bentuk yang dipakai avatar. */
const toPerson = (p?: WorkspaceCreator | null) =>
  p?.name
    ? { name: p.name, avatarColor: avatarColorOf(p.email || p.name) }
    : null;

/** Tab "Detail" untuk workspace dari API (GET /workspaces/{id}). */
function WorkspaceDetails({
  workspace: ws,
  now,
}: {
  workspace: WorkspaceData | WorkspaceDetail;
  now: number;
}) {
  const me = useCurrentUser();
  const actor =
    "last_activity_actor" in ws
      ? (ws.last_activity_actor ?? ws.last_activity_by)
      : null;

  return (
    <div className="space-y-4">
      {ws.description && (
        <p className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
          {ws.description}
        </p>
      )}

      <div className="flex items-center justify-between rounded-lg border px-3 py-2">
        <span className="text-xs text-muted-foreground">Status</span>
        <WorkspaceStatusBadge status={ws.status} deleted={!!ws.deleted_at} />
      </div>

      <section>
        <h4 className="mb-1 text-xs font-semibold">Informasi</h4>
        <dl className="divide-y divide-border/60">
          <Row label="Jenis">Workspace</Row>
          <Row label="Ukuran">
            {ws.total_size_formatted || formatBytes(ws.total_size)}
          </Row>
          <Row label="Isi">
            {(ws.total_folders ?? 0).toLocaleString("id-ID")} folder ·{" "}
            {(ws.total_files ?? 0).toLocaleString("id-ID")} file
          </Row>
        </dl>
      </section>

      <section>
        <h4 className="mb-1 text-xs font-semibold">Jejak audit</h4>
        <dl className="divide-y divide-border/60">
          <Row label="Dibuat oleh">
            <Who
              user={toPerson(ws.created_by)}
              at={ws.created_at}
              now={now}
              me={me}
            />
          </Row>
          <Row label="Terakhir diubah">
            <span
              className="text-muted-foreground"
              title={formatDateTime(ws.updated_at)}
            >
              {formatWhen(ws.updated_at, now)}
            </span>
          </Row>
          <Row label="Aktivitas terakhir">
            {ws.last_activity_at ? (
              <div className="space-y-1">
                <Who
                  user={toPerson(actor)}
                  at={ws.last_activity_at}
                  now={now}
                  me={me}
                />
                {ws.last_activity && (
                  <p className="text-muted-foreground">{ws.last_activity}</p>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Row>
        </dl>
      </section>
    </div>
  );
}

const wsLogAt = (l: WorkspaceLog) => l._time;
const wsLogKey = (l: WorkspaceLog, i: number) =>
  `${l._stream_id}-${l._time}-${i}`;

/** Tab "Aktivitas" untuk workspace dari API (GET /workspaces/{id}/logs). */
function WorkspaceActivity({
  workspaceId,
  now,
}: {
  workspaceId: string;
  now: number;
}) {
  const dispatch = useAppDispatch();
  const me = useCurrentUser();
  const {
    logs,
    loading,
    error,
    workspaceId: logsFor,
  } = useAppSelector((s) => s.workspaceLogs);
  const items = logsFor === workspaceId ? logs : [];
  const reload = () =>
    void dispatch(fetchWorkspaceLogs({ id: workspaceId, limit: 50 }));

  if (loading && !items.length)
    return (
      <div className="flex justify-center py-8">
        <Loader2
          className="size-5 animate-spin text-muted-foreground"
          aria-label="Memuat"
        />
      </div>
    );
  if (error && !items.length)
    return (
      <div className="py-8 text-center text-xs">
        <p className="text-destructive">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 gap-1.5"
          onClick={reload}
        >
          <RotateCw /> Coba lagi
        </Button>
      </div>
    );
  if (!items.length)
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        Belum ada aktivitas.
      </p>
    );
  return (
    <GroupedByDay
      items={items}
      getAt={wsLogAt}
      getKey={wsLogKey}
      render={(l) => {
        const meta = ACTIVITY_META[workspaceLogAction(l)];
        const isMe = !!me?.email && l.user_email === me.email;
        return (
          <ActivityItemView
            compact
            now={now}
            at={l._time}
            icon={meta.icon}
            tone={meta.tone}
            actor={toPerson({ name: l.user_name, email: l.user_email })}
            sentence={
              <>
                <span className="font-medium text-foreground">
                  {isMe ? "Anda" : l.user_name || l.user_email || "Sistem"}
                </span>{" "}
                — {l._msg}
              </>
            }
          />
        );
      }}
    />
  );
}

export function DetailsPanelContent({ onClose }: { onClose: () => void }) {
  const now = useNow();
  const route = useAppSelector((s) => s.ui.route);
  const selectedId = useAppSelector((s) => s.ui.selectedId);
  const nodes = useAppSelector((s) => s.drive.nodes);
  const id = selectedId ?? (route.page === "folder" ? route.id : null);
  const node = id ? (nodes[id] ?? null) : null;
  // Bukan node drive → workspace dari API (daftar beranda / detail)
  const apiWorkspace = useAppSelector((s) => {
    if (!id || node) return null;
    const detail = s.workspaceDetail.workspace;
    if (detail?.id === id) return detail;
    return s.workspaceList.workspaces.find((w) => w.id === id) ?? null;
  });
  const dispatch = useAppDispatch();
  const apiWorkspaceId = apiWorkspace?.id ?? null;

  useEffect(() => {
    if (!apiWorkspaceId) return;
    void dispatch(fetchWorkspaceDetail({ id: apiWorkspaceId }));
    void dispatch(fetchWorkspaceLogs({ id: apiWorkspaceId, limit: 50 }));
  }, [dispatch, apiWorkspaceId]);

  if (apiWorkspace) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <NodeIcon
            node={{
              kind: "workspace",
              name: apiWorkspace.name,
              color: workspaceColorOf(apiWorkspace.id),
            }}
            size="sm"
          />
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">
            {apiWorkspace.name}
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
          key={apiWorkspace.id}
          defaultValue="details"
          className="min-h-0 flex-1 gap-0"
        >
          <TabsList className="mx-4 mt-3 w-[calc(100%-2rem)]">
            <TabsTrigger value="details">
              <Info /> Detail
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity /> Aktivitas
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="details"
            className="min-h-0 overflow-y-auto px-4 py-4"
          >
            <WorkspaceDetails workspace={apiWorkspace} now={now} />
          </TabsContent>
          <TabsContent
            value="activity"
            className="min-h-0 overflow-y-auto bg-background px-4 py-3"
          >
            <WorkspaceActivity workspaceId={apiWorkspace.id} now={now} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

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
