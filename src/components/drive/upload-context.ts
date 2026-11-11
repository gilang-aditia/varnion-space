import { createContext, useContext } from 'react'

export interface UploadApi {
  /** Buka pemilih file untuk mengunggah ke sebuah folder/workspace. */
  pickFiles: (parentId: string) => void
  /** Buka pemilih file untuk mengunggah versi baru sebuah file. */
  pickVersion: (fileId: string) => void
}

export const UploadContext = createContext<UploadApi | null>(null)

export function useUpload(): UploadApi {
  const ctx = useContext(UploadContext)
  if (!ctx) throw new Error('useUpload harus dipakai di dalam <UploadProvider>')
  return ctx
}
