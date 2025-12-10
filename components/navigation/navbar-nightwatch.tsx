"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useTheme } from "next-themes";
import CoduraLogo from "../logos/codura-logo.svg";
import CoduraLogoDark from "../logos/codura-logo-dark.svg";
import { ModeToggle } from "@/components/ui/mode-toggle";


export default function NavbarNightwatch() {
  const [showBorder, setShowBorder] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    const evaluateScrollPosition = () => {
      setShowBorder(window.pageYOffset >= 24);
    };

    window.addEventListener("scroll", evaluateScrollPosition);
    evaluateScrollPosition();

    return () => window.removeEventListener("scroll", evaluateScrollPosition);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[60] border-b border-b-transparent bg-gradient-to-b shadow-none backdrop-blur-none transition-all duration-1000",
        showBorder
          ? theme === "light" 
            ? "border-b-black/10 shadow-[0_4px_60px_0_rgba(0,0,0,0.10)] backdrop-blur-md from-white/80 to-white/50"
            : "border-b-white/10 shadow-[0_4px_60px_0_rgba(0,0,0,0.90)] backdrop-blur-md from-neutral-950/80 to-neutral-950/50"
          : ""
      )}
    >

      <div className="flex items-center justify-start py-4 container"> 
        
  
        <div className="flex items-center mx-auto"> 

          {/* LOGO */}
          <a href="/" aria-label="Codura homepage" className="flex items-center group">
            <Image
              src={theme === "light" ? CoduraLogoDark : CoduraLogo}
              alt="Codura logo"
              width={90}
              height={40}
              priority
              className="transition-all duration-200 group-hover:opacity-80"
            />
          </a>
          
          <nav className={cn(
            "flex items-center gap-2 sm:gap-4 md:gap-6 text-sm sm:text-base md:text-lg leading-7 font-light -tracking-[0.32px] ml-4 sm:ml-8 md:ml-12",
            theme === "light" ? "text-neutral-600" : "text-neutral-400"
          )}>
            <a className={cn("transition-colors", theme === "light" ? "hover:text-neutral-800" : "hover:text-neutral-200")} href="#features">
              Features
            </a>
            <a className={cn("transition-colors", theme === "light" ? "hover:text-neutral-800" : "hover:text-neutral-200")} href="#success-stories">
              Success
            </a>
            <a className={cn("transition-colors", theme === "light" ? "hover:text-neutral-800" : "hover:text-neutral-200")} href="#faq">
              FAQ
            </a>
          </nav>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 absolute inset-y-0 right-0 pr-2 sm:pr-4 lg:relative lg:ml-auto lg:pr-0">
          <div className="flex space-x-1 sm:space-x-2 items-center">
            <ModeToggle />
            <a
              href="/login"
              className={cn(
                "ring-offset-background focus-visible:ring-ring inline-flex cursor-pointer items-center justify-center rounded-xl border whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:translate-y-px disabled:pointer-events-none disabled:opacity-50 h-8 sm:h-10 gap-1 sm:gap-2 px-2 sm:px-4 text-xs sm:text-sm leading-tight nav-links font-medium",
                theme === "light" 
                  ? "border border-gray-200 bg-white/80 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm"
                  : "border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <span className="hidden sm:inline">Sign in</span>
              <span className="sm:hidden">Sign in</span>
            </a>
            <a
              href="/signup"
              className="ring-offset-background focus-visible:ring-ring inline-flex cursor-pointer items-center justify-center rounded-xl border whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:translate-y-px disabled:pointer-events-none disabled:opacity-50 bg-primary hover:bg-primary/90 text-primary-foreground h-8 sm:h-10 gap-1 sm:gap-2 px-2 sm:px-4 text-xs sm:text-sm leading-tight nav-links font-medium shadow-sm"
            >
              <span className="hidden sm:inline">Start for free</span>
              <span className="sm:hidden">Start</span>
            </a>
          </div>

        </div>
      </div>

    </header>
  );
}