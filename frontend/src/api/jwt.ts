type JwtPayload = {
  exp?: number
  [key: string]: unknown
}

export function decodeToken(token: string | null): JwtPayload | null {
  if (!token) return null

  try {
    return JSON.parse(atob(token.split('.')[1])) as JwtPayload
  } catch {
    return null
  }
}

export function getTokenExpiryMs(token: string | null): number | null {
  const payload = decodeToken(token)
  if (!payload?.exp) return null
  return payload.exp * 1000
}

export function isTokenValid(token: string | null) {
  const expiryMs = getTokenExpiryMs(token)
  if (!expiryMs) return false
  return expiryMs > Date.now()
}