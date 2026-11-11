import { useMemo, useState } from 'react'
import { ChevronRight, Download, FolderOpen, Globe, Link2Off, LoaderCircle } from 'lucide-react'
import { FILE_TYPE_META } from '@/lib/file-types'
import { formatBytes, formatDate, formatDateTime } from '@/lib/format'
import { usePublicShare } from '@/hooks/use-public-share'
import { useAppSelector } from '@/store/hooks'
import type { PublicNode, PublicShare } from '@/types/drive'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Logo } from '@/components/common/logo'
import { NodeIcon } from '@/components/common/node-icon'
import { EmptyState } from '@/components/common/empty-state'
import { FileThumb } from '@/components/drive/node-views'

const goTo = (hash: string) => {
  window.location.hash = hash
}
const shareHash = (key: string, nodeId?: string) =>
  `#/s/${encodeURIComponent(key)}${nodeId ? `/${encodeURIComponent(nodeId)}` : ''}`

/* -------------------------------------------------------------------------- */

function TopBar({ openTarget }: { openTarget?: string }) {
  const loggedIn = useAppSelector((s) => !!s.auth.session)
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 sm:px-6">
      <button onClick={() => goTo('#/')} aria-label="Varnion Space">
        <Logo />
      </button>
      {loggedIn ? (
        <Button variant="outline" onClick={() => goTo(openTarget ? `#/f/${encodeURIComponent(openTarget)}` : '#/')}>
          {openTarget ? 'Buka di Varnion Space' : 'Ke Varnion Space'}
        </Button>
      ) : (
        <Button onClick={() => goTo('#/')}>Masuk</Button>
      )}
    </header>
  )
}

function ShareBanner({ share }: { share: PublicShare }) {
  const kind = share.root.kind === 'folder' ? 'folder' : 'file'
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-emerald-500/5 p-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <Globe className="size-4" />
      </span>
      <div className="min-w-0 text-sm">
        <p>
          <span className="font-medium">{share.sharedBy}</span> membagikan {kind} ini lewat link publik.
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Siapa saja yang punya link dapat melihat{share.permissions.canDownload ? ' dan mengunduh' : ''} — tanpa
          login.{share.expiresAt ? ` Berlaku s/d ${formatDate(share.expiresAt)}.` : ''}
        </p>
      </div>
    </div>
  )
}

