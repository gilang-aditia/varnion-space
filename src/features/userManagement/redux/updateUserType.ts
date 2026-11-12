/* ------------------------------- API (Swagger) ------------------------------- */

/** Status akun user. */
export type UserStatus = "active" | "inactive" | "suspended";

/** PUT /users/{id} — body. Semua field opsional: kirim hanya yang berubah. */
export interface UpdateUserPayload {
  display_name?: string;
  /** Kata sandi baru. Tidak dikirim bila tidak diganti. */
  password?: string;
  status?: UserStatus;
}

/** PUT /users/{id} — `data` respons. */
export interface UpdatedUser {
  id: string;
  email: string;
  display_name: string;
  status: UserStatus;
  created_at: string;
}

/** PUT /users/{id} — respons (200). */
export interface ApiUpdateUserResponse {
  status: string;
  success_code: number;
  data: UpdatedUser;
}

/** Argumen thunk `updateUser`: path param `id` + body. */
export interface UpdateUserParams {
  /** User UUID. */
  id: string;
  payload: UpdateUserPayload;
}

/* ---------------------------------- Redux ---------------------------------- */

export interface UpdateUserState {
  loading: boolean;
  /** Pesan error terakhir (ditampilkan di form). */
  error: string | null;
  /** User yang terakhir berhasil diperbarui. */
  updatedUser: UpdatedUser | null;
}
