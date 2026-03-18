import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader } from '@/components/ui/sidebar'
import { GraduationCap, HomeIcon, PlusIcon } from 'lucide-react'
import SidebarButton from './sidebar_button'
import { Link } from '@tanstack/react-router'

export default function UiSidebar() {
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <Link to="/home">
          <div className='flex flex-row items-center gap-2 my-4 ml-5'>
            <GraduationCap className='size-8 min-h-8 min-w-8 text-blue-600' />
            <div className='text-xl font-semibold text-sidebar-foreground w-fit h-fit'>
              Taskademia
            </div>
          </div>
        </Link>
      </SidebarHeader>
      <hr />
      <SidebarContent>
        <SidebarGroup className="p-5 w-full gap-y-2 min-w-fit">
          <p className="font-semibold text-xs tracking-wider px-3">
          MAIN
          </p>
          <SidebarButton Icon={HomeIcon} to="/home">
            Home
          </SidebarButton>
          <SidebarButton Icon={PlusIcon} to="/projects/new">
            New Project
          </SidebarButton>
        </SidebarGroup>
        <SidebarGroup />
      </SidebarContent>
      <hr />
      <SidebarFooter />
    </Sidebar>
  )
}