function FileDetails({
  file,
  canDownload,
  onDownload,
}: {
  file: PublicNode
  canDownload: boolean
  onDownload: () => void
}) {
  const meta = FILE_TYPE_META[file.fileType ?? 'other']
  return (
    <div className="grid gap-5 md:grid-cols-[1fr_280px]">
      <FileThumb node={file} className="aspect-16/10 w-full rounded-xl" />
      <div className="space-y-4">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Jenis</dt>
            <dd className="font-medium">{meta.label}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Ukuran</dt>
            <dd className="font-medium">{formatBytes(file.size)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Versi</dt>
            <dd className="font-medium">v{file.version ?? 1}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Diperbarui</dt>
            <dd className="font-medium">{formatDate(file.updatedAt)}</dd>
          </div>
        </dl>
        {canDownload ? (
          <Button className="w-full gap-1.5" onClick={onDownload}>
            <Download className="size-4" />
            Unduh
          </Button>
        ) : (
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            Pemilik tidak mengizinkan unduhan lewat link ini.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Pratinjau {meta.label.toLowerCase()} akan tampil di sini setelah terhubung ke layanan storage.
        </p>
      </div>
    </div>
  )
}

function FolderBrowser({
  share,
  folderId,
  onDownload,
}: {
  share: PublicShare
  folderId: string
  onDownload: (id: string) => void
}) {
  const [previewId, setPreviewId] = useState<string | null>(null)
  const byId = useMemo(
    () => new Map([share.root, ...share.nodes].map((n) => [n.id, n] as const)),
    [share],
  )
  const folder = byId.get(folderId) ?? share.root

  // jalur dibatasi pada isi link (tidak pernah keluar dari folder yang dibagikan)
  const path: PublicNode[] = []
  for (let n: PublicNode | undefined = folder; n; n = n.parentId ? byId.get(n.parentId) : undefined) path.unshift(n)

  const children = share.nodes
    .filter((n) => n.parentId === folder.id)
    .sort((a, b) =>
      a.kind !== b.kind ? (a.kind === 'file' ? 1 : -1) : a.name.localeCompare(b.name, 'id', { numeric: true }),
    )
  const preview = previewId ? byId.get(previewId) : undefined

  return (
    <div>
      <nav aria-label="Breadcrumb" className={path.length > 1 ? 'flex flex-wrap items-center gap-1 text-sm' : 'hidden'}>
        {path.map((n, i) => (
          <span key={n.id} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground/60" />}
            {i === path.length - 1 ? (
              <span className="font-medium">{n.name}</span>
            ) : (
              <button
                className="rounded px-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => goTo(shareHash(share.key, n.id === share.root.id ? undefined : n.id))}
              >
                {n.name}
              </button>
            )}
          </span>
        ))}
      </nav>

      <div className={path.length > 1 ? 'mt-3 flex items-center gap-3' : 'flex items-center gap-3'}>
        <NodeIcon node={folder} size="lg" />
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{folder.name}</h1>
          <p className="text-xs text-muted-foreground">{children.length} item</p>
        </div>
      </div>

      {children.length === 0 ? (
        <EmptyState icon={FolderOpen} title="Folder ini kosong" className="mt-4 rounded-xl border border-dashed" />
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border bg-card">
          <table className="w-full">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="h-10 px-3 font-medium">Nama</th>
                <th className="hidden h-10 px-3 font-medium sm:table-cell">Diperbarui</th>
                <th className="hidden h-10 px-3 font-medium sm:table-cell">Ukuran</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {children.map((n) => (
                <tr
                  key={n.id}
                  tabIndex={0}
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                  onClick={() => (n.kind === 'folder' ? goTo(shareHash(share.key, n.id)) : setPreviewId(n.id))}
                  onKeyDown={(e) => e.key === 'Enter' && (n.kind === 'folder' ? goTo(shareHash(share.key, n.id)) : setPreviewId(n.id))}
                >
                  <td className="px-3 py-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <NodeIcon node={n} size="sm" />
                      <span className="truncate text-sm font-medium">{n.name}</span>
                    </div>
                  </td>
                  <td className="hidden px-3 py-2 text-sm text-muted-foreground sm:table-cell" title={formatDateTime(n.updatedAt)}>
                    {formatDate(n.updatedAt)}
                  </td>
                  <td className="hidden px-3 py-2 text-sm text-muted-foreground sm:table-cell">
                    {n.kind === 'file' ? formatBytes(n.size) : `${share.nodes.filter((c) => c.parentId === n.id).length} item`}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {n.kind === 'file' && share.permissions.canDownload && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDownload(n.id)
                        }}
                      >
                        Unduh
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preview && (
        <Dialog open onOpenChange={(o) => !o && setPreviewId(null)}>
          <DialogContent className="gap-4 sm:max-w-3xl">
            <div className="flex items-center gap-3 pr-8">
              <NodeIcon node={preview} size="sm" />
              <div className="min-w-0">
                <DialogTitle className="truncate">{preview.name}</DialogTitle>
                <DialogDescription>Dibagikan oleh {share.sharedBy}</DialogDescription>
              </div>
            </div>
            <FileDetails
              file={preview}
              canDownload={share.permissions.canDownload}
              onDownload={() => onDownload(preview.id)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

/**
 * Halaman link publik `/#/s/<key>[/<folderId>]` — bisa dibuka TANPA login.
 * Isinya diambil dari endpoint publik backend memakai access key.
 */
export function PublicSharePage({ shareKey, nodeId }: { shareKey: string; nodeId?: string }) {
  const { state, download } = usePublicShare(shareKey)
  const myNodes = useAppSelector((s) => s.drive.nodes)
  const share = state.status === 'ready' ? state.share : undefined
  // user yang login & punya akses → tawarkan membuka di aplikasi
  const openTarget =
    share && myNodes[share.root.id]
      ? share.root.kind === 'folder'
        ? (nodeId ?? share.root.id)
        : (myNodes[share.root.id]?.parentId ?? undefined)
      : undefined

  return (
    <div className="flex min-h-dvh flex-col bg-shell">
      <TopBar openTarget={openTarget} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        {state.status === 'loading' && (
          <p className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" /> Membuka link…
          </p>
        )}

        {state.status === 'error' && (
          <EmptyState
            icon={Link2Off}
            title="Link tidak dapat dibuka"
            description={`${state.message} Link mungkin salah, sudah dinonaktifkan, kedaluwarsa, atau itemnya telah dihapus.`}
            action={<Button onClick={() => goTo('#/')}>Masuk ke Varnion Space</Button>}
            className="mt-10 rounded-2xl border bg-background"
          />
        )}

        {share && (
          <div className="space-y-5 rounded-2xl border bg-background p-4 shadow-xs sm:p-6">
            <ShareBanner share={share} />
            {share.root.kind === 'folder' ? (
              <FolderBrowser share={share} folderId={nodeId ?? share.root.id} onDownload={(id) => void download(id)} />
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <NodeIcon node={share.root} size="lg" />
                  <h1 className="min-w-0 truncate text-xl font-semibold tracking-tight">{share.root.name}</h1>
                </div>
                <FileDetails
                  file={share.root}
                  canDownload={share.permissions.canDownload}
                  onDownload={() => void download(share.root.id)}
                />
              </>
            )}
          </div>
        )}
      </main>
      <p className="pb-6 text-center text-xs text-muted-foreground">Dibagikan melalui Varnion Space</p>
    </div>
  )
}
