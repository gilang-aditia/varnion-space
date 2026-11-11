import { useState, type ReactNode } from 'react'
import { ArrowDown, CircleCheck, CircleX, LoaderCircle, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { uniqueName } from '@/lib/validation'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { getMoveBlocker, getPath, getSubtreeIds, selectChildrenIndex } from '@/store/selectors'
import { uiActions } from '@/store/slices/uiSlice'
import { moveNode } from '@/store/thunks'
import type { DriveNode } from '@/types/drive'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { NodeIcon } from '@/components/common/node-icon'

/** Penjelasan lengkap untuk alasan singkat dari `getMoveBlocker`. */
const BLOCKER_DETAIL: Record<string, string> = {
  'Lokasi saat ini': 'Item sudah berada di folder tujuan.',
  'Folder yang dipindahkan': 'Folder tidak dapat dipindahkan ke dalam dirinya sendiri atau ke dalam isinya.',
  'Tidak punya izin memindahkan': 'Anda tidak punya izin “Edit” pada item ini.',
  'Hanya bisa melihat': 'Anda tidak punya izin “Edit” di folder tujuan.',
  'Bukan folder tujuan': 'Tujuan harus berupa folder atau workspace yang aktif.',
}

type Check = { tone: 'ok' | 'warn' | 'error'; text: ReactNode }

const CHECK_ICON = {
  ok: <CircleCheck className="mt-px size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />,
  warn: <TriangleAlert className="mt-px size-4 shrink-0 text-amber-600 dark:text-amber-400" />,
  error: <CircleX className="mt-px size-4 shrink-0 text-destructive" />,
}

function Location({ label, path }: { label: string; path: DriveNode[] }) {
  const last = path.at(-1)
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border bg-background px-3 py-2">
      {last && <NodeIcon node={last} size="sm" />}
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{path.map((n) => n.name).join(' › ') || '—'}</p>
      </div>
    </div>
  )
}

/**
 * Validasi & konfirmasi sebelum memindahkan (dari dialog "Pindahkan" maupun
 * drag & drop). Server tetap memvalidasi ulang saat eksekusi.
 */
export function MoveConfirmDialog({ id, targetId, fromDialog }: { id: string; targetId: string; fromDialog?: boolean }) {
  const dispatch = useAppDispatch()
  const nodes = useAppSelector((s) => s.drive.nodes)
  const index = useAppSelector(selectChildrenIndex)
  const blocker = useAppSelector((s) => getMoveBlocker(s, id, targetId))
  const [saving, setSaving] = useState(false)
  const node = nodes[id]
  const target = nodes[targetId]
  const close = () => dispatch(uiActions.closeDialog())
  if (!node || !target) return null

  const subtree = getSubtreeIds(index, id)
  const inside = subtree.size - 1
  const rules = [...subtree].reduce((sum, nid) => sum + (nodes[nid]?.access?.length ?? 0), 0)
  const fromWs = nodes[node.workspaceId]
  const toWs = nodes[target.workspaceId]
  const crossWorkspace = node.workspaceId !== target.workspaceId
  const finalName = uniqueName(
    node.name,
    (index[targetId] ?? []).filter((n) => n.id !== id).map((n) => n.name),
  )

  const checks: Check[] = blocker
    ? [{ tone: 'error', text: BLOCKER_DETAIL[blocker] ?? blocker }]
    : [
        { tone: 'ok', text: 'Anda punya izin edit pada item ini dan di folder tujuan.' },
        ...(crossWorkspace
          ? [
              {
                tone: 'warn' as const,
                text: (
                  <>
                    Pindah antar workspace: anggota <b>{toWs?.name ?? 'workspace tujuan'}</b> akan mendapat akses sesuai
                    perannya, sedangkan anggota <b>{fromWs?.name ?? 'workspace asal'}</b> kehilangan akses.
                  </>
                ),
              },
            ]
          : []),
        ...(finalName !== node.name
          ? [
              {
                tone: 'warn' as const,
                text: (
                  <>
                    Nama “{node.name}” sudah dipakai di tujuan — akan disimpan sebagai <b>“{finalName}”</b>.
                  </>
                ),
              },
            ]
          : []),
        ...(rules
          ? [{ tone: 'warn' as const, text: `${rules} aturan akses khusus (bagikan) ikut terbawa.` }]
          : []),
      ]

  const back = () =>
    fromDialog ? dispatch(uiActions.openDialog({ type: 'move', id, targetId })) : close()

  const confirm = async () => {
    setSaving(true)
    try {
      await dispatch(moveNode({ id, targetId })).unwrap()
      close()
    } catch {
      setSaving(false) // pesan error sudah tampil sebagai toast
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="gap-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pindahkan “{node.name}”?</DialogTitle>
          <DialogDescription>
            {node.kind === 'folder'
              ? inside
                ? `Folder beserta ${inside} item di dalamnya akan dipindahkan.`
                : 'Folder kosong akan dipindahkan.'
              : 'File akan dipindahkan beserta seluruh riwayat versinya.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-1.5 rounded-xl bg-muted/40 p-2">
          <Location label="Dari" path={node.parentId ? getPath(nodes, node.parentId) : []} />
          <ArrowDown className="mx-auto size-4 text-muted-foreground" />
          <Location label="Ke" path={getPath(nodes, targetId)} />
        </div>

        <ul className="space-y-2" aria-label="Hasil validasi">
          {checks.map((c, i) => (
            <li
              key={i}
              className={cn(
                'flex items-start gap-2 text-sm',
                c.tone === 'error' ? 'text-destructive' : 'text-foreground/90',
              )}
            >
              {CHECK_ICON[c.tone]}
              <span>{c.text}</span>
            </li>
          ))}
        </ul>

        <DialogFooter>
          <Button variant="outline" onClick={back}>
            {fromDialog ? 'Kembali' : 'Batal'}
          </Button>
          <Button onClick={confirm} disabled={!!blocker || saving}>
            {saving && <LoaderCircle className="animate-spin" />}
            Ya, pindahkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
