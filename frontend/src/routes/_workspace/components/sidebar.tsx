import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, useSidebar } from '@/components/ui/sidebar'
import { GraduationCap, HomeIcon, PlusIcon } from 'lucide-react'
import { useEffect } from 'react'
import SidebarButton from './sidebar_button'

export default function UiSidebar() {
  const { setOpen, isMobile } = useSidebar()

  useEffect(() => {
    const handleResize = () => {
      // If window gets smaller than 1024px but isn't quite mobile yet, collapse it smoothly
      if (window.innerWidth < 1024 && !isMobile) {
        setOpen(false) 
      } else {
        setOpen(true)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [setOpen, isMobile])

  return (
    <Sidebar className="duration-200 ease-in-out transition-all" >
      <SidebarHeader>
        <div className='flex flex-row items-center gap-2 my-4 ml-5'>
          <GraduationCap className='size-8' />
          <div className='text-xl font-semibold text-sidebar-foreground w-fit h-fit'>
            Taskademia
          </div>
        </div>
      </SidebarHeader>
      <hr />
      <SidebarContent>
        <SidebarGroup className="p-5 w-full gap-y-2">
          <p className="font-semibold text-xs tracking-wider px-3">
          MAIN
          </p>
          <SidebarButton Icon={HomeIcon} to="/home">
            Home
          </SidebarButton>
          <SidebarButton Icon={PlusIcon}>
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