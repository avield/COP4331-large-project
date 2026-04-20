/// <reference types="vite/client" />
import { Outlet, createRootRoute } from '@tanstack/react-router'
import '../index.css';
import { useSilentTokenRefresh } from '@/hooks/useSilentTokenRefresh'
import { Toaster } from 'sonner'


export const Route = createRootRoute({
  component: RootComponent,
})


function RootComponent() {
  useSilentTokenRefresh()
  
  return (
    <div className="min-h-screen">
      <Outlet />
      <Toaster />
    </div>
  );
}