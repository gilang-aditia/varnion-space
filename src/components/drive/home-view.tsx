import { useCallback, useEffect, useState } from "react";
import {
  Activity as ActivityIcon,
  ArchiveRestore,
  Files,
  HardDrive,
  Copy,
  EllipsisVertical,
  ExternalLink,
  Info,
  PencilLine,
  Users,
  LayoutGrid,
  Loader2,
  Plus,
  RotateCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKSPACE_COLORS } from "@/lib/colors";
import {
  formatBytes,
  formatDate,
  formatDateTime,
  formatRelative,
} from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { uiActions } from "@/store/slices/uiSlice";
import { useCurrentUser, useNow, usePermissions } from "@/hooks/use-drive";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { NodeIcon } from "@/components/common/node-icon";
import { UserAvatar } from "@/components/common/user-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { DeletedStamp } from "@/components/common/deleted-stamp";
import { Pagination } from "@/components/common/pagination";
import { SEARCH_DEBOUNCE_MS } from "@/components/common/paged-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WORKSPACE_STATUS_OPTIONS } from "@/features/workspace/constants";
import { WorkspaceStatusBadge } from "@/features/workspace/components/WorkspaceStatusBadge";
import { fetchWorkspaces } from "@/features/workspace/redux/workspaceAction";
import {
  clearWorkspaceFilters,
  setWorkspaceCurrentPage,
  setWorkspaceDeletedView,
  setWorkspaceLimit,
  setWorkspaceSearch,
  setWorkspaceStatusFilter,
} from "@/features/workspace/redux/workspaceSlice";
import type { WorkspaceData } from "@/features/workspace/redux/workspaceType";
import { workspaceColorOf } from "@/features/workspace/utils";
import { restoreWorkspace } from "@/features/workspace/redux/restoreWorkspaceAction";
import { DeleteWorkspaceDialog } from "@/features/workspace/components/DeleteWorkspaceDialog";

function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

