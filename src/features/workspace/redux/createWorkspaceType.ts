import type { WorkspaceData } from "./workspaceType";

/* ------------------------------- API (Swagger) ------------------------------- */

/** POST /workspaces — body. */
export interface CreateWorkspacePayload {
  name: string;
  description: string;
}

/**
 * POST /workspaces — `data` respons.
 * Diasumsikan sama dengan item `GET /workspaces`; sesuaikan bila respons backend berbeda.
 */
export type CreatedWorkspace = WorkspaceData;

/** POST /workspaces — respons. */
export interface ApiCreateWorkspaceResponse {
  status: string;
  success_code: number;
  data: CreatedWorkspace;
}

/* ---------------------------------- Redux ---------------------------------- */

export interface CreateWorkspaceState {
  loading: boolean;
  /** Pesan error terakhir (ditampilkan di form). */
  error: string | null;
  /** Workspace yang terakhir berhasil dibuat. */
  createdWorkspace: CreatedWorkspace | null;
}
