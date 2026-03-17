import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import UiSidebar from './components/sidebar'

export const Route = createFileRoute('/_workspace')({
  component: RouteComponent,
})

function RouteComponent() {
  return <>
    <SidebarProvider>
      <UiSidebar />
      <main className="flex-1 w-full flex flex-col">
        <div className="p-2 md:hidden">
          <SidebarTrigger variant="ghost" />
        </div>

        <div className="p-4">
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  </>
}
