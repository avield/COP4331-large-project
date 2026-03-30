<<<<<<< HEAD
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "@tanstack/react-router"
import { useAuthStore } from "@/api/authStore"
import api from "@/api/axios"

export default function NavbarAvatar() {
  const router = useRouter()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout')
    } catch {
      // best-effort
    }
    clearAuth()
    router.navigate({ to: '/login' })
  }
=======
import { useAuthStore } from "@/api/authStore";
import axios from "@/api/axios";
import { env } from "@/api/env";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

export default function NavbarAvatar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try {
      await axios.post(
        "/auth/logout",
        {},
        {
          baseURL: env.BACKEND_URL,
          withCredentials: true,
        }
      );
    } finally {
      useAuthStore.getState().clearAuth();
      queryClient.clear();
      navigate({ to: "/login" });
    }
  };
>>>>>>> 1fd9f63f9cedd3b70fea20571b94755c05efa95b

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full cursor-pointer active:scale-100 active:translate-y-0">
          <Avatar size="lg">
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-32 duration-10 mt-1 mr-1">
        <DropdownMenuGroup>
<<<<<<< HEAD
          <DropdownMenuItem className="cursor-pointer" onSelect={() => router.navigate({ to: '/profile' })}>
=======
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => navigate({ to: "/profile" })}
          >
>>>>>>> 1fd9f63f9cedd3b70fea20571b94755c05efa95b
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onSelect={(e) => e.preventDefault()}>
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
<<<<<<< HEAD
          <DropdownMenuItem className="cursor-pointer" variant="destructive" onSelect={handleLogout}>
=======
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-sm text-destructive focus:text-destructive"
            onSelect={(e) => {
              e.preventDefault();
              handleLogout();
            }}
          >
            <LogOut className="size-3.5" />
>>>>>>> 1fd9f63f9cedd3b70fea20571b94755c05efa95b
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
<<<<<<< HEAD
  )
}
=======
  );
}
>>>>>>> 1fd9f63f9cedd3b70fea20571b94755c05efa95b
