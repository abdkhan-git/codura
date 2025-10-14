import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { signup, signInWithGithub, signInWithGoogle } from "@/app/login/actions"

export function SignUpForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-8", className)} {...props}>
      {/* Create Account Header */}
      <div className="text-center">
        <h2 className="text-3xl font-semibold text-foreground mb-3">Create an account</h2>
        <p className="text-muted-foreground text-base">
          Get started with your free account
        </p>
      </div>

      {/* OAuth Buttons */}
      <div className="space-y-3">
        {/* GitHub Sign Up Button */}
        <form action={signInWithGithub}>
          <Button variant="outline" className="w-full h-12 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background/80 hover:border-border transition-all duration-200 shadow-sm" type="submit">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 mr-3">
              <path
                d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                fill="currentColor"
              />
            </svg>
            Continue with GitHub
          </Button>
        </form>

        {/* Google Sign Up Button */}
        <form action={signInWithGoogle}>
          <Button variant="outline" className="w-full h-12 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background/80 hover:border-border transition-all duration-200 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 mr-3">
              <path
                d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                fill="currentColor"
              />
            </svg>
            Continue with Google
          </Button>
        </form>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-3 text-muted-foreground font-medium">
            Or
          </span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form action={signup} className="space-y-4">
        {/* Full Name Field */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium text-foreground">Full Name</Label>
          <Input
            name="full_name"
            type="text"
            placeholder="Enter your full name"
            required
            className="h-12 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm focus:bg-background/80 focus:border-primary transition-all duration-200"
          />
        </div>

        {/* Username Field */}
        <div className="space-y-2">
          <Label htmlFor="username" className="text-sm font-medium text-foreground">Username</Label>
          <Input
            name="username"
            type="text"
            placeholder="Choose a username"
            pattern="[a-zA-Z0-9_-]{3,20}"
            title="Username must be 3-20 characters and can only contain letters, numbers, underscores, and hyphens"
            required
            className="h-12 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm focus:bg-background/80 focus:border-primary transition-all duration-200"
          />
          <p className="text-xs text-muted-foreground">
            3-20 characters, letters, numbers, - and _ only
          </p>
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
          <Input
            name="email"
            type="email"
            placeholder="Enter your email"
            required
            className="h-12 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm focus:bg-background/80 focus:border-primary transition-all duration-200"
          />
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
          <Input 
            name="password" 
            type="password" 
            placeholder="Create a password"
            required 
            className="h-12 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm focus:bg-background/80 focus:border-primary transition-all duration-200"
          />
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <Label htmlFor="confirm-password" className="text-sm font-medium text-foreground">Confirm Password</Label>
          <Input 
            name="confirm-password" 
            type="password" 
            placeholder="Confirm your password"
            required 
            className="h-12 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm focus:bg-background/80 focus:border-primary transition-all duration-200"
          />
        </div>

        {/* Sign Up Button */}
        <Button type="submit" className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg hover:shadow-xl transition-all duration-200">
          Create account
        </Button>
      </form>

      {/* Login Link */}
      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <a href="/login" className="text-primary hover:underline font-medium">
          Sign in
        </a>
      </div>

      {/* Terms */}
      <div className="text-center text-xs text-muted-foreground">
        By creating an account, you agree to our{" "}
        <a href="#" className="underline hover:text-foreground">Terms of Service</a>{" "}
        and <a href="#" className="underline hover:text-foreground">Privacy Policy</a>
      </div>
    </div>
  )
}