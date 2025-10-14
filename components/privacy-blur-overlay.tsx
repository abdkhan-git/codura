"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Lock, UserPlus, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrivacyBlurOverlayProps {
  children: React.ReactNode;
  isPrivate: boolean;
  title?: string;
  description?: string;
  showConnectButton?: boolean;
  className?: string;
  blurIntensity?: 'sm' | 'md' | 'lg';
}

export function PrivacyBlurOverlay({
  children,
  isPrivate,
  title = "This content is private",
  description = "Connect with this user to view their detailed activity",
  showConnectButton = true,
  className,
  blurIntensity = 'md'
}: PrivacyBlurOverlayProps) {
  // If not private, just render children
  if (!isPrivate) {
    return <>{children}</>;
  }

  const blurClasses = {
    sm: 'blur-sm',
    md: 'blur-md',
    lg: 'blur-lg'
  };

  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      {/* Blurred content */}
      <div className={cn(
        "pointer-events-none select-none",
        blurClasses[blurIntensity],
        "opacity-40"
      )}>
        {children}
      </div>

      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background/70 via-background/85 to-background/70 backdrop-blur-md rounded-lg animate-pulse-slow" />
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-brand/10 to-transparent" 
          style={{ animation: 'shimmer-slide 3s ease-in-out infinite' }} />
      </div>
      
      {/* Content overlay */}
      <div className="absolute inset-0 flex items-center justify-center border border-border/50 rounded-lg px-8 py-6">
        <div className="text-center w-full max-w-xs relative z-20">
          {/* Icon with gradient background */}
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-brand/10 to-purple-500/10 flex items-center justify-center ring-1 ring-border/30 shadow-2xl shadow-brand/20 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand/20 to-purple-500/20 flex items-center justify-center animate-pulse-slow">
              <Lock className="w-6 h-6 text-brand" strokeWidth={2.5} />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-base font-bold mb-1 bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text text-transparent animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {title}
          </h3>

          {/* Description */}
          <p className="text-xs text-muted-foreground/90 mb-4 leading-relaxed px-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {description}
          </p>

          {/* CTAs */}
          {showConnectButton && (
            <div className="flex flex-col gap-2">
              <Button 
                size="sm"
                className="bg-gradient-to-r from-brand to-brand/90 hover:from-brand/90 hover:to-brand text-brand-foreground shadow-lg shadow-brand/25 transition-all hover:shadow-brand/35 hover:scale-[1.02] font-medium text-xs h-8"
                onClick={() => {
                  // TODO: Implement connection system
                  console.log('Connection feature coming soon!');
                }}
              >
                <UserPlus className="w-3 h-3 mr-1.5" />
                Send Connection Request
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 h-7"
                onClick={() => window.location.href = '/problems'}
              >
                <Globe className="w-3 h-3 mr-1.5" />
                Explore Problems
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface PrivacyBadgeProps {
  isPublic: boolean;
  className?: string;
}

export function PrivacyBadge({ isPublic, className }: PrivacyBadgeProps) {
  if (isPublic) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
        "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20",
        className
      )}>
        <Globe className="w-3.5 h-3.5" />
        Public Profile
      </div>
    );
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20",
      className
    )}>
      <Lock className="w-3.5 h-3.5" />
      Private Profile
    </div>
  );
}

