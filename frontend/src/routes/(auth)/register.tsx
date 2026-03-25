import { createFileRoute } from '@tanstack/react-router'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import AuthLayout from "./components/auth_layout"
import { useMutation } from '@tanstack/react-query'
import api from '@/api/axios'
import { isAxiosError } from 'axios'

export const Route = createFileRoute('/(auth)/register')({
  component: Register,
})

export default function Register() {
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
          <Label htmlFor="name">Full Name</Label>
          <Input 
            name="name" 
            type="text" 
            placeholder="John Doe" 
            className="bg-background"
            required 
          />
        </div>

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
        
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input 
            name="password" 
            type="password" 
            placeholder="********"
            className="bg-background"
            required 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input 
            name="confirmPassword" 
            type="password" 
            placeholder="********"
            className="bg-background"
            required 
          />
        </div>

        <Button type="submit" className="w-full cursor-pointer">
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

      { registerMutation.isSuccess ? 
      <p className="text-green-500 text-center">
        {registerMutation.data?.message}
      </p> : null }
    </AuthLayout>
  )
}