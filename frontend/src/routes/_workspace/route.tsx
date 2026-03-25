import { SidebarProvider } from '@/components/ui/sidebar'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import UiSidebar from './components/sidebar'
import Navbar from './components/navbar'
import { useAuthStore } from '@/api/authStore'
import { isTokenValid } from '@/api/jwt'
import { env } from '@/api/env'
import axios from '@/api/axios'

export const Route = createFileRoute('/_workspace')({
  beforeLoad: async () => {
    let token = useAuthStore.getState().accessToken;

    if (!isTokenValid(token)) {
      try {
        const response = await axios.post(
          `${env.BACKEND_URL}/auth/refresh`, 
          {}, 
          { withCredentials: true }
        );

        token = response.data.accessToken;

        useAuthStore.getState().setAccessToken(token as string);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        // Refresh failed. They are not authenticated.
        throw redirect({
          to: '/login',
        });
      }
    }

    // They are authenticated, they can go to their desired page
    return;
  },
  component: RouteComponent,
});

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