import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import AuthLayout from "./components/auth_layout"
import { useMutation } from '@tanstack/react-query'
import api from '@/api/axios'
import { isAxiosError } from 'axios'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/(auth)/resend-verification')({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === 'string' ? search.email : '',
  }),
  component: ResendVerification,
})

export default function ResendVerification() {
  const search = useSearch({ from: '/(auth)/resend-verification' })
  const [email, setEmail] = useState(search.email ?? '')

  useEffect(() => {
    setEmail(search.email ?? '')
  }, [search.email])

  const resendMutation = useMutation({
    mutationFn: async (emailToSend: string) => {
      const response = await api.post('/auth/resend-verification', {
        email: emailToSend,
      })
      return response.data
    },
  })

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    resendMutation.mutate(email.trim())
  }

  return (
    <AuthLayout
      title="Resend verification email"
      description="Enter your email and we'll send you a new verification link if your account still needs verification."
      footerText="Remembered your password?"
      footerLinkText="Back to sign in"
      footerLinkTo="/login"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="user@example.com"
            className="bg-background"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <Button
          type="submit"
          className="w-full cursor-pointer"
          disabled={resendMutation.isPending || !email.trim()}
        >
          {resendMutation.isPending ? 'Sending...' : 'Resend verification email'}
        </Button>
      </form>

      {resendMutation.isError ? (
        <p className="text-red-500 text-center">
          {isAxiosError(resendMutation.error)
            ? resendMutation.error.response?.data?.message || resendMutation.error.message
            : resendMutation.error.message}
        </p>
      ) : null}

      {resendMutation.isSuccess ? (
        <div className="space-y-3 text-center">
          <p className="text-green-500">
            {resendMutation.data?.message}
          </p>

          <Link
            to="/login"
            className="text-sm font-medium text-muted-foreground hover:text-primary"
          >
            Back to sign in
          </Link>
        </div>
      ) : null}
    </AuthLayout>
  )
}