import axios from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from './authStore'
import { refreshAccessTokenSilently } from './axios'

describe('axios auth helpers', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      user: null,
      isLoggingOut: false,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('refreshAccessTokenSilently stores and returns fresh access token', async () => {
    vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: { accessToken: 'fresh-access-token' },
    } as never)

    const token = await refreshAccessTokenSilently()

    expect(token).toBe('fresh-access-token')
    expect(useAuthStore.getState().accessToken).toBe('fresh-access-token')
  })

  it('refreshAccessTokenSilently returns null and clears auth on refresh failure', async () => {
    useAuthStore.setState({
      accessToken: 'stale-token',
      user: { id: 'u1', email: 'test@example.com', profile: {} },
      isLoggingOut: false,
    })

    vi.spyOn(axios, 'post').mockRejectedValueOnce(new Error('refresh failed'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const token = await refreshAccessTokenSilently()

    expect(token).toBeNull()
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
  })
})
