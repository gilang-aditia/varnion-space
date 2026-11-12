import type { UserData } from "./userType";

/* ------------------------------- API (Swagger) ------------------------------- */

/**
 * GET /users/{id} — `data` respons: profil user beserta peran workspace & permission.
 * Diasumsikan sama dengan item `GET /users`; sesuaikan bila respons backend berbeda.
 */
export type UserDetail = UserData;

/** GET /users/{id} — respons. */
export interface ApiUserDetailResponse {
  status: string;
  success_code: number;
  data: UserDetail;
}

/** GET /users/{id} — parameter path. */
export interface FetchUserDetailParams {
  /** User UUID. */
  id: string;
}

/* ---------------------------------- Redux ---------------------------------- */

export interface UserDetailState {
  user: UserDetail | null;
  loading: boolean;
  error: string | null;
  /** `requestId` request terakhir — respons yang lebih lama diabaikan (mis. pindah user dengan cepat). */
  lastRequestId: string | null;
  /** Id user yang sedang dimuat — request kembar dilewati (`condition`). */
  pendingId: string | null;
}
