import { SidebarProvider } from '@/components/ui/sidebar'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import UiSidebar from './components/sidebar'

export const Route = createFileRoute('/_workspace')({
  component: RouteComponent,
})

function RouteComponent() {
  return <>
    <SidebarProvider>
      <UiSidebar />
      <main>
        <Outlet />
      </main>
    </SidebarProvider>
  </>
}
