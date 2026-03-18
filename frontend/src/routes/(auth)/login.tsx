import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import AuthLayout from "./components/auth_layout"

export const Route = createFileRoute('/(auth)/login')({
  component: Login,
})

export default function Login() {

  const handleLogin = async (formData: FormData) => {
    const email = formData.get("email");
    const password = formData.get("password");
    
    console.log("Logging in with:", email, password);
    // API logic goes here later
  };

  return (
    <AuthLayout
      title="Welcome back"
      description="Enter your email and password to sign in"
      footerText="Don't have an account?"
      footerLinkText="Sign up"
      footerLinkTo="/register"
    >
      <form action={handleLogin} className="space-y-4">
        
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            name="email"
            type="email" 
            placeholder="user@example.com" 
            className="bg-background"
            required 
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link 
              to="/forgot-password" 
              className="text-sm font-medium text-muted-foreground hover:text-primary"
            >
              Forgot password?
            </Link>
          </div>
          <Input 
            id="password" 
            name="password"
            type="password" 
            placeholder="********"
            className="bg-background"
            required 
          />
        </div>

        <Button type="submit" className="w-full mt-2 cursor-pointer">
          Sign In
        </Button>

      </form>
    </AuthLayout>
  )
}