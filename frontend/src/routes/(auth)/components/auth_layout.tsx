import { Link } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { GraduationCap } from 'lucide-react'

interface AuthLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footerText: string;
  footerLinkText: string;
  footerLinkTo: string;
}

export default function AuthLayout({
  title,
  description,
  children,
  footerText,
  footerLinkText,
  footerLinkTo,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      
      {/* Brand Logo with your custom font! */}
      <div className="mb-8 flex items-center gap-2">
        <GraduationCap className="h-10 w-10 text-primary" />
        <span 
          className="text-4xl font-bold tracking-tight uppercase" 
          style={{ fontFamily: '"Nunito Sans", sans-serif' }}
        >
          Taskademia
        </span>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            {title}
          </CardTitle>
          <CardDescription>
            {description}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          
          {/* This is where your Email/Password inputs and the "Sign In" button will go */}
          {children} 

        </CardContent>
        
        <CardFooter className="flex flex-col items-center justify-center">
          <p className="text-sm text-muted-foreground">
            {footerText}{" "}
            <Link to={footerLinkTo} className="font-medium text-primary hover:underline">
              {footerLinkText}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}