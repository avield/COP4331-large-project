import { useAuthStore } from '@/api/authStore';
import axios from '@/api/axios';
import { env } from '@/api/env';
import { isTokenValid } from '@/api/jwt';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/(auth)')({
    beforeLoad: async () => {
        let token = useAuthStore.getState().accessToken;

        // Token is not valid, let's try refreshing it to see if it can be made valid
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
                // Token efresh failed. Let them proceed to the child route (Login/Register)
                return; 
            }
        }

        // If they get here, they are authenticated
        throw redirect({
            to: '/home',
        });
  },
  component: () => <Outlet />,
});