import { useAuthStore } from "@/api/authStore";
import axios from "@/api/axios";
import { env } from "@/api/env";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon"
          className="rounded-full cursor-pointer h-8 w-8 hover:ring-2 hover:ring-brand/30 transition-all active:scale-95">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[11px] font-semibold bg-brand/20 text-brand">US</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-44 mt-1 mr-2 border-border/60" align="end">
        <DropdownMenuLabel className="font-normal pb-1">
          <p className="text-sm font-medium leading-none">My Account</p>
          <p className="text-xs text-muted-foreground mt-1 truncate">user@example.com</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer gap-2 text-sm" onSelect={(e) => e.preventDefault()}>
            <UserCircle className="size-3.5 text-muted-foreground" /> Profile
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer gap-2 text-sm" onSelect={(e) => e.preventDefault()}>
            <Settings className="size-3.5 text-muted-foreground" /> Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer gap-2 text-sm text-destructive focus:text-destructive" 
            onSelect={(e) => {
              e.preventDefault();
              handleLogout();
            }}>
            <LogOut className="size-3.5" /> Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}