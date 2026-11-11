/**
 * Penyimpan token sesi di memori. Diisi oleh store saat login / saat sesi
 * dipulihkan, dan dibaca oleh implementasi API untuk header Authorization.
 */
let authToken: string | null = null

export const setAuthToken = (token: string | null) => {
  authToken = token
}

export const getAuthToken = () => authToken
