/* ------------------------------- API (Swagger) ------------------------------- */

/** DELETE /workspaces/{id}?hard= — parameter. */
export interface DeleteWorkspaceParams {
  /** Workspace ID (UUID). */
  id: string;
  /**
   * `false` (default) → soft delete, bisa dipulihkan (PATCH /workspaces/{id}).
   * `true` → hapus permanen.
   */
  hard?: boolean;
}

/** DELETE /workspaces/{id} — respons. Bentuk `data` belum ada di Swagger; sesuaikan bila berbeda. */
export interface ApiDeleteWorkspaceResponse {
  status: string;
  success_code: number;
  data?: unknown;
}

/** Hasil thunk `deleteWorkspace` (fulfilled). */
export interface DeleteWorkspaceResult {
  id: string;
  hard: boolean;
  response: ApiDeleteWorkspaceResponse;
}

/* ---------------------------------- Redux ---------------------------------- */

export interface DeleteWorkspaceState {
  loading: boolean;
  error: string | null;
  /** Workspace yang terakhir berhasil dihapus. */
  lastDeleted: { id: string; hard: boolean } | null;
}
