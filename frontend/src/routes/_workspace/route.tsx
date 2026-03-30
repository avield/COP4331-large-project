import { SidebarProvider } from '@/components/ui/sidebar'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import UiSidebar from './components/sidebar'
import Navbar from './components/navbar'

export const Route = createFileRoute('/_workspace')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="dark min-h-screen bg-background">
      <SidebarProvider>
        <UiSidebar />
        <main className="flex-1 w-full flex flex-col">
          <Navbar />
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </SidebarProvider>
    </div>
  )
}