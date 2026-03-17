import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardFooter,
  CardTitle,
} from "@/components/ui/card"
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import './index.css';
import AuthCardHeader from './components/auth_card';

export const Route = createFileRoute('/(auth)/login')({
  component: Login,
})

export default function Login() {
  return (
    <div className="flex items-center justify-center w-screen h-screen">
      <Card className="w-full max-w-sm py-7">
        <AuthCardHeader>
          <CardTitle className='text-center'>Log In</CardTitle>
        </AuthCardHeader>
        <CardContent>
          <form>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="********"
                />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button type="submit" className="w-full">
            <Link to="#">Login</Link>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link to="/register">Register</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}