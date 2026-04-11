import { createFileRoute} from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AuthLayout from './components/auth_layout'
import { useMutation } from '@tanstack/react-query'
import api from '@/api/axios'
import { isAxiosError } from 'axios'

export const Route = createFileRoute('/(auth)/forgot-password')({
  component: ForgotPassword,
})

function ForgotPassword() {
  const forgotPasswordMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const email = formData.get('email')
      const response = await api.post('/auth/forgot-password', { email })
      return response.data
    },
  })

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    forgotPasswordMutation.mutate(new FormData(event.currentTarget))
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      description="Enter your email and we'll send you a reset link"
      footerText="Remembered your password?"
      footerLinkText="Sign in"
      footerLinkTo="/login"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            name="email"
            type="email"
            placeholder="user@example.com"
            className="bg-background"
            required
          />
        </div>

        <Button
          type="submit"
          className="mt-2 w-full cursor-pointer"
          disabled={forgotPasswordMutation.isPending}
        >
          {forgotPasswordMutation.isPending ? 'Sending...' : 'Send Reset Link'}
        </Button>
      </form>

      {forgotPasswordMutation.isError ? (
        <p className="mt-4 text-center text-red-500">
          {isAxiosError(forgotPasswordMutation.error)
            ? forgotPasswordMutation.error.response?.data?.message || forgotPasswordMutation.error.message
            : forgotPasswordMutation.error.message}
        </p>
      ) : null}

      {forgotPasswordMutation.isSuccess ? (
        <div className="mt-4 space-y-2 text-center">
          <p className="text-green-500">
            {forgotPasswordMutation.data?.message ??
              'If an account exists, a reset link has been sent.'}
          </p>
          <p className="text-sm text-muted-foreground">
            Check your email for the password reset link.
          </p>
        </div>
      ) : null}
    </AuthLayout>
  )
}

export default ForgotPassword