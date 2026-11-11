import { useState, type ReactNode } from "react";
import { Loader2, RotateCw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PagedListState } from "@/store/paged";
import type { PageQuery } from "@/types/rbac";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/common/pagination";

/** Jeda debounce pencarian (ms). */
export const SEARCH_DEBOUNCE_MS = 400;

function SearchBox({
  value,
  onChange,
  placeholder,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  loading: boolean;
}) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-8 pl-8"
        aria-label={placeholder}
      />
      {loading && (
        <Loader2 className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}

/**
 * Kerangka list berpaginasi: pencarian (debounce), filter tambahan, tabel,
 * status kosong/error, dan pagination berbasis `meta` backend.
 * `load` dipanggil dengan bagian query yang berubah; sisanya memakai query terakhir di store.
 */
export function PagedTable<T, Q extends PageQuery = PageQuery>({
  list,
  load,
  searchPlaceholder,
  emptyText,
  head,
  renderRow,
  colSpan,
  filters,
  minWidthClass = "min-w-180",
}: {
  list: PagedListState<T, Q>;
  load: (q?: Partial<Q>) => void;
  searchPlaceholder: string;
  emptyText: string;
  head: ReactNode;
  renderRow: (item: T) => ReactNode;
  colSpan: number;
  /** Kontrol filter di samping kotak pencarian (mis. Select status/peran). */
  filters?: ReactNode;
  minWidthClass?: string;
}) {
  const [search, setSearch] = useState(list.query.search);
  const loading = list.status === "loading";
  const debouncedSearch = useDebouncedCallback(
    (value: string) => load({ search: value.trim(), page: 1 } as Partial<Q>),
    SEARCH_DEBOUNCE_MS,
  );
  const filtered = Object.values(list.query).some((v) => typeof v === "string" && v);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox
          value={search}
          onChange={(v) => {
            setSearch(v);
            debouncedSearch(v);
          }}
          placeholder={searchPlaceholder}
          loading={loading}
        />
        {filters}
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className={cn("w-full text-sm", minWidthClass)}>
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">{head}</thead>
            <tbody className={cn("transition-opacity", loading && list.items.length > 0 && "opacity-60")}>
              {list.status === "failed" ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-10 text-center text-sm">
                    <p className="text-destructive">{list.error?.message ?? "Gagal memuat data."}</p>
                    <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => load()}>
                      <RotateCw /> Coba lagi
                    </Button>
                  </td>
                </tr>
              ) : list.items.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {loading || list.status === "idle" ? (
                      <Loader2 className="mx-auto size-5 animate-spin" aria-label="Memuat" />
                    ) : list.query.search ? (
                      <>Tidak ada hasil untuk “{list.query.search}”.</>
                    ) : filtered ? (
                      "Tidak ada data yang cocok dengan filter."
                    ) : (
                      emptyText
                    )}
                  </td>
                </tr>
              ) : (
                list.items.map(renderRow)
              )}
            </tbody>
          </table>
        </div>
        {list.meta && (
          <Pagination
            meta={list.meta}
            disabled={loading}
            onPageChange={(page) => load({ page } as Partial<Q>)}
            onPerPageChange={(perPage) => load({ perPage, page: 1 } as Partial<Q>)}
          />
        )}
      </div>
    </div>
  );
}
