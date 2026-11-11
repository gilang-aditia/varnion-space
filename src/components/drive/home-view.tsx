import { useMemo } from "react";
import { Activity, Files, HardDrive, LayoutGrid, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKSPACE_COLORS } from "@/lib/colors";
import { formatBytes, formatRelative } from "@/lib/format";
import { ACTIVITY_META } from "@/lib/activity";
import { getWorkspaceRole } from "@/lib/rbac";
import { vtName } from "@/lib/view-transition";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectAccessibleWorkspaces,
  selectRecent,
  selectLogs,
  selectWorkspaceStats,
} from "@/store/selectors";
import { uiActions } from "@/store/slices/uiSlice";
import { openNode } from "@/store/thunks";
import { useCurrentUser, useNow, usePermissions } from "@/hooks/use-drive";
import type { ActivityLog, DriveNode } from "@/types/drive";
import { NodeIcon } from "@/components/common/node-icon";
import { UserAvatar } from "@/components/common/user-avatar";
import { WorkspaceRoleBadge } from "@/components/common/role-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { FileCard } from "./node-views";
import { displayName } from "@/lib/node-utils";
import { NodeMenu } from "./node-menu";

function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

function WorkspaceCard({
  ws,
  lastLog,
  now,
}: {
  ws: DriveNode;
  lastLog?: ActivityLog;
  now: number;
}) {
  const dispatch = useAppDispatch();
  const me = useCurrentUser();
  const usersById = useAppSelector((s) => s.users.byId);
  const stats = useAppSelector(selectWorkspaceStats)[ws.id] ?? {
    files: 0,
    folders: 0,
    size: 0,
  };
  const role = getWorkspaceRole(me, ws);
  const color = WORKSPACE_COLORS[ws.color ?? "blue"];
  const members = ws.members ?? [];
  const actor = lastLog?.actorId ? usersById[lastLog.actorId] : undefined;
  const open = () => dispatch(openNode(ws.id));

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) =>
        (e.key === "Enter" || e.key === " ") && (e.preventDefault(), open())
      }
      className="vt-node group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      data-vt-name={vtName(ws.id)}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-linear-to-br",
          color.gradient,
        )}
      />
      <div className="relative flex items-start gap-3">
        <NodeIcon node={ws} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold">{ws.name}</h3>
          <p className="mt-0.5 line-clamp-2 min-h-8 text-xs leading-4 text-muted-foreground">
            {ws.description}
          </p>
        </div>
        <NodeMenu node={ws} className="-mt-1 -mr-1.5" />
      </div>

      <div className="relative mt-4 flex items-center justify-between gap-2">
        <div className="flex -space-x-1">
          {members.slice(0, 4).map((m) => (
            <UserAvatar
              key={m.userId}
              user={usersById[m.userId]}
              size="sm"
              tooltip
              className="ring-2 ring-card"
            />
          ))}
          {members.length > 4 && (
            <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-card">
              +{members.length - 4}
            </span>
          )}
        </div>
        {role && <WorkspaceRoleBadge role={role} />}
      </div>

      <div className="relative mt-3 grid grid-cols-3 gap-2 rounded-xl bg-background/70 p-2 text-center ring-1 ring-foreground/5">
        <div>
          <p className="text-sm font-semibold tabular-nums">{stats.folders}</p>
          <p className="text-[11px] text-muted-foreground">Folder</p>
        </div>
        <div>
          <p className="text-sm font-semibold tabular-nums">{stats.files}</p>
          <p className="text-[11px] text-muted-foreground">File</p>
        </div>
        <div>
          <p className="text-sm font-semibold tabular-nums">
            {formatBytes(stats.size)}
          </p>
          <p className="text-[11px] text-muted-foreground">Ukuran</p>
        </div>
      </div>

      <div className="relative mt-3 flex min-h-5 items-center gap-1.5 text-xs text-muted-foreground">
        {lastLog ? (
          <>
            <UserAvatar user={actor} size="xs" />
            <span className="truncate">
              <span className="font-medium text-foreground/80">
                {displayName(actor, me)}
              </span>{" "}
              {ACTIVITY_META[lastLog.action].label.toLowerCase()}{" "}
              {lastLog.targetName}
            </span>
            <span className="ml-auto shrink-0">
              {formatRelative(lastLog.at, now)}
            </span>
          </>
        ) : (
          <span>Belum ada aktivitas</span>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Files;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3.5">
      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg leading-tight font-semibold tabular-nums">
          {value}
        </p>
        {hint && (
          <p className="truncate text-[11px] text-muted-foreground">{hint}</p>
        )}
      </div>
    </div>
  );
}

export function HomeView() {
  const dispatch = useAppDispatch();
  const me = useCurrentUser();
  const now = useNow();
  const workspaces = useAppSelector(selectAccessibleWorkspaces);
  const stats = useAppSelector(selectWorkspaceStats);
  const logs = useAppSelector(selectLogs);
  const recent = useAppSelector(selectRecent);
  const nodes = useAppSelector((s) => s.drive.nodes);
  const perms = usePermissions();

  const totals = workspaces.reduce(
    (acc, ws) => {
      const s = stats[ws.id];
      acc.files += s?.files ?? 0;
      acc.size += s?.size ?? 0;
      return acc;
    },
    { files: 0, size: 0 },
  );

  const { lastByWs, todayCount } = useMemo(() => {
    const map: Record<string, ActivityLog> = {};
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    let today = 0;
    for (const l of logs) {
      if (Date.parse(l.at) >= start.getTime()) today++;
      if (l.workspaceId && l.action !== "open" && !map[l.workspaceId])
        map[l.workspaceId] = l;
    }
    return { lastByWs: map, todayCount: today };
  }, [logs]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{greeting()},</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {me?.name ?? ""} 👋
          </h1>
        </div>
        {perms.canSystem("workspace.create") && (
          <Button
            onClick={() =>
              dispatch(uiActions.openDialog({ type: "newWorkspace" }))
            }
            className="gap-1.5"
          >
            <Plus className="size-4" />
            Workspace baru
          </Button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={LayoutGrid}
          label="Workspace"
          value={String(workspaces.length)}
          hint="yang dapat Anda akses"
        />
        <StatCard
          icon={Files}
          label="Total file"
          value={totals.files.toLocaleString("id-ID")}
        />
        <StatCard
          icon={HardDrive}
          label="Terpakai"
          value={formatBytes(totals.size)}
        />
        <StatCard
          icon={Activity}
          label="Aktivitas hari ini"
          value={String(todayCount)}
          hint="tercatat di log"
        />
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Workspace</h2>
          <p className="text-xs text-muted-foreground">
            Klik untuk membuka — struktur akan pindah ke sidebar
          </p>
        </div>
        {workspaces.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {workspaces.map((ws) => (
              <WorkspaceCard
                key={ws.id}
                ws={ws}
                lastLog={lastByWs[ws.id]}
                now={now}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={LayoutGrid}
            title="Belum ada workspace"
            description="Anda belum menjadi anggota workspace mana pun. Minta Pengelola atau Administrator untuk menambahkan Anda."
            className="rounded-2xl border border-dashed"
          />
        )}
      </section>

      {recent.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-base font-semibold">Baru-baru ini</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {recent.slice(0, 5).map((n) => (
              <FileCard
                key={n.id}
                node={n}
                now={now}
                showLocation={`di ${nodes[n.workspaceId]?.name ?? ""}`}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
