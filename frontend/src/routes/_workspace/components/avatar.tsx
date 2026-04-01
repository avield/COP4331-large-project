import { useState, useEffect } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "@tanstack/react-router"
import { useAuthStore } from "@/api/authStore"
import api from "@/api/axios"

interface UserProfile {
  displayName: string
  profilePictureUrl: string
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
}

export default function NavbarAvatar() {
  const router = useRouter()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    api.get<UserProfile>('/users/profile')
      .then((res) => setProfile(res.data))
      .catch(() => {})
  }, [])

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // best-effort
    }
    clearAuth()
    router.navigate({ to: '/login' })
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full cursor-pointer active:scale-100 active:translate-y-0">
          <Avatar size="lg">
            {profile?.profilePictureUrl
              ? <img src={profile.profilePictureUrl} alt={profile.displayName} className="size-full rounded-full object-cover" />
              : <AvatarFallback>{profile ? getInitials(profile.displayName) : 'U'}</AvatarFallback>
            }
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
