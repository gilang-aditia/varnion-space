/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `mock` (default) atau `http`. */
  readonly VITE_API_MODE?: 'mock' | 'http'
  /** Base URL REST API, mis. `https://drive.varnion.id/api`. */
  readonly VITE_API_BASE_URL?: string
  /** Latensi buatan mock server dalam milidetik (default 200). */
  readonly VITE_MOCK_LATENCY_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
