import type { Permission } from "@/types/drive";

/* ------------------------------- API (Swagger) ------------------------------- */

export interface MeData {
  id: string;
  email: string;
  display_name: string;
  status: string;
  roles: string[];
  permissions: Permission[];
}

/** GET /auth/me — respons. */
export interface ApiMeResponse {
  status: string;
  success_code: number;
  data: MeData;
}

/* ---------------------------------- Redux ---------------------------------- */

export interface FetchMeParams {
  /**
   * true → tanpa toast (dipakai saat login / pulihkan sesi, karena thunk
   * tersebut sudah menampilkan toast sendiri).
   */
  silent?: boolean;
}

export interface MeState {
  me: MeData | null;
  loading: boolean;
  error: string | null;
}
