import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type AuthUser = {
  id: string
  email: string
  profile?: {
      displayName?: string
      profilePictureUrl?: string
      aboutMe?: string
      preferredRoles?: string[]
      school?: string
  }
  // older code might be looking for this
  displayName?: string
}

interface AuthState {
  accessToken: string | null
  user: AuthUser | null

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

            setAccessToken: (token: string) => set({ accessToken: token }),
            setUser: (user) => {
                if (user) {
                    // Look for the ID in either field provided by the backend
                    const rawId = user.id || (user as { _id?: string })._id;

                    const normalizedUser: AuthUser = {
                        ...user,
                        id: rawId?.toString() || ''
                    };
                    set({ user: normalizedUser });
                } else {
                    set({ user: null });
                }
            },
            clearAuth: () => set({ accessToken: null, user: null }),

            // Updates the active user profile immutably to trigger global renders!
            refreshProfileImage: (dbUrl) => {
                if (!dbUrl) return;

                const base = import.meta.env.BACKEND_URL || 'http://localhost:5000';
                const cleanBackend = base.endsWith('/') ? base.slice(0, -1) : base;
                const cleanUrl = dbUrl.startsWith('/') ? dbUrl : `/${dbUrl}`;

                // Generate the final cache-busted URL
                const finalUrl = `${cleanBackend}${cleanUrl}?t=${Date.now()}`;

                set((state) => {
                    // Guard against state being empty
                    if (!state.user) return state;

                    return {
                        user: {
                            ...state.user,
                            profile: {
                                ...state.user.profile,
                                profilePictureUrl: finalUrl // Put it directly on the user object!
                            }
                        }
                    };
                });
            }
        }),
        {
            name: 'user-auth-storage',
        }
    )
)