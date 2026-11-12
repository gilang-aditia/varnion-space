import { useState, type ReactNode } from "react";
import { Loader2, RotateCw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaginationMeta } from "@/types/api";
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
 * Tabel list berpaginasi (presentational): kotak pencarian ber-debounce, filter
 * tambahan, status kosong/error, dan pagination dari `meta` backend.
 * State (page, limit, search, filter) ada di slice modul masing-masing.
 */
export function PagedTable<T>({
  items,
  meta,
  loading,
  error,
  search,
  onSearch,
  onPageChange,
  onLimitChange,
  onRetry,
  searchPlaceholder,
  emptyText,
  filtered = false,
  filters,
  onResetFilters,
  head,
  renderRow,
  colSpan,
}: {
  items: T[];
  meta: PaginationMeta | null;
  loading: boolean;
  error: string | null;
  /** Nilai search di store (dipakai sebagai nilai awal input). */
  search: string;
  /** Dipanggil setelah user berhenti mengetik (`SEARCH_DEBOUNCE_MS`). */
  onSearch: (value: string) => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onRetry: () => void;
  searchPlaceholder: string;
  emptyText: string;
  /** true → ada filter selain search yang aktif (untuk teks "tidak ada hasil"). */
  filtered?: boolean;
  /** Kontrol filter di samping kotak pencarian (mis. Select status/peran). */
  filters?: ReactNode;
  /**
   * Reset search + filter di store. Bila diisi, tombol "Reset filter" tampil
   * selama ada pencarian atau filter yang aktif.
   */
  onResetFilters?: () => void;
  head: ReactNode;
  renderRow: (item: T) => ReactNode;
  colSpan: number;
}) {
  const [input, setInput] = useState(search);
  const debouncedSearch = useDebouncedCallback((value: string) => onSearch(value.trim()), SEARCH_DEBOUNCE_MS);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox
          value={input}
          onChange={(v) => {
            setInput(v);
            debouncedSearch(v);
          }}
          placeholder={searchPlaceholder}
          loading={loading}
        />
        {filters}
        {onResetFilters && (input !== "" || search !== "" || filtered) && (
          <Button
            variant="ghost"
            className="gap-1.5 text-muted-foreground"
            onClick={() => {
              setInput("");
              debouncedSearch.cancel(); // ketikan yang belum terkirim ikut dibatalkan
              onResetFilters();
            }}
          >
            <X /> Reset filter
          </Button>
        )}
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-180 text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">{head}</thead>
            <tbody className={cn("transition-opacity", loading && items.length > 0 && "opacity-60")}>
              {error && !loading ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-10 text-center text-sm">
                    <p className="text-destructive">{error}</p>
                    <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={onRetry}>
                      <RotateCw /> Coba lagi
                    </Button>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {loading || !meta ? (
                      <Loader2 className="mx-auto size-5 animate-spin" aria-label="Memuat" />
                    ) : search ? (
                      <>Tidak ada hasil untuk “{search}”.</>
                    ) : filtered ? (
                      "Tidak ada data yang cocok dengan filter."
                    ) : (
                      emptyText
                    )}
                  </td>
                </tr>
              ) : (
                items.map(renderRow)
              )}
            </tbody>
          </table>
        </div>
        {meta && (
          <Pagination meta={meta} disabled={loading} onPageChange={onPageChange} onPerPageChange={onLimitChange} />
        )}
      </div>
    </div>
  );
}
