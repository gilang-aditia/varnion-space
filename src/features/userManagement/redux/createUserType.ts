/* ------------------------------- API (Swagger) ------------------------------- */

/** POST /users — body. `role_code` + `workspace_id` opsional: assign peran workspace sekaligus. */
export interface CreateUserPayload {
  display_name: string;
  email: string;
  password: string;
  /** Kode peran, mis. `member`, `admin`. */
  role_code?: string;
  /** Workspace tempat peran di-assign. Default `VITE_WORKSPACE_ID` bila `role_code` diisi. */
  workspace_id?: string;
}

/** POST /users — `data` respons. */
export interface CreatedUser {
  id: string;
  email: string;
  display_name: string;
  /** Mis. `active`. */
  status: string;
  created_at: string;
}

/** POST /users — respons (201). */
export interface ApiCreateUserResponse {
  status: string;
  success_code: number;
  data: CreatedUser;
}

/* ---------------------------------- Redux ---------------------------------- */

export interface CreateUserState {
  loading: boolean;
  /** Pesan error terakhir (ditampilkan di form). */
  error: string | null;
  /** User yang terakhir berhasil dibuat. */
  createdUser: CreatedUser | null;
}
