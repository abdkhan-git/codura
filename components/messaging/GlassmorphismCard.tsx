/**
 * GlassmorphismCard - Reusable frosted glass card component
 * Matches the design system used in dashboard-navbar
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface GlassmorphismCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

export function GlassmorphismCard({
  children,
  className,
  onClick,
  interactive = false,
}: GlassmorphismCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        // Glass effect - backdrop blur with semi-transparent background
        'backdrop-blur-md bg-white/10 dark:bg-white/5',
        // Border styling
        'border border-white/20 dark:border-white/10',
        // Rounded corners and shadows
        'rounded-xl shadow-lg',
        // Interactive state
        interactive && 'cursor-pointer transition-all duration-200 hover:bg-white/15 dark:hover:bg-white/10 hover:border-white/30 dark:hover:border-white/15',
        className
      )}
    >
      {children}
    </div>
  );
}
