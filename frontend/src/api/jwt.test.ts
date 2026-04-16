import { describe, expect, it } from 'vitest'
import { decodeToken, getTokenExpiryMs, isTokenValid } from './jwt'

function makeToken(payload: Record<string, unknown>) {
  const base64Payload = btoa(JSON.stringify(payload))
  return `header.${base64Payload}.signature`
}

describe('jwt utils', () => {
  it('decodeToken returns parsed payload for valid token', () => {
    const token = makeToken({ exp: 2_000_000_000, role: 'member' })
    expect(decodeToken(token)).toEqual({ exp: 2_000_000_000, role: 'member' })
  })

  it('decodeToken returns null for malformed token', () => {
    expect(decodeToken('invalid')).toBeNull()
  })

  it('getTokenExpiryMs returns exp in milliseconds', () => {
    const token = makeToken({ exp: 1_700_000_000 })
    expect(getTokenExpiryMs(token)).toBe(1_700_000_000_000)
  })

  it('isTokenValid returns false for expired or invalid token', () => {
    const expiredToken = makeToken({ exp: Math.floor(Date.now() / 1000) - 60 })
    expect(isTokenValid(expiredToken)).toBe(false)
    expect(isTokenValid(null)).toBe(false)
  })
})
