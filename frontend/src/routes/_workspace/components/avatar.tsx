import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function NavbarAvatar() {
  return <>
    <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full cursor-pointer active:scale-100 active:translate-y-0">
                <Avatar size="lg">
                    <AvatarFallback>User</AvatarFallback>
                </Avatar>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-32 duration-10 mt-1 mr-1">
            <DropdownMenuGroup>
            <DropdownMenuItem className="cursor-pointer" onSelect={(e) => e.preventDefault()}>Profile</DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onSelect={(e) => e.preventDefault()}>Settings</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
            <DropdownMenuItem className="cursor-pointer" variant="destructive" onSelect={(e) => e.preventDefault()}>Log out</DropdownMenuItem>
            </DropdownMenuGroup>
        </DropdownMenuContent>
    </DropdownMenu>
  </>
}
