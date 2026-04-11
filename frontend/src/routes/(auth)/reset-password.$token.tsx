import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AuthLayout from './components/auth_layout'
import { useMutation } from '@tanstack/react-query'
import api from '@/api/axios'
import { isAxiosError } from 'axios'

export const Route = createFileRoute('/(auth)/reset-password/$token')({
  component: ResetPassword,
})

function ResetPassword() {
    const { token } = Route.useParams()
    const navigate = useNavigate()

    const resetPasswordMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            const password = String(formData.get('password') ?? '')
            const confirmPassword = String(formData.get('confirmPassword') ?? '')

            if (!password) {
            throw new Error('Password is required.')
            }

            if (password.length < 8) {
            throw new Error('Passwords must be at least 8 characters long.')
            }

            let flagSymbols = false
            let flagNumber = false
            let flagUpper = false
            let flagLower = false

            for (let i = 0; i < password.length; i++) {
            const char = password[i]

            if (!flagLower && /[a-z]/.test(char)) flagLower = true
            if (!flagUpper && /[A-Z]/.test(char)) flagUpper = true
            if (!flagNumber && /[0-9]/.test(char)) flagNumber = true
            if (!flagSymbols && /[^A-Za-z0-9]/.test(char)) flagSymbols = true

            if (flagLower && flagUpper && flagNumber && flagSymbols) {
                break
            }
            }

            if (!flagLower) {
            throw new Error('Passwords must contain a lower case letter.')
            }

            if (!flagUpper) {
            throw new Error('Passwords must contain an upper case letter.')
            }

            if (!flagNumber) {
            throw new Error('Passwords must contain a number.')
            }

            if (!flagSymbols) {
            throw new Error('Passwords must contain a symbol.')
            }

            if (password !== confirmPassword) {
            throw new Error("Password fields don't match.")
            }

            const response = await api.post(`/auth/reset-password/${token}`, {
            password,
            })

            return response.data
        },
        })

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    resetPasswordMutation.mutate(new FormData(event.currentTarget))
  }

  return (
    <AuthLayout
      title="Reset your password"
      description="Enter a new password for your account"
      footerText="Back to"
      footerLinkText="Sign in"
      footerLinkTo="/login"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New Password *</Label>
          <Input
            name="password"
            type="password"
            placeholder="********"
            className="bg-background"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password *</Label>
          <Input
            name="confirmPassword"
            type="password"
            placeholder="********"
            className="bg-background"
            required
          />
        </div>

        <Button
          type="submit"
          className="mt-2 w-full cursor-pointer"
          disabled={resetPasswordMutation.isPending}
        >
          {resetPasswordMutation.isPending ? 'Resetting...' : 'Set New Password'}
        </Button>
      </form>

      {resetPasswordMutation.isError ? (
        <p className="mt-4 text-center text-red-500">
          {isAxiosError(resetPasswordMutation.error)
            ? resetPasswordMutation.error.response?.data?.message || resetPasswordMutation.error.message
            : resetPasswordMutation.error.message}
        </p>
      ) : null}

      {resetPasswordMutation.isSuccess ? (
        <div className="mt-4 space-y-2 text-center">
          <p className="text-green-500">
            {resetPasswordMutation.data?.message ?? 'Password updated successfully.'}
          </p>
          <p className="text-sm text-muted-foreground">
            Redirecting you to sign in...
          </p>
        </div>
      ) : null}
    </AuthLayout>
  )
}

export default ResetPassword