/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL REST API, mis. `https://drive.varnion.id/api`. */
  readonly VITE_API_BASE_URL?: string
  /** `client_id` yang dikirim saat login/refresh (default `web_browser`). */
  readonly VITE_AUTH_CLIENT_ID?: string
  /** `workspace_id` yang dikirim saat login. */
  readonly VITE_WORKSPACE_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
