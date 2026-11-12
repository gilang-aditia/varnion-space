/* ------------------------------- API (Swagger) ------------------------------- */

/** PATCH /users/{id} — parameter path. */
export interface RestoreUserParams {
  /** User UUID (yang sebelumnya di-soft delete). */
  id: string;
}

/**
 * PATCH /users/{id} — respons.
 * Bentuk `data` belum ada di Swagger; sesuaikan bila backend mengirim objek user.
 */
export interface ApiRestoreUserResponse {
  status: string;
  success_code: number;
  data?: unknown;
}

/** Hasil thunk `restoreUser` (fulfilled). */
export interface RestoreUserResult {
  id: string;
  response: ApiRestoreUserResponse;
}

/* ---------------------------------- Redux ---------------------------------- */

export interface RestoreUserState {
  loading: boolean;
  error: string | null;
  /** Id user yang terakhir berhasil dipulihkan. */
  lastRestoredId: string | null;
}
