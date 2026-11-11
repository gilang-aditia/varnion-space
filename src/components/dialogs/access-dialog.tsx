import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { shareLinkSummary } from "@/lib/share-link";
import {
  ACCESS_ROLES,
  accessLabel,
  accessRoleById,
  describePermissions,
  getWorkspaceRole,
  matchAccessRole,
  NO_ACCESS,
  NODE_PERMISSION_DESC,
  NODE_PERMISSION_LABEL,
  NODE_PERMISSIONS,
  nodePermissions,
  normalizePermissions,
  WORKSPACE_ROLE_LABEL,
  type NodePermission,
} from "@/lib/rbac";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useCurrentUser } from "@/hooks/use-drive";
import { getPath, selectUsers } from "@/store/selectors";
import { uiActions } from "@/store/slices/uiSlice";
import { refreshNodeAccess, updateNodeAccess } from "@/store/thunks";
import type {
  AccessEntry,
  DriveNode,
  NodePermissions,
  User,
} from "@/types/drive";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { NodeIcon } from "@/components/common/node-icon";
import { UserAvatar } from "@/components/common/user-avatar";
import { PersonPicker, type PickerOption } from "./person-picker";

const CUSTOM = "custom";
const NONE = "none";
/** Peran yang bisa dijadikan subjek aturan (Pengelola selalu punya akses penuh). */
const ROLE_SUBJECTS = ACCESS_ROLES.filter((r) => r.role !== "manager");

const keyOf = (e: AccessEntry) =>
  e.subjectType === "user"
    ? `user:${e.subjectUserId}`
    : `role:${e.subjectRoleId}`;
const presetValue = (p: NodePermissions) =>
  !p.canView ? NONE : (matchAccessRole(p)?.id ?? CUSTOM);
const presetPermissions = (value: string): NodePermissions =>
  value === NONE
    ? NO_ACCESS
    : (accessRoleById(value)?.permissions ?? NO_ACCESS);

/** Ubah satu izin dengan aturan: tanpa "Lihat" = tanpa akses; izin lain butuh "Lihat". */
function togglePermission(
  p: NodePermissions,
  key: NodePermission,
  on: boolean,
): NodePermissions {
  if (key === "canView" && !on) return NO_ACCESS;
  return normalizePermissions({ ...p, [key]: on, canView: p.canView || on });
}

function PresetSelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger size="sm" className="w-full" aria-label="Preset akses">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end" className="w-72">
        {ACCESS_ROLES.map((r) => (
          <SelectItem
            key={r.id}
            value={r.id}
            description={describePermissions(r.permissions)}
          >
            {r.label}
          </SelectItem>
        ))}
        <SelectItem value={NONE} description="Folder/file disembunyikan">
          Tanpa akses
        </SelectItem>
        {value === CUSTOM && (
          <SelectItem
            value={CUSTOM}
            disabled
            description="Diatur lewat centang di samping"
          >
            Kustom
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}

function SubjectLabel({
  entry,
  user,
  ws,
}: {
  entry: AccessEntry;
  user?: User;
  ws?: DriveNode;
}) {
  if (entry.subjectType === "role") {
    const label = accessRoleById(entry.subjectRoleId)?.label ?? "peran";
    return (
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">Semua {label}</p>
        <p className="truncate text-xs text-muted-foreground">
          Anggota dengan peran {label}
        </p>
      </div>
    );
  }
  const role = getWorkspaceRole(user, ws);
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <UserAvatar user={user} size="sm" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {user?.name ?? "Pengguna tidak dikenal"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {role
            ? `${WORKSPACE_ROLE_LABEL[role]} di workspace`
            : "Di luar workspace"}
        </p>
      </div>
    </div>
  );
}

const GRID =
  "grid grid-cols-[minmax(0,1fr)_8.5rem_repeat(5,3rem)_5rem] items-center gap-x-1";

/** Kelola akses folder/file: atur siapa yang boleh lihat, unduh, edit, hapus, bagikan. */
export function AccessDialog({ id }: { id: string }) {
  const dispatch = useAppDispatch();
  const node = useAppSelector((s) => s.drive.nodes[id]);
  const nodes = useAppSelector((s) => s.drive.nodes);
  const usersById = useAppSelector((s) => s.users.byId);
  const users = useAppSelector(selectUsers);
  const me = useCurrentUser();
  /** null = belum diedit → tampilkan data terbaru dari server. */
  const [edited, setEdited] = useState<AccessEntry[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [newPreset, setNewPreset] = useState<string>(ACCESS_ROLES[2].id);

  // ambil aturan terbaru dari server saat dialog dibuka
  useEffect(() => {
    void dispatch(refreshNodeAccess(id));
  }, [dispatch, id]);

  const close = () => dispatch(uiActions.closeDialog());
  if (!node) return null;

  const ws = nodes[node.workspaceId];
  const canManage = nodePermissions(node).canShare;
  const draft = edited ?? node.access ?? [];
  const dirty = edited !== null;
  const update = (next: AccessEntry[]) => setEdited(next);
  const setPermissions = (key: string, p: NodePermissions) =>
    update(
      draft.map((e) =>
        keyOf(e) === key
          ? {
              ...e,
              ...p,
              subjectRoleId:
                e.subjectType === "user"
                  ? (matchAccessRole(p)?.id ?? null)
                  : e.subjectRoleId,
            }
          : e,
      ),
    );

  // calon subjek: peran + SEMUA akun aktif (termasuk di luar workspace) yang belum punya aturan.
  // Administrator & Pengelola workspace selalu akses penuh → tidak perlu diberi aturan.
  const taken = new Set(draft.map(keyOf));
  const subjectOptions: PickerOption[] = [
    ...ROLE_SUBJECTS.filter((r) => !taken.has(`role:${r.id}`)).map((r) => ({
      value: `role:${r.id}`,
      label: `Semua ${r.label}`,
      description: `Semua anggota workspace berperan ${r.label}`,
      tag: "Peran",
      keywords: `semua ${r.label} peran`.toLowerCase(),
    })),
    ...users
      .filter((u) => {
        const role = getWorkspaceRole(u, ws);
        return (
          u.status === "active" &&
          u.id !== me?.id &&
          u.role !== "admin" &&
          role !== "manager" &&
          !taken.has(`user:${u.id}`)
        );
      })
      .map((u) => {
        const role = getWorkspaceRole(u, ws);
        return {
          value: `user:${u.id}`,
          label: u.name,
          description: u.email,
          tag: !ws
            ? undefined
            : role
              ? `Anggota · ${WORKSPACE_ROLE_LABEL[role]}`
              : "Di luar workspace",
          keywords: `${u.name} ${u.email} ${u.username}`.toLowerCase(),
        };
      }),
  ];

  const addEntry = (subject: string) => {
    const [type, subjectId] = subject.split(":") as ["user" | "role", string];
    const permissions = presetPermissions(newPreset);
    update([
      ...draft,
      {
        subjectType: type,
        subjectUserId: type === "user" ? subjectId : null,
        subjectRoleId:
          type === "role"
            ? subjectId
            : (matchAccessRole(permissions)?.id ?? null),
        ...permissions,
      },
    ]);
  };

  const save = async () => {
    setSaving(true);
    try {
      await dispatch(updateNodeAccess({ id, entries: draft })).unwrap();
      close();
    } catch {
      setSaving(false); // pesan error sudah tampil sebagai toast
    }
  };

  // aturan yang diwarisi dari folder induk (read-only)
  const inherited = getPath(nodes, id)
    .slice(1, -1)
    .reverse()
    .filter((n) => n.access?.length);
  const kind = node.kind === "folder" ? "folder" : "file";

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="gap-4 sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <NodeIcon node={node} size="md" />
            <div className="min-w-0">
              <DialogTitle className="truncate">
                {canManage ? "Kelola akses" : "Akses"} “{node.name}”
              </DialogTitle>
              <DialogDescription>
                {canManage
                  ? `Atur siapa yang boleh melihat, mengunduh, mengedit, menghapus, dan membagikan ${kind} ini${node.kind === "folder" ? " beserta isinya" : ""}.`
                  : "Anda dapat melihat aturan akses, tetapi tidak punya izin “Bagikan” untuk mengubahnya."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {canManage && (
          <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3 sm:flex-row sm:items-center">
            <PersonPicker
              options={subjectOptions}
              onPick={(o) => addEntry(o.value)}
              placeholder="Ketik nama, email, atau username untuk menambahkan…"
            />
            <div className="w-full shrink-0 sm:w-36">
              <PresetSelect value={newPreset} onChange={setNewPreset} />
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <div className="min-w-160">
            <div
              className={cn(
                GRID,
                "border-b px-1 pb-2 text-xs font-medium text-muted-foreground",
              )}
            >
              <span>Aturan khusus</span>
              <span>Preset</span>
              {NODE_PERMISSIONS.map((k) => (
                <Tooltip key={k}>
                  <TooltipTrigger asChild>
                    <span className="cursor-help text-center">
                      {NODE_PERMISSION_LABEL[k]}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{NODE_PERMISSION_DESC[k]}</TooltipContent>
                </Tooltip>
              ))}
              <span />
            </div>
            {draft.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                Belum ada aturan khusus — semua anggota mengikuti peran
                workspace. Ketik nama di atas untuk membagikan ke siapa saja,
                termasuk orang di luar workspace.
              </p>
            ) : (
              <ul className="max-h-72 divide-y overflow-y-auto">
                {draft.map((e) => {
                  const key = keyOf(e);
                  return (
                    <li key={key} className={cn(GRID, "px-1 py-2")}>
                      <SubjectLabel
                        entry={e}
                        user={
                          e.subjectUserId
                            ? usersById[e.subjectUserId]
                            : undefined
                        }
                        ws={ws}
                      />
                      <PresetSelect
                        value={presetValue(e)}
                        disabled={!canManage}
                        onChange={(v) =>
                          setPermissions(key, presetPermissions(v))
                        }
                      />
                      {NODE_PERMISSIONS.map((k) => (
                        <span key={k} className="flex justify-center">
                          <Checkbox
                            checked={e[k]}
                            disabled={!canManage}
                            onCheckedChange={(v) =>
                              setPermissions(
                                key,
                                togglePermission(e, k, v === true),
                              )
                            }
                            aria-label={`${NODE_PERMISSION_LABEL[k]} untuk ${key}`}
                          />
                        </span>
                      ))}
                      {canManage ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() =>
                            update(draft.filter((x) => keyOf(x) !== key))
                          }
                        >
                          Hapus
                        </Button>
                      ) : (
                        <span />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            {shareLinkSummary(node.shareLink)}
          </span>
          <Button
            variant="ghost"
            size="xs"
            onClick={() =>
              dispatch(uiActions.openDialog({ type: "share", id }))
            }
          >
            Atur link
          </Button>
        </div>

        {inherited.length > 0 && (
          <div className="rounded-lg bg-muted/40 p-3 text-xs">
            <p className="font-medium">Diwariskan dari folder induk</p>
            <p className="mt-0.5 text-muted-foreground">
              Berlaku untuk subjek yang tidak punya aturan khusus di sini. Ubah
              di folder asalnya.
            </p>
            <ul className="mt-2 space-y-1">
              {inherited.flatMap((folder) =>
                (folder.access ?? []).map((e) => (
                  <li
                    key={`${folder.id}-${keyOf(e)}`}
                    className="flex flex-wrap gap-x-1.5"
                  >
                    <span className="font-medium">
                      {e.subjectType === "user"
                        ? (usersById[e.subjectUserId ?? ""]?.name ?? "Pengguna")
                        : `Semua ${accessRoleById(e.subjectRoleId)?.label ?? "peran"}`}
                    </span>
                    <span className="text-muted-foreground">
                      → {accessLabel(e)} ({describePermissions(e)}) · dari{" "}
                      {folder.name}
                    </span>
                  </li>
                )),
              )}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Tanpa aturan khusus, anggota mengikuti peran workspace: Editor →{" "}
          {describePermissions(ACCESS_ROLES[1].permissions)} · Pelihat →{" "}
          {describePermissions(ACCESS_ROLES[2].permissions)}. Pengelola &
          Administrator selalu punya akses penuh.
        </p>

        <DialogFooter>
          {canManage ? (
            <>
              <Button variant="outline" onClick={close}>
                Batal
              </Button>
              <Button onClick={save} disabled={!dirty || saving}>
                {saving && <LoaderCircle className="animate-spin" />}
                Simpan perubahan
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={close}>
              Tutup
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
