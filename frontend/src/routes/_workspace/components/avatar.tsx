import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "@tanstack/react-router"
import { useAuthStore } from "@/api/authStore"
import api from "@/api/axios"

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
}

export default function NavbarAvatar() {
  const router = useRouter()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const user = useAuthStore((s) => s.user);

  const avatarUrl = user?.profile?.profilePictureUrl;

  // Target the nested profile display name path
  const displayName = user?.profile?.displayName ?? 'User';

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // best-effort
    }
    clearAuth()
    await router.navigate({ to: '/login' })
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full cursor-pointer active:scale-100 active:translate-y-0">
          <Avatar key={user?.id || 'guest'} size="lg">
            {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="size-full rounded-full object-cover" />
            ) : (
                <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
            )}
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-32 duration-10 mt-1 mr-1">
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer" onSelect={() => router.navigate({ to: '/profile' })}>
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onSelect={(e) => e.preventDefault()}>
            Settings
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
