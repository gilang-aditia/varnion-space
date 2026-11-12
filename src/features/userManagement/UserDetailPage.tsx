import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArchiveRestore,
  ArrowLeft,
  Check,
  Copy,
  KeyRound,
  Loader2,
  Pencil,
  RotateCw,
  Shield,
  ShieldX,
  Trash2,
  UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { mapUser } from "@/lib/user-mapper";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { navigate } from "@/store/thunks";
import { useCurrentUser, usePermissions } from "@/hooks/use-drive";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { DeletedStamp } from "@/components/common/deleted-stamp";
import { UserAvatar } from "@/components/common/user-avatar";
import { StatusBadge } from "./components/UsersTab";
import { EditUserDialog } from "./components/EditUserDialog";
import { DeleteUserDialog } from "./components/DeleteUserDialog";
import { restoreUser } from "./redux/restoreUserAction";
import { fetchUserDetail } from "./redux/userDetailAction";
import { resetUserDetailState } from "./redux/userDetailSlice";
import type { UserDetail } from "./redux/userDetailType";

/** Label grup izin berdasarkan prefix kode (`file.upload` → `file`). */
const PERMISSION_GROUP_LABEL: Record<string, string> = {
  workspace: "Workspace",
  folder: "Folder",
  file: "File",
  members: "Anggota",
  roles: "Peran",
  storage: "Penyimpanan",
  audit: "Audit",
};

function groupPermissions(permissions: string[]) {
  const groups = new Map<string, string[]>();
  for (const code of [...permissions].sort()) {
    const prefix = code.split(".")[0] || code;
    groups.set(prefix, [...(groups.get(prefix) ?? []), code]);
  }
  return [...groups.entries()].map(([prefix, codes]) => ({
    prefix,
    label: PERMISSION_GROUP_LABEL[prefix] ?? prefix,
    codes,
  }));
}

function Section({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: typeof Shield;
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card">
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <Icon className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          ({count})
        </span>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function InfoItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm">{children}</dd>
    </div>
  );
}

function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="flex items-center gap-1">
      <span className="truncate font-mono text-xs" title={id}>
        {id}
      </span>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(id).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Salin ID pengguna"
      >
        {copied ? (
          <Check className="size-3.5 text-emerald-600" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
    </span>
  );
}

function DetailSkeleton() {
  return (
    <div
      className="space-y-4 animate-pulse"
      aria-busy="true"
      aria-label="Memuat detail pengguna"
    >
      <div className="flex items-center gap-4 rounded-xl border p-5">
        <div className="size-14 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-48 rounded bg-muted" />
          <div className="h-3 w-64 rounded bg-muted" />
        </div>
      </div>
      <div className="h-40 rounded-xl border bg-muted/30" />
      <div className="h-56 rounded-xl border bg-muted/30" />
    </div>
  );
}

/** Pola garis diagonal tipis untuk kartu user yang terhapus. */
const DELETED_STRIPES = {
  backgroundImage:
    "repeating-linear-gradient(135deg, transparent 0 12px, color-mix(in oklab, var(--color-destructive) 6%, transparent) 12px 14px)",
};