/** Kartu workspace — seluruh data dari `GET /workspaces`. */
function WorkspaceCard({
  ws,
  now,
  deleted = false,
}: {
  ws: WorkspaceData;
  now: number;
  /** Workspace di-soft delete → abu-abu, nama dicoret, badge "Dihapus". */
  deleted?: boolean;
}) {
  const color = workspaceColorOf(ws.id);
  const gradient = WORKSPACE_COLORS[color].gradient;
  const creator = ws.created_by?.name
    ? { name: ws.created_by.name, avatarColor: color }
    : null;
  const dispatch = useAppDispatch();
  const perms = usePermissions();
  const canManageMembers = perms.has("members.manage");
  const canManage = perms.canSystem("workspace.create");
  const restoring = useAppSelector((s) => s.restoreWorkspace.loading);
  const restoringThis = useAppSelector(
    (s) => s.restoreWorkspace.pendingId === ws.id,
  );
  /** Dialog hapus: `soft` → dua pilihan; `hard` → langsung hapus permanen. */
  const [deleting, setDeleting] = useState<"soft" | "hard" | null>(null);

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card p-4 text-left transition hover:border-primary/30 hover:shadow-lg",
        deleted &&
          "border-dashed border-destructive/30 [&>:not([data-stamp])]:opacity-70 [&>:not([data-stamp])]:grayscale",
      )}
    >
      {deleted && <DeletedStamp size="sm" deletedAt={ws.deleted_at} />}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-linear-to-br",
          gradient,
        )}
      />
      <div className="relative flex items-start gap-3">
        <NodeIcon
          node={{ kind: "workspace", name: ws.name, color }}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "truncate text-[15px] font-semibold",
              deleted && "line-through decoration-destructive/60",
            )}
          >
            {ws.name}
          </h3>
          <p className="mt-0.5 line-clamp-2 min-h-8 text-xs leading-4 text-muted-foreground">
            {ws.description || "Tanpa deskripsi"}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="-mt-1 -mr-1.5 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground data-[state=open]:bg-foreground/10"
              aria-label={`Aksi untuk ${ws.name}`}
            >
              <EllipsisVertical className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {!deleted && (
              <>
                {/* Buka & anggota: diintegrasikan menyusul per endpoint */}
                <DropdownMenuItem>
                  <ExternalLink />
                  Buka
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Users />
                  {canManageMembers ? "Kelola anggota" : "Lihat anggota"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    dispatch(
                      uiActions.openDialog({
                        type: "editWorkspace",
                        id: ws.id,
                      }),
                    )
                  }
                >
                  <PencilLine />
                  Edit workspace
                </DropdownMenuItem>
              </>
            )}
            {deleted && canManage && (
              <DropdownMenuItem
                disabled={restoring}
                onSelect={() => void dispatch(restoreWorkspace({ id: ws.id }))}
              >
                {restoringThis ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <ArchiveRestore />
                )}
                Pulihkan
              </DropdownMenuItem>
            )}
            {!deleted && (
              <DropdownMenuItem
                onSelect={() => dispatch(uiActions.showDetails(ws.id))}
              >
                <Info />
                Detail & aktivitas
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={() => {
                void navigator.clipboard?.writeText(ws.id).then(() =>
                  dispatch(
                    uiActions.toastAdded({
                      title: "ID workspace disalin",
                      description: ws.id,
                    }),
                  ),
                );
              }}
            >
              <Copy />
              Salin ID workspace
            </DropdownMenuItem>
            {canManage && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setDeleting(deleted ? "hard" : "soft")}
                >
                  <Trash2 />
                  {deleted ? "Hapus permanen" : "Hapus"}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative mt-4 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <UserAvatar
            user={creator}
            size="sm"
            tooltip
            className="ring-2 ring-card"
          />
          <span
            className="truncate text-xs text-muted-foreground"
            title={`Dibuat ${formatDateTime(ws.created_at)} · Diperbarui ${formatDateTime(ws.updated_at)}`}
          >
            Dibuat {formatDate(ws.created_at)}
          </span>
        </div>
        <WorkspaceStatusBadge status={ws.status} deleted={deleted} />
      </div>

      <div className="relative mt-3 grid grid-cols-3 gap-2 rounded-xl bg-background/70 p-2 text-center ring-1 ring-foreground/5">
        <div>
          <p className="text-sm font-semibold tabular-nums">
            {ws.total_folders ?? 0}
          </p>
          <p className="text-[11px] text-muted-foreground">Folder</p>
        </div>
        <div>
          <p className="text-sm font-semibold tabular-nums">
            {ws.total_files ?? 0}
          </p>
          <p className="text-[11px] text-muted-foreground">File</p>
        </div>
        <div>
          <p className="text-sm font-semibold tabular-nums">
            {ws.total_size_formatted || formatBytes(ws.total_size)}
          </p>
          <p className="text-[11px] text-muted-foreground">Ukuran</p>
        </div>
      </div>

      <div className="relative mt-3 flex min-h-5 items-center gap-1.5 text-xs text-muted-foreground">
        {ws.last_activity_at ? (
          <>
            <ActivityIcon className="size-3.5 shrink-0" />
            <span className="truncate">
              {ws.last_activity || "Aktivitas terakhir"}
            </span>
            <span
              className="ml-auto shrink-0"
              title={formatDateTime(ws.last_activity_at)}
            >
              {formatRelative(ws.last_activity_at, now)}
            </span>
          </>
        ) : (
          <span>Belum ada aktivitas</span>
        )}
      </div>
      {deleting && (
        <DeleteWorkspaceDialog
          workspace={ws}
          onlyHard={deleting === "hard"}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

/** Placeholder kartu saat daftar workspace dimuat. */
function WorkspaceCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border bg-card p-4" aria-hidden>
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
        </div>
      </div>
      <div className="mt-4 h-20 rounded-xl bg-muted/60" />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof LayoutGrid;
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
  const perms = usePermissions();

  // Workspace dari API: GET /workspaces?page=&per_page=&search=&status=&deleted=
  const {
    workspaces,
    meta,
    loading,
    error,
    currentPage,
    limit,
    search,
    status,
    deleted,
    summary,
  } = useAppSelector((s) => s.workspaceList);
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedCallback(
    (value: string) => dispatch(setWorkspaceSearch(value.trim())),
    SEARCH_DEBOUNCE_MS,
  );
  const statusFiltered = status !== "all";
  const hasQuery = searchInput !== "" || search !== "" || statusFiltered;

  const loadWorkspaces = useCallback(() => {
    void dispatch(
      fetchWorkspaces({
        page: currentPage,
        per_page: limit,
        search,
        status,
        deleted,
      }),
    );
  }, [dispatch, currentPage, limit, search, status, deleted]);

  // muat ulang setiap page / limit / search / filter / tampilan berubah
  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  let workspaceBody;
  if (error && !loading) {
    workspaceBody = (
      <EmptyState
        icon={LayoutGrid}
        title="Gagal memuat workspace"
        description={error}
        className="rounded-2xl border border-dashed"
        action={
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={loadWorkspaces}
          >
            <RotateCw className="size-4" /> Coba lagi
          </Button>
        }
      />
    );
  } else if (workspaces.length === 0 && (loading || !meta)) {
    workspaceBody = (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <WorkspaceCardSkeleton key={i} />
        ))}
      </div>
    );
  } else if (workspaces.length === 0) {
    workspaceBody = (
      <EmptyState
        icon={deleted ? Trash2 : LayoutGrid}
        title={
          search
            ? `Tidak ada hasil untuk “${search}”`
            : statusFiltered
              ? "Tidak ada workspace yang cocok dengan filter"
              : deleted
                ? "Tidak ada workspace terhapus"
                : "Belum ada workspace"
        }
        description={
          search || statusFiltered
            ? "Coba kata kunci atau filter lain."
            : deleted
              ? "Workspace yang dihapus sementara akan muncul di sini."
              : "Anda belum menjadi anggota workspace mana pun. Minta Pengelola atau Administrator untuk menambahkan Anda."
        }
        className="rounded-2xl border border-dashed"
      />
    );
  } else {
    workspaceBody = (
      <div
        className={cn(
          "grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3",
          loading && "opacity-60",
        )}
      >
        {workspaces.map((ws) => (
          <WorkspaceCard
            key={ws.id}
            ws={ws}
            now={now}
            deleted={deleted || !!ws.deleted_at}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 pt-6 sm:px-6 lg:px-8">
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
          value={summary ? String(summary.workspaces) : "—"}
          hint="yang dapat Anda akses"
        />
        <StatCard
          icon={Files}
          label="Total file"
          value={summary ? summary.files.toLocaleString("id-ID") : "—"}
        />
        <StatCard
          icon={HardDrive}
          label="Terpakai"
          value={summary ? formatBytes(summary.size) : "—"}
        />
        <StatCard
          icon={ActivityIcon}
          label="Aktivitas hari ini"
          value={summary ? String(summary.activeToday) : "—"}
          hint="workspace dengan aktivitas"
        />
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Workspace</h2>
        </div>

        {/* Pencarian, filter status, tampilan terhapus */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                debouncedSearch(e.target.value);
              }}
              placeholder="Cari nama atau deskripsi workspace…"
              className="pr-8 pl-8"
              aria-label="Cari workspace"
            />
            {loading && (
              <Loader2 className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>

          <Select
            value={status}
            onValueChange={(v) => dispatch(setWorkspaceStatusFilter(v))}
          >
            <SelectTrigger className="w-40" aria-label="Filter status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">Semua status</SelectItem>
              {WORKSPACE_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div
            role="tablist"
            aria-label="Tampilan workspace"
            className="inline-flex h-9 items-center rounded-lg border bg-muted/40 p-0.5"
          >
            {[
              { value: false, label: "Workspace", icon: LayoutGrid },
              { value: true, label: "Terhapus", icon: Trash2 },
            ].map((v) => (
              <button
                key={v.label}
                type="button"
                role="tab"
                aria-selected={deleted === v.value}
                onClick={() => dispatch(setWorkspaceDeletedView(v.value))}
                className={cn(
                  "inline-flex h-full items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
                  deleted === v.value
                    ? cn(
                        "bg-background shadow-xs",
                        v.value && "text-destructive",
                      )
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <v.icon className="size-4" />
                {v.label}
              </button>
            ))}
          </div>

          {hasQuery && (
            <Button
              variant="ghost"
              className="gap-1.5 text-muted-foreground"
              onClick={() => {
                setSearchInput("");
                debouncedSearch.cancel();
                dispatch(clearWorkspaceFilters());
              }}
            >
              <X /> Reset filter
            </Button>
          )}
        </div>

        {workspaceBody}
      </section>

      {/* Pagination workspace: terdorong ke dasar layar, tetap terlihat saat halaman di-scroll */}
      <div className="sticky bottom-0 mt-auto bg-linear-to-t from-background from-70% to-transparent pt-6 pb-6">
        {meta && meta.total > 0 && (
          <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
            <Pagination
              meta={meta}
              disabled={loading}
              onPageChange={(page) => dispatch(setWorkspaceCurrentPage(page))}
              onPerPageChange={(value) => dispatch(setWorkspaceLimit(value))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
