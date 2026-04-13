import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import AuthLayout from "./components/auth_layout"
import api from '@/api/axios'
import { useAuthStore } from '@/api/authStore'
import { useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios'

export const Route = createFileRoute('/(auth)/login')({
  component: Login,
})

export default function Login() {
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const email = formData.get("email");
      const password = formData.get("password");
      
      const response = await api.post("/auth/login", { email, password });
      return response.data;
    },
    onSuccess: async (data) => {
      const authStore = useAuthStore.getState()

      authStore.setAccessToken(data.accessToken)

      authStore.setUser(data.user)

      await navigate({ to: '/home' })
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    loginMutation.mutate(new FormData(event.currentTarget))
  }

  const backendErrorMessage =
    loginMutation.isError
      ? isAxiosError(loginMutation.error)
        ? loginMutation.error.response?.data?.message || loginMutation.error.message
        : loginMutation.error.message
      : ''

  const showResendVerificationLink =
    backendErrorMessage === 'Please verify your email before logging in.'

  return (
    <AuthLayout
      title="Welcome back"
      description="Enter your email and password to sign in"
      footerText="Don't have an account?"
      footerLinkText="Sign up"
      footerLinkTo="/register"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div className="space-y-2">
          <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
          <Input 
            name="email"
            type="email" 
            placeholder="user@example.com" 
            className="bg-background"
            required 
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
            <Link 
              to="/forgot-password" 
              className="text-sm font-medium text-muted-foreground hover:text-primary"
            >
              Forgot password?
            </Link>
          </div>
          <Input 
            name="password"
            type="password" 
            placeholder="********"
            className="bg-background"
            required 
          />
        </div>

        <Button type="submit" className="w-full mt-2 cursor-pointer" disabled={loginMutation.isPending} > 
          Sign In
        </Button>

      </form>
      {loginMutation.isError ? (
        <div className="space-y-2 text-center">
          <p className="text-red-500">
            {backendErrorMessage}
          </p>

          {showResendVerificationLink ? (
            <Link
              to="/resend-verification"
              search={{
                email: String(loginMutation.variables?.get('email') ?? ''),
              }}
              className="text-sm font-medium text-muted-foreground hover:text-primary"
            >
              Resend verification email
            </Link>
          ) : null}
        </div>
      ) : null}
    </AuthLayout>
  )
}