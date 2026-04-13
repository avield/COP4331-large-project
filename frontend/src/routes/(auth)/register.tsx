import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import AuthLayout from "./components/auth_layout"
import { useMutation } from '@tanstack/react-query'
import api from '@/api/axios'
import { isAxiosError } from 'axios'
import { useState } from 'react'
import { Check, X } from "lucide-react"

export const Route = createFileRoute('/(auth)/register')({
  component: Register,
})

function getPasswordChecks(password: string) {
  return {
    length: password.length >= 8,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  }
}

export default function Register() {
  //Password validation use states
  const [password, setPassword] = useState('')
  const checks = getPasswordChecks(password)
  const isValidPassword = Object.values(checks).every(Boolean)
  const [confirmPassword, setConfirmPassword] = useState('')
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword
  const canSubmit = isValidPassword && passwordsMatch

  const registerMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const name = formData.get("name");
      const email = formData.get("email");
      const password = formData.get("password");
      const confirmPassword = formData.get("confirmPassword");

      if (password != confirmPassword) {
        throw new Error("Password fields don't match.");
      }
      
      const response = await api.post("/auth/register", { email, password, "displayName": name });
      return response.data;
    },
  });

  const handleSubmit = (event: React.SubmitEvent) => {
    event.preventDefault(); // Stops auto-clear
    registerMutation.mutate(new FormData(event.target));
  };

  return (
    <AuthLayout
      title="Create an account"
      description="Enter your details below to create your account"
      footerText="Already have an account?"
      footerLinkText="Sign in"
      footerLinkTo="/login"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div className="space-y-2">
          <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
          <Input 
            name="name" 
            type="text" 
            placeholder="John Doe" 
            className="bg-background"
            required 
          />
        </div>

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
          <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
          <Input
            name="password"
            type="password"
            placeholder="********"
            className="bg-background"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="text-sm space-y-1 mt-2">
            <p className="text-muted-foreground">Password must include:</p>

            <ul className="space-y-1">
              <li className="flex items-center gap-2">
                {checks.length ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-muted-foreground" />}
                <span className={checks.length ? "text-green-500" : "text-muted-foreground"}>
                  At least 8 characters
                </span>
              </li>
              <li className="flex items-center gap-2">
                {checks.upper ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-muted-foreground" />}
                <span className={checks.length ? "text-green-500" : "text-muted-foreground"}>
                  One uppercase letter
                </span>
              </li>
              <li className="flex items-center gap-2">
                {checks.lower ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-muted-foreground" />}
                <span className={checks.length ? "text-green-500" : "text-muted-foreground"}>
                  One lowercase letter
                </span>
              </li>
              <li className="flex items-center gap-2">
                {checks.number ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-muted-foreground" />}
                <span className={checks.length ? "text-green-500" : "text-muted-foreground"}>
                  One uppercase letter
                </span>
              </li>
              <li className="flex items-center gap-2">
                {checks.symbol ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-muted-foreground" />}
                <span className={checks.length ? "text-green-500" : "text-muted-foreground"}>
                  One uppercase letter
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password <span className="text-destructive">*</span></Label>
          <Input
            name="confirmPassword"
            type="password"
            placeholder="********"
            className="bg-background"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {confirmPassword.length > 0 && (
            <div className="flex items-center gap-2 text-sm mt-2">
              {passwordsMatch ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-destructive" />
              )}
              <span className={passwordsMatch ? "text-green-500" : "text-destructive"}>
                {passwordsMatch ? "Passwords match" : "Passwords do not match"}
              </span>
            </div>
          )}
        </div>

        <Button
          type="submit"
          className="w-full cursor-pointer"
          disabled={!canSubmit}
        >
          Create Account
        </Button>

      </form>
      { registerMutation.isError ? 
      <p className="text-red-500 text-center">
        {isAxiosError(registerMutation.error) 
          // If it's an Axios error, try to get the backend's custom message first
          ? registerMutation.error.response?.data?.message || registerMutation.error.message
          // If it's a normal JS error, just show the message
          : registerMutation.error.message
        }
      </p> : null }

      { registerMutation.isSuccess ? (
        <div className='space-y-2 text-center'>
          <p className="text-green-500 text-center">
            {registerMutation.data?.message}
          </p>

          <Link
            to="/resend-verification"
            search={{ email: '' }}
            className="text-sm font-medium text-muted-foreground hover:text-primary"
          >
            Need a new verification email?
          </Link>
        </div>
      )
      : null }
    </AuthLayout>
  )
}