import { useMemo } from 'react'
import { getAuthToken } from '@/api'
import { decodeToken, type AccessTokenClaims } from '@/lib/jwt'
import { useAppSelector } from '@/store/hooks'

/**
 * Klaim `roles` & `permissions` dari access token (JWT) aktif.
 * Dihitung ulang saat sesi berganti atau token di-refresh.
 */
export function useTokenClaims(): Pick<AccessTokenClaims, 'roles' | 'permissions'> {
  const userId = useAppSelector((s) => s.auth.session?.userId)
  const refreshedAt = useAppSelector((s) => s.refresh.lastRefreshedAt)
  return useMemo(() => {
    void userId
    void refreshedAt
    const claims = decodeToken<AccessTokenClaims>(getAuthToken())
    return { roles: claims?.roles ?? [], permissions: claims?.permissions ?? [] }
  }, [userId, refreshedAt])
}
