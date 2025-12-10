// tferdous17/codura/codura-landing-page-testing/components/sections/hero-elevated.tsx

import { ArrowRightIcon } from "lucide-react";
import { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button, type ButtonProps } from "@/components/ui/button";
import Glow from "@/components/ui/glow";
import { Mockup, MockupFrame } from "@/components/ui/mockup";
import Screenshot from "@/components/ui/screenshot";
import { Section } from "@/components/ui/section";
import { AnimatedTooltip } from "@/components/ui/animated-tooltip";
import Link from "next/link";

interface HeroButtonProps {
  href: string;
  text: string;
  variant?: ButtonProps["variant"];
  icon?: ReactNode;
  iconRight?: ReactNode;
}

interface HeroProps {
  title?: string; // Kept for interface, but using hardcoded title below
  description?: string;
  mockup?: ReactNode | false;
  badge?: ReactNode | false;
  buttons?: HeroButtonProps[] | false;
  className?: string;
}

export default function HeroElevated({
  title = "Your all-in-one platform for technical interview prep.",
  description = "Prepare smarter for technical interviews with our community-driven and AI-powered platform, complete with mock interviews and problem solving.",
  mockup = (
    <div className="relative w-full aspect-video bg-gradient-to-br from-background via-background/95 to-background/90 border border-border/40 rounded-2xl overflow-hidden shadow-2xl group">
      {/* Enhanced Video Placeholder with Nightwatch inspiration */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/20 to-muted/5">
        {/* Background beam effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-brand/50 to-transparent animate-pulse" />
          <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-orange-300/50 to-transparent animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-0 left-3/4 w-px h-full bg-gradient-to-b from-transparent via-brand/30 to-transparent animate-pulse" style={{ animationDelay: "2s" }} />
        </div>

        <div className="text-center space-y-4 relative z-10">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-brand/20 to-orange-300/20 rounded-full flex items-center justify-center border border-brand/20 hover:scale-110 transition-transform duration-300 group-hover:shadow-lg group-hover:shadow-brand/20">
            <svg className="w-10 h-10 text-brand" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Interactive Platform Demo</h3>
            <p className="text-sm text-muted-foreground">See how Codura transforms your interview prep journey</p>
          </div>
        </div>
      </div>

      {/* Enhanced animated grid background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:20px_20px] animate-pulse opacity-30" />
        {/* Moving dots */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-brand/30 rounded-full animate-float"
            style={{
              left: `${10 + i * 12}%`,
              top: `${20 + (i % 3) * 20}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + i * 0.2}s`
            }}
          />
        ))}
      </div>

      {/* Enhanced corner decorations */}
      <div className="absolute top-4 right-4 flex gap-1">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <div className="w-2 h-2 bg-brand rounded-full animate-pulse" style={{ animationDelay: "0.5s" }} />
        <div className="w-2 h-2 bg-orange-300 rounded-full animate-pulse" style={{ animationDelay: "1s" }} />
      </div>
      <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded">
        ✨ Live Interactive Demo
      </div>
    </div>
  ),
  badge = (
    <Badge variant="outline" className="animate-appear border-brand/20 bg-brand/5 hover:bg-brand/10 transition-colors">
      <span className="text-muted-foreground">
        Join over 15,000 students on their journey!
      </span>
      <span className="flex items-center gap-1 text-foreground font-medium">
        Get started
        <ArrowRightIcon className="size-3" />
      </span>
    </Badge>
  ),
  className,
}: HeroProps) {

  const people = [
    {
      id: 1,
      name: "John Doe",
      designation: "Student @ FSC",
      image:
        "https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=3387&q=80",
    },
    {
      id: 2,
      name: "Robert Johnson",
      designation: "Newgrad SWE",
      image:
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YXZhdGFyfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60",
    },
    {
      id: 3,
      name: "Jane Smith",
      designation: "Student @ SBU",
      image:
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8YXZhdGFyfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60",
    },
    {
      id: 4,
      name: "Emily Davis",
      designation: "Student @ NYU",
      image:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGF2YXRhcnxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60",
    },
    {
      id: 5,
      name: "Tyler Durden",
      designation: "Grad Student",
      image:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=3540&q=80",
    },
    {
      id: 6,
      name: "Dora",
      designation: "Data Scientist",
      image:
        "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=3534&q=80",
    },
  ];

  return (
    <>
      <Section
        className={cn(
          // FIX: Removed local conflicting gradient background
          "fade-bottom overflow-hidden pb-0 sm:pb-0 md:pb-0 relative", 
          className,
        )}
      >
        <div className="absolute inset-0 overflow-hidden">
          {/* Animated beam lines */}
          <div className="absolute inset-0 opacity-10">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-px bg-gradient-to-b from-transparent via-brand/30 to-transparent animate-pulse"
                style={{
                  left: `${15 + i * 14}%`,
                  height: '100%',
                  animationDelay: `${i * 0.8}s`,
                  animationDuration: `${2 + i * 0.3}s`
                }}
              />
            ))}
          </div>

          {/* Floating orbs */}
          <div className="absolute inset-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`orb-${i}`}
                className="absolute w-32 h-32 bg-gradient-to-br from-brand/10 to-orange-300/5 rounded-full blur-xl animate-float"
                style={{
                  left: `${10 + i * 20}%`,
                  top: `${20 + (i % 3) * 30}%`,
                  animationDelay: `${i * 1.2}s`,
                  animationDuration: `${8 + i * 2}s`
                }}
              />
            ))}
          </div>

        </div>

        <div className="max-w-container mx-auto flex flex-col gap-6 text-center pt-16 sm:gap-12 relative z-10">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex flex-row items-center justify-center mb-[-10px] w-full">
              <AnimatedTooltip items={people} />
            </div>
            {badge !== false && badge}
            
            <h1 className="animate-appear text-foreground relative inline-block text-5xl leading-tight font-medium tracking-tight text-balance sm:text-6xl sm:leading-tight md:text-8xl md:leading-tight">
              Where preparation <br className="hidden md:block" />
              <span className="text-muted-foreground">meets execution.</span>
            </h1>
            
            {/* Updated description text size and spacing */}
            <p className="text-lg animate-appear text-muted-foreground relative max-w-[740px] font-light text-balance opacity-0 delay-100 sm:text-xl leading-relaxed">
              Prepare smarter for technical interviews with our community-driven and AI-powered platform, complete with mock interviews and problem solving.
            </p>
            
            <div className="z-10 flex flex-col sm:flex-row gap-4 animate-appear opacity-0 delay-200">
              <Link href="/signup">
                <button className="cursor-pointer px-8 py-3 z-10 rounded-[8px] bg-gradient-to-r from-foreground to-foreground/90 hover:from-foreground/90 hover:to-foreground text-background font-semibold focus:ring-1 transition-all duration-200 hover:scale-[1.02] shadow-lg">
                  Start practicing
                </button>
              </Link>
              
              <button className="cursor-pointer px-8 py-3 z-10 rounded-[8px] border border-border/40 bg-background/50 backdrop-blur-sm hover:bg-background/80 text-foreground font-semibold transition-all duration-200 hover:scale-[1.02]">
                Watch demo
              </button>
            </div>
            
            {mockup !== false && (
              <div className="relative w-full pt-12 max-w-4xl">
                <MockupFrame
                  className="animate-appear opacity-0 delay-700 shadow-2xl"
                  size="large"
                >
                  <Mockup
                    type="responsive"
                    className="bg-background/90 w-full rounded-xl border-0 shadow-inner"
                  >
                    {mockup}
                  </Mockup>
                </MockupFrame>
                <Glow
                  variant="top"
                  className="animate-appear-zoom opacity-0 delay-1000"
                />
              </div>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}