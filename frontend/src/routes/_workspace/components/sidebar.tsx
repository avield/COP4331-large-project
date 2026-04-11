import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from '@/components/ui/sidebar'
import { ChevronDown, FolderIcon, FolderOpen, GraduationCap, HomeIcon, LibraryIcon, PanelsTopLeft, PlusIcon } from 'lucide-react'
import SidebarButton from './sidebar_button'
import { Link } from '@tanstack/react-router'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

const RECENT_PROJECTS = [
  { id: "1", name: "CS101 Final Exam" },
  { id: "2", name: "Math Tutor App" },
  { id: "3", name: "History Essay Drafts" },
]


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

        {/* Projects Dropdown */}
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup className="px-5 w-full gap-y-2 min-w-fit">
            <SidebarMenu>
              <CollapsibleTrigger asChild>
                <SidebarMenuItem>
                  <SidebarMenuButton className="w-full justify-between font-semibold text-xs tracking-wider text-muted-foreground hover:bg-transparent">
                    PROJECTS
                    <ChevronDown className="transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <SidebarMenuSub className="mt-2 space-y-1 ml-2">
                  {RECENT_PROJECTS.map((project) => (
                    <SidebarMenuSubItem key={project.id}>
                      <SidebarMenuSubButton asChild>
                        <Link to={`/projects/${project.id}`}>
                          <PanelsTopLeft className="size-4 mr-2" />
                          <span className="truncate">{project.name}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                  
                  <SidebarMenuSubItem className="mt-4">
                    <SidebarMenuSubButton asChild>
                      <Link to="/projects" className="text-blue-600 hover:text-blue-700">
                        <LibraryIcon className="size-4 mr-2" />
                        <span>View All Projects</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenu>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>
      <hr />
      <SidebarFooter />
    </Sidebar>
  )
}