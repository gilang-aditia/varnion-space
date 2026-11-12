/* ------------------------------- API (Swagger) ------------------------------- */

/** POST /auth/refresh — body. */
export interface RefreshTokenPayload {
  refresh_token: string;
}

export interface RefreshTokenData {
  access_token: string;
  token_type: string;
  /** Umur access token baru (detik). */
  expires_in: number;
  /** Hanya dikirim bila refresh token lama sudah kedaluwarsa (backend menerbitkan yang baru). */
  refresh_token?: string;
}

/** POST /auth/refresh — respons. */
export interface ApiRefreshTokenResponse {
  status: string;
  success_code: number;
  data: RefreshTokenData;
}

/* ---------------------------------- Redux ---------------------------------- */

export interface RefreshTokenState {
  loading: boolean;
  error: string | null;
  /** Waktu refresh terakhir yang berhasil (ISO). */
  lastRefreshedAt: string | null;
  /** Umur access token terakhir dari backend (detik). */
  expiresIn: number | null;
}
