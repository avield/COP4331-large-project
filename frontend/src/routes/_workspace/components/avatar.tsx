import { useAuthStore } from "@/api/authStore";
import axios from "@/api/axios";
import { env } from "@/api/env";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
<<<<<<< HEAD
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "@tanstack/react-router";

export default function NavbarAvatar() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch(`${import.meta.env.BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // best-effort logout
    }
    router.navigate({ to: '/login' })
  }
=======
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, Settings, UserCircle } from "lucide-react";

export default function NavbarAvatar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try {
      await axios.post(
        '/auth/logout', 
        {}, 
        { 
          baseURL: env.BACKEND_URL,
          withCredentials: true 
        }
      );
    } finally {
      useAuthStore.getState().clearAuth();
      queryClient.clear();

      navigate({ to: '/home' });
    }
  };
>>>>>>> 1f827203ba6174ea6059c72fb5c4e58fc630576f

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full cursor-pointer active:scale-100 active:translate-y-0"
        >
          <Avatar size="lg">
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-32 duration-10 mt-1 mr-1">
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => router.navigate({ to: '/profile' })}
          >
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={(e) => e.preventDefault()}
          >
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
<<<<<<< HEAD
          <DropdownMenuItem
            className="cursor-pointer"
            variant="destructive"
            onSelect={handleLogout}
          >
            Log out
=======
          <DropdownMenuItem className="cursor-pointer gap-2 text-sm text-destructive focus:text-destructive" 
            onSelect={(e) => {
              e.preventDefault();
              handleLogout();
            }}>
            <LogOut className="size-3.5" /> Log out
>>>>>>> 1f827203ba6174ea6059c72fb5c4e58fc630576f
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
