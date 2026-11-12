/* ------------------------------- API (Swagger) ------------------------------- */

/** POST /auth/logout — respons (tanpa body request). */
export interface ApiLogoutResponse {
  status: string;
  success_code: number;
  /** Mis. "Log out successfully". */
  data: string;
}

/* ---------------------------------- Redux ---------------------------------- */

export interface LogoutState {
  loading: boolean;
  error: string | null;
  /** Pesan dari backend (`data`). */
  message: string | null;
}
