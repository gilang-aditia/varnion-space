/**
 * Bentuk respons umum backend (snake_case, persis seperti Swagger).
 */

/** `meta` pada respons list berpaginasi. */
export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  /** Hanya dikirim bila request memakai `search`. */
  search_query?: string;
}

/** Body respons error backend, mis. `{ "status": "Unauthorized", "error_code": 401, "error_message": "invalid email or password" }`. */
export interface ApiErrorResponse {
  status: string;
  error_code: number;
  error_message: string;
}
