import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export default function SidebarButton({ Icon, to, children }: { Icon: React.ElementType, to?: string, children: React.ReactNode}) {
  const linkDisabled = to ? false : true;

  return <>
    <Button variant={"ghost"} className='justify-start gap-3 duration-150 transition-colors text-base font-normal hover:text-white! cursor-pointer' size="lg" asChild>
        <Link to={to ?? ""} disabled={linkDisabled} activeProps={linkDisabled ? {className: "hover:bg-sidebar-border!"} : {className: "bg-blue-600! hover:bg-blue-600!"}}>
            <Icon className='size-5 shrink-0' />
            {children}
        </Link>
    </Button>
  </>
}
