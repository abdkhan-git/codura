"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface UserCardSkeletonProps {
  className?: string;
}

export function UserCardSkeleton({ className }: UserCardSkeletonProps) {
  const { theme } = useTheme();

  return (
    <Card className={cn(
      "h-80 border-2 backdrop-blur-xl animate-pulse",
      theme === 'light'
        ? "bg-white/60 border-black/5"
        : "bg-zinc-950/60 border-white/5",
      className
    )}>
      <div className="p-6 h-full flex flex-col">
        {/* Avatar and basic info skeleton */}
        <div className="flex items-start gap-4 mb-4">
          <div className={cn(
            "w-12 h-12 rounded-full",
            theme === 'light' ? "bg-zinc-200" : "bg-zinc-800"
          )} />
          <div className="flex-1 space-y-2">
            <div className={cn(
              "h-4 w-3/4 rounded",
              theme === 'light' ? "bg-zinc-200" : "bg-zinc-800"
            )} />
            <div className={cn(
              "h-3 w-1/2 rounded",
              theme === 'light' ? "bg-zinc-200" : "bg-zinc-800"
            )} />
          </div>
        </div>

        {/* University and year skeleton */}
        <div className="space-y-2 mb-4">
          <div className={cn(
            "h-3 w-full rounded",
            theme === 'light' ? "bg-zinc-200" : "bg-zinc-800"
          )} />
          <div className={cn(
            "h-3 w-2/3 rounded",
            theme === 'light' ? "bg-zinc-200" : "bg-zinc-800"
          )} />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="text-center space-y-1">
              <div className={cn(
                "h-6 w-8 mx-auto rounded",
                theme === 'light' ? "bg-zinc-200" : "bg-zinc-800"
              )} />
              <div className={cn(
                "h-3 w-12 mx-auto rounded",
                theme === 'light' ? "bg-zinc-200" : "bg-zinc-800"
              )} />
            </div>
          ))}
        </div>

        {/* Button skeleton */}
        <div className="mt-auto">
          <div className={cn(
            "h-10 w-full rounded-lg",
            theme === 'light' ? "bg-zinc-200" : "bg-zinc-800"
          )} />
        </div>
      </div>
    </Card>
  );
}
