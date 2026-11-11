import { useEffect, useMemo, useState } from "react";
import { Check, KeyRound, Loader2, Minus, ShieldCheck } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchPermissionCatalog,
  fetchPermissions,
  fetchRoles,
  selectPermissionCatalog,
  selectPermissionsList,
  selectRolesList,
} from "@/store/rbac";
import { useTokenClaims } from "@/hooks/use-token-permissions";
import type { RbacPermissionDto, RbacRoleDto } from "@/types/rbac";
import { Badge } from "@/components/ui/badge";
import { PagedTable } from "@/components/common/paged-table";

function PermissionChip({ permission }: { permission: RbacPermissionDto }) {
  return (
    <span
      title={`${permission.name} — ${permission.description}`}
      className="inline-flex items-center rounded-md border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px]"
    >
      {permission.code}
    </span>
  );
}

/* ---------------------------------- Peran ---------------------------------- */

/** Jumlah izin yang langsung tampil sebelum "+N lainnya". */
const CHIP_LIMIT = 6;

function RolePermissions({ permissions }: { permissions: RbacPermissionDto[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!permissions.length) return <span className="text-xs text-muted-foreground">Tidak ada izin</span>;
  const shown = expanded ? permissions : permissions.slice(0, CHIP_LIMIT);
  const rest = permissions.length - CHIP_LIMIT;
  return (
    <div className="flex max-w-xl flex-wrap items-center gap-1">
      {shown.map((p) => (
        <PermissionChip key={p.id} permission={p} />
      ))}
      {rest > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-primary hover:underline"
        >
          {expanded ? "Sembunyikan" : `+${rest} lainnya`}
        </button>
      )}
    </div>
  );
}

export function RolesTab() {
  const dispatch = useAppDispatch();
  const list = useAppSelector(selectRolesList);

  useEffect(() => {
    void dispatch(fetchRoles());
  }, [dispatch]);

  return (
    <PagedTable<RbacRoleDto>
      list={list}
      load={(q) => void dispatch(fetchRoles(q))}
      searchPlaceholder="Cari nama atau deskripsi peran…"
      emptyText="Belum ada peran."
      colSpan={4}
      head={
        <tr>
          <th className="h-10 px-4 font-medium">Peran</th>
          <th className="h-10 px-3 font-medium">Deskripsi</th>
          <th className="h-10 px-3 font-medium">Izin</th>
          <th className="h-10 px-3 font-medium">Dibuat</th>
        </tr>
      }
      renderRow={(role) => (
        <tr key={role.id} className="border-b align-top last:border-0">
          <td className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium">{role.name}</span>
              {role.isSystem && <Badge variant="secondary">Sistem</Badge>}
            </div>
            <p className="font-mono text-xs text-muted-foreground">{role.code}</p>
          </td>
          <td className="px-3 py-3 text-xs text-muted-foreground">{role.description || "—"}</td>
          <td className="px-3 py-3">
            <p className="mb-1.5 text-xs text-muted-foreground">{role.permissions.length} izin</p>
            <RolePermissions permissions={role.permissions} />
          </td>
          <td className="px-3 py-3 text-xs whitespace-nowrap text-muted-foreground">
            {formatDateTime(role.createdAt)}
          </td>
        </tr>
      )}
    />
  );
}

/* ---------------------------------- Izin ----------------------------------- */

export function PermissionsTab() {
  const dispatch = useAppDispatch();
  const list = useAppSelector(selectPermissionsList);

  useEffect(() => {
    void dispatch(fetchPermissions());
  }, [dispatch]);

  return (
    <PagedTable<RbacPermissionDto>
      list={list}
      load={(q) => void dispatch(fetchPermissions(q))}
      searchPlaceholder="Cari action atau resource izin…"
      emptyText="Belum ada izin."
      colSpan={5}
      head={
        <tr>
          <th className="h-10 px-4 font-medium">Kode</th>
          <th className="h-10 px-3 font-medium">Nama</th>
          <th className="h-10 px-3 font-medium">Resource</th>
          <th className="h-10 px-3 font-medium">Action</th>
          <th className="h-10 px-3 font-medium">Dibuat</th>
        </tr>
      }
      renderRow={(p) => (
        <tr key={p.id} className="border-b last:border-0">
          <td className="px-4 py-3">
            <span className="font-mono text-xs">{p.code}</span>
          </td>
          <td className="px-3 py-3">
            <p className="text-sm">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.description}</p>
          </td>
          <td className="px-3 py-3">
            <Badge variant="outline">{p.resource}</Badge>
          </td>
          <td className="px-3 py-3 font-mono text-xs">{p.action}</td>
          <td className="px-3 py-3 text-xs whitespace-nowrap text-muted-foreground">
            {formatDateTime(p.createdAt)}
          </td>
        </tr>
      )}
    />
  );
}

