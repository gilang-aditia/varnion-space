import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Clock,
  FolderPlus,
  HardDrive,
  House,
  LayoutGrid,
  Lock,
  Plus,
  Trash,
  Upload,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectRoute,
  selectSharedWithMe,
  selectTrash,
  selectWorkspaceStats,
  selectAccessibleWorkspaces,
} from "@/store/selectors";
import { uiActions, type Route } from "@/store/slices/uiSlice";
import { navigate } from "@/store/thunks";
import { usePermissions } from "@/hooks/use-drive";
import { nodePermissions } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderTree } from "./folder-tree";
import { useUpload } from "@/components/drive/upload-context";

const QUOTA = 100 * 1024 ** 3; // 100 GB

function NavItem({
  icon: Icon,
  label,
  route,
  badge,
}: {
  icon: LucideIcon;
  label: string;
  route: Route;
  badge?: number;
}) {
  const dispatch = useAppDispatch();
  const current = useAppSelector(selectRoute);
  const active = current.page === route.page;
  return (
    <button
      type="button"
      onClick={() => dispatch(navigate(route))}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 w-full items-center gap-3 rounded-full px-3 text-sm transition-colors",
        active
          ? "bg-primary/12 font-semibold text-primary"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 truncate text-left">{label}</span>
      {!!badge && (
        <span className="rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground tabular-nums">
          {badge}
        </span>
      )}
    </button>
  );
}

/** Tombol "Baru" — isi menunya mengikuti izin user di lokasi saat ini. */
function NewButton() {
  const dispatch = useAppDispatch();
  const route = useAppSelector(selectRoute);
  const currentNode = useAppSelector((s) =>
    route.page === "folder" ? s.drive.nodes[route.id] : undefined,
  );
  const perms = usePermissions(currentNode?.workspaceId);
  const upload = useUpload();
  const canCreate = !!currentNode && nodePermissions(currentNode).canEdit;
  const canCreateWs = perms.canSystem("workspace.create");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="lg"
          className="h-11 w-fit gap-2 rounded-2xl px-4 shadow-sm"
        >
          <Plus className="size-5" />
          Baru
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {currentNode ? (
          <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
            Di “{currentNode.name}”
          </DropdownMenuLabel>
        ) : (
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Buka workspace untuk menambah file
          </DropdownMenuLabel>
        )}
        <DropdownMenuItem
          disabled={!canCreate}
          onSelect={() =>
            currentNode &&
            dispatch(
              uiActions.openDialog({
                type: "newFolder",
                parentId: currentNode.id,
              }),
            )
          }
        >
          <FolderPlus />
          Folder baru
          {currentNode && !canCreate && <Lock className="ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!canCreate}
          onSelect={() => currentNode && upload.pickFiles(currentNode.id)}
        >
          <Upload />
          Unggah file
          {currentNode && !canCreate && <Lock className="ml-auto" />}
        </DropdownMenuItem>
        {canCreateWs && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() =>
                dispatch(uiActions.openDialog({ type: "newWorkspace" }))
              }
            >
              <LayoutGrid />
              Workspace baru
            </DropdownMenuItem>
          </>
        )}
        {currentNode && !canCreate && (
          <p className="px-2 pt-1 pb-1.5 text-[11px] text-muted-foreground">
            Anda tidak punya izin edit di lokasi ini.
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SidebarContent({
  enableTransitions,
}: {
  enableTransitions: boolean;
}) {
  const route = useAppSelector(selectRoute);
  const trash = useAppSelector(selectTrash);
  const shared = useAppSelector(selectSharedWithMe);
  const stats = useAppSelector(selectWorkspaceStats);
  const workspaces = useAppSelector(selectAccessibleWorkspaces);
  const perms = usePermissions();
  const used = workspaces.reduce(
    (sum, ws) => sum + (stats[ws.id]?.size ?? 0),
    0,
  );
  const onHome = route.page === "home";

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="px-3">
        <NewButton />
      </div>

      <nav aria-label="Navigasi utama" className="space-y-0.5 px-3">
        <NavItem
          icon={House}
          label="Semua Workspace"
          route={{ page: "home" }}
        />
        <NavItem icon={Clock} label="Terbaru" route={{ page: "recent" }} />
        <NavItem
          icon={UserRoundCheck}
          label="Dibagikan ke saya"
          route={{ page: "shared" }}
          badge={shared.length}
        />
        <NavItem
          icon={Activity}
          label="Log Aktivitas"
          route={{ page: "activity" }}
        />
        <NavItem
          icon={Trash}
          label="Sampah"
          route={{ page: "trash" }}
          badge={trash.length}
        />
        {perms.canSystem("users.view") && (
          <NavItem
            icon={Users}
            label="Pengguna & Peran"
            route={{ page: "users" }}
          />
        )}
      </nav>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-6 pb-1.5">
          <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Workspace
          </span>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {workspaces.length}
          </span>
        </div>
        <div
          data-vt-clip
          className="min-h-0 flex-1 overflow-y-auto px-3 pb-2 [scrollbar-thin]"
        >
          {onHome ? (
            <div className="mx-1 rounded-xl border border-dashed border-sidebar-border p-4 text-center animate-in fade-in-0">
              <LayoutGrid className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Pilih salah satu workspace — strukturnya akan pindah ke sini
                sebagai navigasi folder.
              </p>
            </div>
          ) : (
            <FolderTree enableTransitions={enableTransitions} />
          )}
        </div>
      </div>

      <div className="mx-3 mb-1 rounded-xl px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <HardDrive className="size-3.5" />
          <span>Penyimpanan</span>
        </div>
        <Progress value={(used / QUOTA) * 100} className="mt-2 h-1.5" />
        <p className="mt-1.5 text-xs text-muted-foreground">
          {formatBytes(used)} dari {formatBytes(QUOTA)} digunakan
        </p>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col pt-2 pb-3 lg:flex">
      <SidebarContent enableTransitions />
    </aside>
  );
}
