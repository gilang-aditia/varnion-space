import { useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Download,
  FileClock,
  FilePen,
  FolderInput,
  GitCommitVertical,
  LoaderCircle,
  Lock,
  PencilLine,
  Share2,
  UserCog,
  Trash,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FILE_TYPE_META } from "@/lib/file-types";
import { formatBytes, formatDateTime, formatWhen } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getPath, selectLogs } from "@/store/selectors";
import { uiActions, type PreviewTab } from "@/store/slices/uiSlice";
import { downloadNode, recordOpen, restoreVersion } from "@/store/thunks";
import { useNow } from "@/hooks/use-drive";
import { nodePermissions } from "@/lib/rbac";
import { isShareLinkActive } from "@/lib/share-link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NodeIcon } from "@/components/common/node-icon";
import { UserAvatar } from "@/components/common/user-avatar";
import { AccessBadge } from "@/components/common/role-badge";
import { FileThumb } from "@/components/drive/node-views";
import { GroupedLogs } from "@/components/drive/details-panel";
import {
  SizeDelta,
  VersionBadge,
  VersionHash,
  VersionHistory,
} from "@/components/drive/version-history";
import { useUpload } from "@/components/drive/upload-context";

function GatedButton({
  allowed,
  label,
  icon: Icon,
  onClick,
  variant = "outline",
}: {
  allowed: boolean;
  label: string;
  icon: typeof Download;
  onClick: () => void;
  variant?: "outline" | "default" | "destructive";
}) {
  const btn = (
    <Button
      variant={variant}
      size="sm"
      disabled={!allowed}
      onClick={onClick}
      className="gap-1.5"
    >
      {allowed ? <Icon /> : <Lock />}
      {label}
    </Button>
  );
  if (allowed) return btn;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>{btn}</span>
      </TooltipTrigger>
      <TooltipContent>Peran Anda tidak mengizinkan aksi ini</TooltipContent>
    </Tooltip>
  );
}

