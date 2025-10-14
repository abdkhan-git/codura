"use client";

import { useTheme } from "next-themes";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ModeToggle } from "@/components/ui/mode-toggle"
import { LoginForm } from "@/components/login-form"
import CoduraLogo from "@/components/logos/codura-logo.svg";
import CoduraLogoDark from "@/components/logos/codura-logo-dark.svg";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";

export default function LoginPage() {
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      // Clear the error from URL after showing it
      window.history.replaceState({}, '', '/login');
    }
  }, [searchParams]);

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      theme === "light" 
        ? "bg-gradient-to-br from-white via-gray-50 to-blue-50" 
        : "bg-zinc-950"
    }`}>
      {/* Background Effects - Matching Landing Page */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0" />
        
        {theme === "light" ? (
          // Light mode background effects
          <>
            <div 
              className="absolute top-[-200px] left-[60%] w-[120vw] h-[120vh] -translate-x-1/2 animate-pulse-slow opacity-20 bg-gradient-to-br from-gray-100/30 to-gray-200/30 rounded-full blur-3xl" 
            />
            <div 
              className="absolute bottom-[10%] right-[70%] w-[80vw] h-[80vh] animate-float-slow bg-gradient-to-br from-gray-200/20 to-gray-300/20 rounded-full blur-3xl"
              style={{ animationDelay: '10s', animationDuration: '30s' }}
            />
          </>
        ) : (
          // Dark mode background effects - matching landing page
          <>
            <div 
              className="absolute top-[-200px] left-[60%] w-[120vw] h-[120vh] -translate-x-1/2 animate-pulse-slow opacity-70" 
            />
            <div 
              className="absolute bottom-[10%] right-[70%] w-[80vw] h-[80vh] animate-float-slow"
              style={{ animationDelay: '10s', animationDuration: '30s' }}
            />
          </>
        )}
      </div>

      {/* Header with Logo and Theme Toggle */}
      <div className="relative z-10 flex justify-between items-center p-6">
        <a href="/" className="group">
          <Image
            src={theme === "light" ? CoduraLogoDark : CoduraLogo}
            alt="Codura logo"
            width={120}
            height={48}
            priority
            className="transition-all duration-200 group-hover:opacity-80"
          />
        </a>
        <ModeToggle />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-120px)] px-6">
        <div className="w-full max-w-md space-y-4">
          {/* Error Message */}
          {error && (
            <Card className="border-2 border-destructive/30 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl shadow-xl">
              <CardContent className="flex items-start gap-3 p-4">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <X className="w-5 h-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-destructive mb-1">Login Failed</h3>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </CardContent>
            </Card>
          )}
          
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
