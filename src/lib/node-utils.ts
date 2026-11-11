import type { DriveNode, User } from '@/types/drive'
import { firstName } from './format'

export type SortKey = 'name' | 'updatedAt' | 'size'

/** "Anda" untuk user aktif, selain itu nama depan. */
export function displayName(user: User | undefined, me: User | null) {
  if (!user) return 'Seseorang'
  return user.id === me?.id ? 'Anda' : firstName(user.name)
}

/** Urutkan item: folder selalu di atas file, lalu sesuai kunci & arah. */
export function sortNodes(nodes: DriveNode[], by: SortKey, dir: 'asc' | 'desc') {
  const factor = dir === 'asc' ? 1 : -1
  return [...nodes].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'file' ? 1 : -1
    const r =
      by === 'name'
        ? a.name.localeCompare(b.name, 'id', { numeric: true })
        : by === 'updatedAt'
          ? a.updatedAt.localeCompare(b.updatedAt)
          : (a.size ?? 0) - (b.size ?? 0)
    return r * factor
  })
}
