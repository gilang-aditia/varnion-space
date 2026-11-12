import type { WorkspaceCreator, WorkspaceData } from "./workspaceType";

/* ------------------------------- API (Swagger) ------------------------------- */

/** GET /workspaces/{id} — `data` respons. */
export interface WorkspaceDetail extends WorkspaceData {
  /** Pengguna yang melakukan aktivitas terakhir. */
  last_activity_by: WorkspaceCreator | null;
  /** Aktor aktivitas terakhir (umumnya sama dengan `last_activity_by`). */
  last_activity_actor: WorkspaceCreator | null;
}

/** GET /workspaces/{id} — respons. */
export interface ApiWorkspaceDetailResponse {
  status: string;
  success_code: number;
  data: WorkspaceDetail;
}

/** GET /workspaces/{id} — parameter path. */
export interface FetchWorkspaceDetailParams {
  /** Workspace ID (UUID). */
  id: string;
}

/* ---------------------------------- Redux ---------------------------------- */

export interface WorkspaceDetailState {
  workspace: WorkspaceDetail | null;
  loading: boolean;
  error: string | null;
  /** `requestId` request terakhir — respons yang lebih lama diabaikan. */
  lastRequestId: string | null;
  /** Id workspace yang sedang dimuat — request kembar dilewati (`condition`). */
  pendingId: string | null;
}
