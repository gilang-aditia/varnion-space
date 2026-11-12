import type { WorkspaceData, WorkspaceStatus } from "./workspaceType";

/* ------------------------------- API (Swagger) ------------------------------- */

/** PUT /workspaces/{id} — body. */
export interface UpdateWorkspacePayload {
  name: string;
  description: string;
  /** `active`, `inactive`, `archived`. */
  status: WorkspaceStatus;
}

/** Argumen thunk `updateWorkspace`: path param `id` + body. */
export interface UpdateWorkspaceParams {
  /** Workspace ID (UUID). */
  id: string;
  payload: UpdateWorkspacePayload;
}

/**
 * PUT /workspaces/{id} — `data` respons.
 * Diasumsikan sama dengan item `GET /workspaces`; sesuaikan bila respons backend berbeda.
 */
export type UpdatedWorkspace = WorkspaceData;

/** PUT /workspaces/{id} — respons. */
export interface ApiUpdateWorkspaceResponse {
  status: string;
  success_code: number;
  data?: UpdatedWorkspace;
}

/** Hasil thunk `updateWorkspace` (fulfilled). */
export interface UpdateWorkspaceResult {
  id: string;
  payload: UpdateWorkspacePayload;
  response: ApiUpdateWorkspaceResponse;
}

/* ---------------------------------- Redux ---------------------------------- */

export interface UpdateWorkspaceState {
  loading: boolean;
  /** Pesan error terakhir (ditampilkan di form). */
  error: string | null;
  /** Workspace yang terakhir berhasil diperbarui. */
  updatedWorkspace: UpdatedWorkspace | null;
}
