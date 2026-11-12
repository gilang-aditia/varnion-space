import { useEffect, useMemo } from "react";
import { Check, KeyRound, Loader2, Minus, ShieldCheck } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useTokenClaims } from "@/hooks/use-token-permissions";
import { Badge } from "@/components/ui/badge";
import { fetchAllPermissions } from "../redux/permissionAction";

/** `file.version.view` → `["file", "version.view"]` (sama seperti kode di JWT). */
function splitCode(code: string): [resource: string, action: string] {
  const i = code.indexOf(".");
  return i < 0 ? [code, ""] : [code.slice(0, i), code.slice(i + 1)];
}

/**
 * Matriks resource × action. Centang diambil dari `permissions` di access token (JWT);
 * daftar baris/kolom dari katalog `GET /rbac/permissions` (+ kode di JWT yang tidak ada di katalog).
 */
export function PermissionMatrixTab() {
  const dispatch = useAppDispatch();
  const { allPermissions, loadingAll, errorAll } = useAppSelector(
    (state) => state.permissions,
  );
  const { roles, permissions } = useTokenClaims();

  useEffect(() => {
    void dispatch(fetchAllPermissions());
  }, [dispatch]);

  const { resources, actions, known, byCode } = useMemo(() => {
    const codes = [...allPermissions.map((p) => p.code), ...permissions];
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
      byCode: new Map(allPermissions.map((p) => [p.code, p])),
    };
  }, [allPermissions, permissions]);

  const granted = new Set<string>(permissions);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <ShieldCheck className="size-4" /> Hak akses Anda
          </h3>
          <p className="text-xs text-muted-foreground">
            Diambil dari klaim <span className="font-mono">permissions</span>{" "}
            pada access token (JWT) sesi ini.
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
            {allPermissions.length ? ` dari ${allPermissions.length}` : ""} izin
          </span>
        </div>
      </div>

      {errorAll && (
        <p className="border-b bg-destructive/5 px-4 py-2 text-xs text-destructive">
          Katalog izin gagal dimuat ({errorAll}) — matriks hanya menampilkan
          izin dari token.{" "}
          <button
            type="button"
            className="font-medium underline"
            onClick={() => void dispatch(fetchAllPermissions())}
          >
            Coba lagi
          </button>
        </p>
      )}

      {resources.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          {loadingAll ? (
            <Loader2
              className="mx-auto size-5 animate-spin"
              aria-label="Memuat"
            />
          ) : (
            "Token tidak berisi izin apa pun."
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-xs">
              <tr>
                <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                  Resource
                </th>
                {actions.map((a) => (
                  <th
                    key={a}
                    className="h-10 px-3 text-center font-mono font-medium whitespace-nowrap"
                  >
                    {a || "—"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs font-medium">
                    {r}
                  </td>
                  {actions.map((a) => {
                    const code = a ? `${r}.${a}` : r;
                    if (!known.has(code))
                      return <td key={a} className="px-3 py-2.5" />;
                    const on = granted.has(code);
                    const info = byCode.get(code);
                    return (
                      <td
                        key={a}
                        className="px-3 py-2.5 text-center"
                        title={`${code}${info ? ` — ${info.name}` : ""}: ${on ? "dimiliki" : "tidak dimiliki"}`}
                      >
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
