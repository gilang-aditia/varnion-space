/* ------------------------------- API (Swagger) ------------------------------- */

/** PATCH /workspaces/{id} — parameter path. */
export interface RestoreWorkspaceParams {
  /** Workspace ID (UUID) yang sebelumnya di-soft delete. */
  id: string;
}

/** PATCH /workspaces/{id} — respons. Bentuk `data` belum ada di Swagger; sesuaikan bila berbeda. */
export interface ApiRestoreWorkspaceResponse {
  status: string;
  success_code: number;
  data?: unknown;
}

/** Hasil thunk `restoreWorkspace` (fulfilled). */
export interface RestoreWorkspaceResult {
  id: string;
  response: ApiRestoreWorkspaceResponse;
}

/* ---------------------------------- Redux ---------------------------------- */

export interface RestoreWorkspaceState {
  loading: boolean;
  error: string | null;
  /** Id workspace yang sedang dipulihkan (spinner per kartu). */
  pendingId: string | null;
  /** Id workspace yang terakhir berhasil dipulihkan. */
  lastRestoredId: string | null;
}
