import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "@tanstack/react-router"
import { useAuthStore } from "@/api/authStore"
import api from "@/api/axios"
import { NetworkAvatar } from '@/components/network-avatar'
import { useTheme } from "@/context/ThemeContext"

export default function NavbarAvatar() {
  const router = useRouter()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const { theme, toggleTheme } = useTheme()
  const user = useAuthStore((s) => s.user);
  const avatarUrl = user?.profile?.profilePictureUrl;
  const displayName = user?.profile?.displayName ?? 'User';

  const handleLogout = async () => {
    const authStore = useAuthStore.getState()

    authStore.setIsLoggingOut(true)

    try {
      await api.post('/auth/logout')
    } catch {
      // best-effort
    } finally {
      authStore.clearAuth()
      await router.navigate({ to: '/login', replace: true })
      authStore.setIsLoggingOut(false)
    }
  }

  return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full cursor-pointer active:scale-100 active:translate-y-0">
            <NetworkAvatar
                displayName={displayName}
                profilePictureUrl={avatarUrl}
                size="default" // Select which size "sm" or w/e
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-32 duration-10 mt-1 mr-1">
          <DropdownMenuGroup>
            <DropdownMenuItem className="cursor-pointer" onSelect={() => router.navigate({ to: '/profile' })}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center justify-between gap-4 cursor-pointer"
              onSelect={(e) => e.preventDefault()}
            >
              <span>Toggle theme</span>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  theme === 'dark' ? 'bg-brand' : 'bg-muted-foreground/30'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                    theme === 'dark' ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem className="cursor-pointer" variant="destructive" onSelect={handleLogout}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
  )
}
