/* ------------------------------- API (Swagger) ------------------------------- */

/** Item `GET /workspaces/{id}/logs` (entri VictoriaLogs). */
export interface WorkspaceLog {
  /** Pesan log, mis. "Folder deleted: Archived Projects". */
  _msg: string;
  _stream: string;
  _stream_id: string;
  /** Waktu kejadian (ISO). */
  _time: string;
  /** Kode kejadian, mis. `EDIT_FOLDER`. */
  event: string;
  /** Mis. `info`, `warn`, `error`. */
  level: string;
  service: string;
  user_email: string;
  user_name: string;
  workspace_id: string;
}

/** GET /workspaces/{id}/logs — respons. */
export interface ApiWorkspaceLogsResponse {
  status: string;
  success_code: number;
  data: WorkspaceLog[];
}

/** GET /workspaces/{id}/logs — parameter. */
export interface FetchWorkspaceLogsParams {
  /** Workspace ID (UUID). */
  id: string;
  /** Maks. log yang dikembalikan (default 50, maks 1000). */
  limit?: number;
}

/* ---------------------------------- Redux ---------------------------------- */

export interface WorkspaceLogsState {
  logs: WorkspaceLog[];
  /** Workspace pemilik `logs`. */
  workspaceId: string | null;
  loading: boolean;
  error: string | null;
  /** `requestId` request terakhir — respons yang lebih lama diabaikan. */
  lastRequestId: string | null;
}
