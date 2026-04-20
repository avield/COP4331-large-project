import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from './authStore'

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({
      accessToken: null,
      user: null,
      isLoggingOut: false,
    })
  })

  it('setUser normalizes _id object and profile fields', () => {
    const backendLikeUser = {
      id: '',
      _id: { toString: () => 'mongo-id-123' },
      email: 'test@example.com',
      profile: { displayName: 'Test User' },
    }

    useAuthStore.getState().setUser(backendLikeUser)

    const state = useAuthStore.getState()
    expect(state.user?.id).toBe('mongo-id-123')
    expect(state.user?.email).toBe('test@example.com')
    expect(state.user?.displayName).toBe('Test User')
  })

  it('clearAuth removes token and user', () => {
    useAuthStore.setState({
      accessToken: 'token-1',
      user: { id: '1', email: 'x@y.com', profile: {} },
      isLoggingOut: false,
    })

    useAuthStore.getState().clearAuth()
    const state = useAuthStore.getState()

    expect(state.accessToken).toBeNull()
    expect(state.user).toBeNull()
  })

  it('setIsLoggingOut toggles logout state', () => {
    useAuthStore.getState().setIsLoggingOut(true)
    expect(useAuthStore.getState().isLoggingOut).toBe(true)

    useAuthStore.getState().setIsLoggingOut(false)
    expect(useAuthStore.getState().isLoggingOut).toBe(false)
  })
})