/* ----------------------------- Matriks hak akses ---------------------------- */

/** `file.version.view` → `["file", "version.view"]` (sama seperti kode di JWT). */
function splitCode(code: string): [resource: string, action: string] {
  const i = code.indexOf(".");
  return i < 0 ? [code, ""] : [code.slice(0, i), code.slice(i + 1)];
}

/**
 * Matriks resource × action. Centang diambil dari `permissions` di access token (JWT);
 * daftar baris/kolom dari katalog `GET /rbac/permissions` (+ kode di JWT yang tidak ada di katalog).
 */
export function TokenPermissionMatrix() {
  const dispatch = useAppDispatch();
  const catalog = useAppSelector(selectPermissionCatalog);
  const { roles, permissions } = useTokenClaims();

  useEffect(() => {
    void dispatch(fetchPermissionCatalog());
  }, [dispatch]);

  const { resources, actions, known, byCode } = useMemo(() => {
    const codes = [...catalog.items.map((p) => p.code), ...permissions];
    const resources: string[] = [];
    const actions: string[] = [];
    for (const code of codes) {
      const [r, a] = splitCode(code);
      if (!resources.includes(r)) resources.push(r);
      if (!actions.includes(a)) actions.push(a);
    }
    return {
      resources,
      actions,
      known: new Set(codes),
      byCode: new Map(catalog.items.map((p) => [p.code, p])),
    };
  }, [catalog.items, permissions]);

  const granted = new Set<string>(permissions);
  const loadingCatalog = catalog.status === "loading" || catalog.status === "idle";

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <ShieldCheck className="size-4" /> Hak akses Anda
          </h3>
          <p className="text-xs text-muted-foreground">
            Diambil dari klaim <span className="font-mono">permissions</span> pada access token (JWT) sesi ini.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <KeyRound className="size-3.5" />
          Peran:
          {roles.length ? (
            roles.map((r) => (
              <Badge key={r} variant="secondary" className="font-mono">
                {r}
              </Badge>
            ))
          ) : (
            <span>—</span>
          )}
          <span aria-hidden>·</span>
          <span>
            {permissions.length}
            {catalog.items.length ? ` dari ${catalog.items.length}` : ""} izin
          </span>
        </div>
      </div>

      {catalog.status === "failed" && (
        <p className="border-b bg-destructive/5 px-4 py-2 text-xs text-destructive">
          Katalog izin gagal dimuat ({catalog.error?.message}) — matriks hanya menampilkan izin dari token.{" "}
          <button type="button" className="font-medium underline" onClick={() => void dispatch(fetchPermissionCatalog())}>
            Coba lagi
          </button>
        </p>
      )}

      {resources.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          {loadingCatalog ? (
            <Loader2 className="mx-auto size-5 animate-spin" aria-label="Memuat" />
          ) : (
            "Token tidak berisi izin apa pun."
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-xs">
              <tr>
                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Resource</th>
                {actions.map((a) => (
                  <th key={a} className="h-10 px-3 text-center font-mono font-medium whitespace-nowrap">
                    {a || "—"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs font-medium">{r}</td>
                  {actions.map((a) => {
                    const code = a ? `${r}.${a}` : r;
                    if (!known.has(code)) return <td key={a} className="px-3 py-2.5" />;
                    const on = granted.has(code);
                    const info = byCode.get(code);
                    return (
                      <td
                        key={a}
                        className="px-3 py-2.5 text-center"
                        title={`${code}${info ? ` — ${info.name}` : ""}: ${on ? "dimiliki" : "tidak dimiliki"}`}
                      >
                        {on ? (
                          <Check className="mx-auto size-4 text-emerald-600 dark:text-emerald-400" aria-label="Diizinkan" />
                        ) : (
                          <Minus className="mx-auto size-4 text-muted-foreground/40" aria-label="Tidak diizinkan" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
