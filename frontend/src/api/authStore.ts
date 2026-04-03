import { create } from 'zustand'

type AuthUser = {
  id: string
  email: string
  displayName?: string
}

interface AuthState {
  accessToken: string | null
  user: AuthUser | null
  setAccessToken: (token: string) => void
  setUser: (user: AuthUser | null) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAccessToken: (token: string) => set({ accessToken: token }),
  setUser: (user) => set({ user }),
  clearAuth: () => set({ accessToken: null, user: null }),
}))