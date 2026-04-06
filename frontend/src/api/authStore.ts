import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type AuthUser = {
  id: string
  email: string
  displayName?: string
}

interface AuthState {
  accessToken: string | null
  user: AuthUser | null

  // new state variable
  globalProfileImage: string

  setAccessToken: (token: string) => void
  setUser: (user: AuthUser | null) => void
  clearAuth: () => void

  // action to refresh the image
  refreshProfileImage: (dbUrl: string | undefined) => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
          accessToken: null,
          user: null,

          // Start with an empty string
          globalProfileImage: '',

          setAccessToken: (token: string) => set({ accessToken: token }),
          setUser: (user) => set({ user }),
          clearAuth: () => set({ accessToken: null, user: null, globalProfileImage: '' }),

          // Function computes the safe backend URL and applies a timestamp ONCE
          refreshProfileImage: (dbUrl) => {
            if (!dbUrl) {
              return set({ globalProfileImage: '' });
            }

            const base = import.meta.env.BACKEND_URL || 'http://localhost:5000';
            const cleanBackend = base.endsWith('/') ? base.slice(0, -1) : base;
            const cleanUrl = dbUrl.startsWith('/') ? dbUrl : `/${dbUrl}`;

            // Date.now() is pure here because it's in an action, not a render loop!
            const finalUrl = `${cleanBackend}${cleanUrl}?t=${Date.now()}`;

            set({ globalProfileImage: finalUrl });
          }
        }),
        {
          // This is the storage key that will show up in the browser's Application tab!
          name: 'user-auth-storage',
        }
    )
)