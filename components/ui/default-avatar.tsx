"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface DefaultAvatarProps {
  src?: string | null;
  name?: string | null;
  username?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function DefaultAvatar({ 
  src, 
  name, 
  username, 
  className,
  size = "md" 
}: DefaultAvatarProps) {
  const { theme } = useTheme();
  
  const getInitials = () => {
    if (name) {
      return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (username) {
      return username.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm", 
    lg: "w-12 h-12 text-lg",
    xl: "w-16 h-16 text-xl"
  };

  // Light mode: soft blue to purple gradient with dark text
  // Dark mode: brand to orange gradient with white text (existing)
  const getFallbackClasses = () => {
    if (theme === 'light') {
      return "bg-gradient-to-br from-blue-400 to-purple-500 text-white font-semibold shadow-lg";
    }
    return "bg-gradient-to-br from-brand to-orange-300 text-white font-semibold";
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src={src || undefined} />
      <AvatarFallback className={getFallbackClasses()}>
        {getInitials()}
      </AvatarFallback>
    </Avatar>
  );
}