/** Pratinjau file + riwayat versi (ala GitLab) + riwayat aktivitas. */
export function PreviewDialog({
  id,
  initialTab = "versions",
  initialVersion,
}: {
  id: string;
  initialTab?: PreviewTab;
  initialVersion?: number;
}) {
  const dispatch = useAppDispatch();
  const now = useNow();
  const node = useAppSelector((s) => s.drive.nodes[id]);
  const nodes = useAppSelector((s) => s.drive.nodes);
  const users = useAppSelector((s) => s.users.byId);
  const logs = useAppSelector(selectLogs);
  const access = nodePermissions(node); // izin efektif pada file ini (ACL)
  const upload = useUpload();

  const [tab, setTab] = useState<PreviewTab>(initialTab);
  /** undefined = versi terbaru */
  const [viewing, setViewing] = useState<number | undefined>(initialVersion);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const versions = useMemo(() => node?.versions ?? [], [node]);
  const fileLogs = useMemo(
    () => logs.filter((l) => l.targetId === id).slice(0, 40),
    [logs, id],
  );
  const close = () => dispatch(uiActions.closeDialog());
  const latest = versions.at(-1);
  if (!node || !latest) return null;

  const active = versions.find((v) => v.version === viewing) ?? latest;
  const isOld = active.version !== latest.version;
  const prev = versions.find((v) => v.version === active.version - 1);
  const author = users[active.createdBy];
  const path = getPath(nodes, id).slice(0, -1);
  const meta = FILE_TYPE_META[node.fileType ?? "other"];

  const selectVersion = (v: number) => {
    setConfirmRestore(false);
    if (v === latest.version) return setViewing(undefined);
    setViewing(v);
    dispatch(recordOpen(id, v));
  };

  const doRestore = async () => {
    setRestoring(true);
    try {
      await dispatch(restoreVersion({ id, version: active.version })).unwrap();
      setViewing(undefined);
      setConfirmRestore(false);
    } catch {
      /* pesan error sudah tampil sebagai toast */
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-5xl">
        {/* ------------------------------ Header ------------------------------ */}
        <div className="flex items-center gap-3 border-b px-4 py-3 pr-12">
          <NodeIcon node={node} size="sm" />
          <div className="min-w-0 flex-1">
            <DialogTitle className="flex items-center gap-2 text-sm">
              <span className="truncate">{node.name}</span>
              <VersionBadge version={active.version} latest={!isOld} />
            </DialogTitle>
            <DialogDescription className="truncate text-xs">
              {path.map((p) => p.name).join(" › ")}
            </DialogDescription>
          </div>
          <AccessBadge permissions={access} className="hidden sm:inline-flex" />
        </div>

        <div className="grid min-h-0 md:grid-cols-[1fr_360px]">
          {/* ------------------------------ Pratinjau ------------------------------ */}
          <div className="flex max-h-[calc(92vh-57px)] flex-col gap-4 overflow-y-auto bg-muted/30 p-5">
            {isOld && (
              <div className="flex flex-wrap items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                <FileClock className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    Anda melihat versi {active.version} — bukan versi terbaru (v
                    {latest.version})
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Dibanding versi terbaru:{" "}
                    <SizeDelta delta={active.size - latest.size} /> ·{" "}
                    {latest.version - active.version} versi lebih lama
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 bg-background"
                  onClick={() => selectVersion(latest.version)}
                >
                  <ArrowLeft />
                  Ke versi terbaru
                </Button>
              </div>
            )}

            <div className="relative">
              <FileThumb
                node={node}
                className={cn(
                  "aspect-16/10 w-full rounded-xl transition",
                  isOld && "opacity-80 saturate-50",
                )}
              />
              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                <VersionBadge
                  version={active.version}
                  latest={!isOld}
                  className="h-6 px-2 text-xs shadow-sm"
                />
                {!isOld && (
                  <span className="rounded-md bg-background/90 px-2 py-0.5 text-xs font-medium shadow-sm">
                    Terbaru
                  </span>
                )}
              </div>
            </div>

            {/* Kartu "commit" versi yang sedang dilihat */}
            <div className="rounded-xl border bg-background p-3.5">
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <GitCommitVertical className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{active.note}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                    <UserAvatar user={author} size="xs" />
                    <span className="font-medium text-foreground/80">
                      {author?.name ?? "—"}
                    </span>
                    <span title={formatDateTime(active.createdAt)}>
                      {active.restoredFrom
                        ? "memulihkan"
                        : active.version === 1
                          ? "mengunggah"
                          : "memperbarui"}{" "}
                      {formatWhen(active.createdAt, now)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t pt-3 text-xs text-muted-foreground">
                <VersionHash id={active.id} />
                <span>{formatBytes(active.size)}</span>
                {prev && (
                  <span>
                    <SizeDelta delta={active.size - prev.size} /> dari v
                    {prev.version}
                  </span>
                )}
                {active.restoredFrom && (
                  <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                    <Undo2 className="size-3" /> salinan dari v
                    {active.restoredFrom}
                  </span>
                )}
              </div>
            </div>

            {/* Aksi */}
            {isOld ? (
              confirmRestore ? (
                <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-dashed bg-background p-3 text-sm">
                  <span>
                    Pulihkan v{active.version} sebagai{" "}
                    <span className="font-semibold">
                      versi {latest.version + 1}
                    </span>
                    ?
                    <span className="block text-xs text-muted-foreground">
                      Riwayat versi tidak dihapus.
                    </span>
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmRestore(false)}
                    >
                      Batal
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={doRestore}
                      disabled={restoring}
                    >
                      {restoring ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <Undo2 />
                      )}
                      Ya, pulihkan
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap justify-center gap-2">
                  <GatedButton
                    allowed={access.canDownload}
                    label={`Unduh v${active.version}`}
                    icon={Download}
                    onClick={() =>
                      void dispatch(
                        downloadNode({ id, version: active.version }),
                      )
                    }
                  />
                  <GatedButton
                    allowed={access.canEdit}
                    label="Pulihkan versi ini"
                    icon={Undo2}
                    variant="default"
                    onClick={() => setConfirmRestore(true)}
                  />
                </div>
              )
            ) : (
              <div className="flex flex-wrap justify-center gap-2">
                <GatedButton
                  allowed={access.canDownload}
                  label="Unduh"
                  icon={Download}
                  variant="default"
                  onClick={() => void dispatch(downloadNode({ id }))}
                />
                <GatedButton
                  allowed={access.canShare || isShareLinkActive(node.shareLink)}
                  label="Bagikan"
                  icon={Share2}
                  onClick={() =>
                    dispatch(uiActions.openDialog({ type: "share", id }))
                  }
                />
                <GatedButton
                  allowed
                  label={access.canShare ? "Kelola akses" : "Lihat akses"}
                  icon={UserCog}
                  onClick={() =>
                    dispatch(uiActions.openDialog({ type: "access", id }))
                  }
                />
                <GatedButton
                  allowed={access.canEdit}
                  label="Unggah versi baru"
                  icon={FilePen}
                  onClick={() => upload.pickVersion(id)}
                />
                <GatedButton
                  allowed={access.canEdit}
                  label="Ganti nama"
                  icon={PencilLine}
                  onClick={() =>
                    dispatch(uiActions.openDialog({ type: "rename", id }))
                  }
                />
                <GatedButton
                  allowed={access.canEdit}
                  label="Pindahkan"
                  icon={FolderInput}
                  onClick={() =>
                    dispatch(uiActions.openDialog({ type: "move", id }))
                  }
                />
                <GatedButton
                  allowed={access.canDelete}
                  label="Hapus"
                  icon={Trash}
                  variant="destructive"
                  onClick={() =>
                    dispatch(uiActions.openDialog({ type: "delete", id }))
                  }
                />
              </div>
            )}
            <p className="text-center text-xs text-muted-foreground">
              Pratinjau {meta.label.toLowerCase()} akan ditampilkan di sini
              setelah terhubung ke layanan storage.
            </p>
          </div>

          {/* ------------------------------ Panel kanan ------------------------------ */}
          <aside className="flex max-h-[calc(92vh-57px)] min-h-0 flex-col border-t md:border-t-0 md:border-l">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 border-b p-4 text-xs">
              <div>
                <dt className="text-muted-foreground">Jenis</dt>
                <dd className="font-medium">{meta.label}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Ukuran saat ini</dt>
                <dd className="font-medium">{formatBytes(latest.size)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Versi</dt>
                <dd className="font-medium">
                  v{latest.version} · {versions.length} versi
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Pemilik</dt>
                <dd className="truncate font-medium">
                  {users[node.createdBy]?.name ?? "—"}
                </dd>
              </div>
            </dl>
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as PreviewTab)}
              className="min-h-0 flex-1 gap-0"
            >
              <TabsList className="mx-4 mt-3 w-[calc(100%-2rem)]">
                <TabsTrigger value="versions">
                  <GitCommitVertical /> Versi ({versions.length})
                </TabsTrigger>
                <TabsTrigger value="activity">
                  <Activity /> Aktivitas
                </TabsTrigger>
              </TabsList>
              <TabsContent
                value="versions"
                className="min-h-0 overflow-y-auto px-4 py-3"
              >
                <VersionHistory
                  versions={versions}
                  selected={active.version}
                  onSelect={selectVersion}
                  now={now}
                />
              </TabsContent>
              <TabsContent
                value="activity"
                className="min-h-0 overflow-y-auto bg-background px-4 py-3"
              >
                {fileLogs.length ? (
                  <GroupedLogs logs={fileLogs} now={now} />
                ) : (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Belum ada aktivitas.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
