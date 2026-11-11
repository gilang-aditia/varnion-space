import { Folder } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WORKSPACE_COLORS } from '@/lib/colors'
import { FILE_TYPE_META } from '@/lib/file-types'
import type { DriveNode } from '@/types/drive'

const BOX = {
  xs: 'size-5 rounded-[5px] [&_svg]:size-3 text-[10px]',
  sm: 'size-7 rounded-md [&_svg]:size-4 text-xs',
  md: 'size-9 rounded-lg [&_svg]:size-[18px] text-sm',
  lg: 'size-11 rounded-xl [&_svg]:size-5 text-base',
  xl: 'size-16 rounded-2xl [&_svg]:size-8 text-2xl',
} as const

/** Ikon untuk workspace (inisial berwarna), folder, atau file (berdasar tipe). */
export function NodeIcon({
  node,
  size = 'md',
  className,
}: {
  node: Pick<DriveNode, 'kind' | 'name' | 'color' | 'fileType'>
  size?: keyof typeof BOX
  className?: string
}) {
  if (node.kind === 'workspace') {
    const c = WORKSPACE_COLORS[node.color ?? 'blue']
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center font-semibold text-white shadow-sm',
          c.solid,
          BOX[size],
          className,
        )}
      >
        {node.name.charAt(0).toUpperCase()}
      </span>
    )
  }
  if (node.kind === 'folder') {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center bg-sky-500/10 text-sky-600 dark:text-sky-400',
          BOX[size],
          className,
        )}
      >
        <Folder className="fill-current/20" />
      </span>
    )
  }
  const meta = FILE_TYPE_META[node.fileType ?? 'other']
  const Icon = meta.icon
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center', meta.soft, meta.text, BOX[size], className)}>
      <Icon />
    </span>
  )
}
