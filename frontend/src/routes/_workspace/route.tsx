import { SidebarProvider } from '@/components/ui/sidebar'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import UiSidebar from './components/sidebar'
import Navbar from './components/navbar'
import { useAuthStore } from '@/api/authStore'
import { isTokenValid } from '@/api/jwt'
import { env } from '@/api/env'
import axios from '@/api/axios'
import { ThemeProvider, useTheme } from '@/context/ThemeContext'

export const Route = createFileRoute('/_workspace')({
  beforeLoad: async () => {
    let token = useAuthStore.getState().accessToken;

    if (!isTokenValid(token)) {
      try {
        const response = await axios.post(
          `/auth/refresh`,
          {},
          {
            baseURL: env.BACKEND_URL,
            withCredentials: true
          }
        );

        token = response.data.accessToken;

        useAuthStore.getState().setAccessToken(token as string);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        throw redirect({
          to: '/login',
        });
      }
    }

    return;
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <ThemeProvider>
      <ThemedLayout />
    </ThemeProvider>
  )
}

function ThemedLayout() {
  const { theme } = useTheme()
  return (
  <div className="min-h-screen bg-background overflow-x-hidden">
        <SidebarProvider>
          <UiSidebar />
          <main className="flex-1 min-w-0 w-full flex flex-col">
            <Navbar />
            <div className="min-w-0 p-4 md:p-6">
              <Outlet />
            </div>
          </main>
        </SidebarProvider>
      </div>
    )
  }
