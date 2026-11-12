/* ------------------------------- API (Swagger) ------------------------------- */

/** DELETE /users/{id}?hard= — parameter. */
export interface DeleteUserParams {
  /** User UUID. */
  id: string;
  /**
   * `false` (default) → soft delete, user masih bisa dipulihkan (PATCH /users/{id}).
   * `true` → hapus permanen.
   */
  hard?: boolean;
}

/**
 * DELETE /users/{id} — respons.
 * Bentuk `data` belum ada di Swagger (diasumsikan pesan string); sesuaikan bila berbeda.
 */
export interface ApiDeleteUserResponse {
  status: string;
  success_code: number;
  data?: unknown;
}

/** Hasil thunk `deleteUser` (fulfilled). */
export interface DeleteUserResult {
  id: string;
  hard: boolean;
  response: ApiDeleteUserResponse;
}

/* ---------------------------------- Redux ---------------------------------- */

export interface DeleteUserState {
  loading: boolean;
  error: string | null;
  /** User yang terakhir berhasil dihapus. */
  lastDeleted: { id: string; hard: boolean } | null;
}