function UserDetailContent({
  user,
  deleted,
}: {
  user: UserDetail;
  deleted: boolean;
}) {
  const me = useCurrentUser();
  /** Konten "mati": abu-abu, tidak bisa diklik/diseleksi. */
  const disabledCls =
    deleted && "pointer-events-none select-none opacity-60 grayscale";
  const roles = user.roles ?? [];
  const permissions = useMemo(
    () => groupPermissions(user.permissions ?? []),
    [user.permissions],
  );
  const permissionCount = user.permissions?.length ?? 0;

  return (
    <div className="space-y-4" aria-disabled={deleted || undefined}>
      {/* Profil */}
      <section
        className={cn(
          "relative overflow-hidden rounded-xl border bg-card p-5",
          deleted && "border-destructive/30",
        )}
        style={deleted ? DELETED_STRIPES : undefined}
      >
        {deleted && <DeletedStamp deletedAt={user.deleted_at} />}
        <div
          className={cn(
            "flex flex-wrap items-center gap-4",
            deleted && "opacity-70 grayscale",
          )}
        >
          <UserAvatar user={mapUser(user)} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className={cn(
                  "truncate text-xl font-semibold tracking-tight",
                  deleted &&
                    "text-muted-foreground line-through decoration-destructive/60 decoration-2",
                )}
              >
                {user.display_name}
                {user.id === me?.id && (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    (Anda)
                  </span>
                )}
              </h1>
              <StatusBadge status={user.status} deleted={deleted} />
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>
        <dl
          className={cn(
            "mt-5 grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4",
            deleted && "opacity-70",
          )}
        >
          <InfoItem label="ID pengguna">
            <CopyId id={user.id} />
          </InfoItem>
          <InfoItem label="Terdaftar">
            {formatDateTime(user.created_at)}
          </InfoItem>
          <InfoItem label="Jumlah peran">{roles.length}</InfoItem>
          <InfoItem label="Jumlah izin">{permissionCount}</InfoItem>
        </dl>
      </section>

      {/* Peran workspace */}
      <div className={cn("space-y-4 transition", disabledCls)}>
        <Section icon={Shield} title="Peran workspace" count={roles.length}>
          {roles.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {roles.map((r) => (
                <li key={r.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{r.name}</span>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                      {r.code}
                    </span>
                    {r.is_system && <Badge variant="secondary">Sistem</Badge>}
                  </div>
                  {r.description && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Pengguna ini belum memiliki peran di workspace.
            </p>
          )}
        </Section>

        {/* Izin */}
        <Section icon={KeyRound} title="Izin" count={permissionCount}>
          {permissions.length ? (
            <div className="space-y-4">
              {permissions.map((g) => (
                <div key={g.prefix}>
                  <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">
                    {g.label}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {g.codes.map((code) => (
                      <span
                        key={code}
                        className="inline-flex items-center rounded-md border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px]"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Belum ada izin — tetapkan peran untuk memberi akses.
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}

/** Halaman detail pengguna (`#/users/<id>`) → GET /users/{id}. */
export function UserDetailPage({ userId }: { userId: string }) {
  const dispatch = useAppDispatch();
  const perms = usePermissions();
  const canView = perms.canSystem("users.view");
  const canManage = perms.canSystem("users.manage");
  const me = useCurrentUser();
  const [editing, setEditing] = useState(false);
  /** `soft` → dialog dengan dua pilihan; `hard` → langsung hapus permanen (user sudah di-soft delete). */
  const [deleting, setDeleting] = useState<"soft" | "hard" | null>(null);
  const { user, loading, error } = useAppSelector((state) => state.userDetail);
  const restoring = useAppSelector((state) => state.restoreUser.loading);
  const current = user?.id === userId ? user : null;
  // dibuka dari daftar Terhapus → terhapus walau backend tidak mengirim `deleted_at`
  const inTrash = useAppSelector(
    (state) =>
      state.userList.deleted &&
      state.userList.users.some((u) => u.id === userId),
  );
  const isDeleted = !!current && (!!current.deleted_at || inTrash);
  const isSelf = current?.id === me?.id;

  useEffect(() => {
    if (!canView) return;
    void dispatch(fetchUserDetail({ id: userId }));
  }, [dispatch, userId, canView]);

  // keluar dari halaman → jangan simpan detail user di store
  useEffect(
    () => () => {
      dispatch(resetUserDetailState());
    },
    [dispatch],
  );

  const back = () => dispatch(navigate({ page: "users" }));

  let body: ReactNode;
  if (!canView) {
    body = (
      <EmptyState
        icon={ShieldX}
        title="Akses ditolak"
        description="Halaman ini hanya untuk Administrator dan Auditor."
      />
    );
  } else if (current) {
    body = <UserDetailContent user={current} deleted={isDeleted} />;
  } else if (error && !loading) {
    body = (
      <EmptyState
        icon={UserX}
        title={error}
        description="Pengguna mungkin sudah dihapus atau Anda tidak memiliki akses."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={back}>
              Kembali
            </Button>
            <Button
              className="gap-1.5"
              onClick={() => void dispatch(fetchUserDetail({ id: userId }))}
            >
              <RotateCw className="size-4" /> Coba lagi
            </Button>
          </div>
        }
      />
    );
  } else {
    body = <DetailSkeleton />;
  }

  return (
    <div className="mx-auto w-full max-w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 gap-1.5 text-muted-foreground"
          onClick={back}
        >
          <ArrowLeft className="size-4" />
          Pengguna & Peran
        </Button>
        {current && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              disabled={loading}
              onClick={() => void dispatch(fetchUserDetail({ id: userId }))}
              aria-label="Muat ulang detail pengguna"
            >
              <RotateCw className={cn("size-4", loading && "animate-spin")} />
              Muat ulang
            </Button>
            {canManage && !isDeleted && !isSelf && (
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5"
                onClick={() => setDeleting("soft")}
              >
                <Trash2 className="size-4" />
                Hapus
              </Button>
            )}
            {canManage && !isDeleted && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-4" />
                Edit
              </Button>
            )}
          </div>
        )}
      </div>
      {isDeleted && (
        <div
          role="status"
          className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
        >
          <Trash2 className="size-5 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Pengguna ini telah dihapus</p>
            <p className="text-xs text-muted-foreground">
              Akun tidak dapat digunakan untuk masuk. Pulihkan untuk
              mengaktifkannya kembali.
            </p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5"
                disabled={restoring}
                onClick={() => setDeleting("hard")}
              >
                <Trash2 className="size-4" />
                Hapus permanen
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                disabled={restoring}
                onClick={() =>
                  current && void dispatch(restoreUser({ id: current.id }))
                }
              >
                {restoring ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArchiveRestore className="size-4" />
                )}
                Pulihkan
              </Button>
            </div>
          )}
        </div>
      )}
      {body}
      {editing && current && (
        <EditUserDialog user={current} onClose={() => setEditing(false)} />
      )}
      {deleting && current && (
        <DeleteUserDialog
          user={current}
          onlyHard={deleting === "hard"}
          onClose={() => setDeleting(null)}
          // hapus permanen → user sudah tidak ada, kembali ke daftar
          onDeleted={(hard) => hard && back()}
        />
      )}
    </div>
  );
}
