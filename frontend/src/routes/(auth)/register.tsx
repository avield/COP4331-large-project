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

export const Route = createFileRoute('/(auth)/register')({
  component: Register,
})

export default function Register() {
  return (
    <div className="flex items-center justify-center w-screen h-screen">
      <Card className="w-full max-w-sm py-7">
        <AuthCardHeader>
          <CardTitle className='text-center'>Register</CardTitle>
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
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="********"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Confirm Password</Label>
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
          <Button className="w-full" asChild>
            <Link to="#">Register</Link>
          </Button>
          <Link to="/login">already have an account?</Link>
        </CardFooter>
      </Card>
    </div>
  );
}