"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, Users, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePublicInterview } from "@/contexts/public-interview-context";

export function PublicInterviewStatusButton() {
  const { activeSession, toggleWindow, isWindowOpen } = usePublicInterview();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);


  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return null;
  }

  // If no active session, don't show the button at all
  if (!activeSession) {
    return null;
  }

  // Determine status color and icon
  const getStatusConfig = () => {
    if (activeSession.hasPendingRequests) {
      return {
        color: "bg-yellow-500",
        hoverColor: "hover:bg-yellow-600",
        icon: Bell,
        label: "Pending Join Requests",
        animate: "animate-pulse",
      };
    } else if (activeSession.isConnected) {
      return {
        color: "bg-green-500",
        hoverColor: "hover:bg-green-600",
        icon: Users,
        label: "Interview Active - Connected",
        animate: "",
      };
    } else {
      return {
        color: "bg-red-500",
        hoverColor: "hover:bg-red-600",
        icon: Monitor,
        label: "Waiting for Participant",
        animate: "animate-pulse",
      };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Button
      onClick={toggleWindow}
      variant="ghost"
      size="sm"
      className={cn(
        "h-9 w-9 p-0 rounded-lg transition-all duration-300 hover:scale-110",
        isWindowOpen && "bg-accent"
      )}
      title={config.label}
    >
      <div className="relative">
        <Icon className="w-4 h-4" />
        <div
          className={cn(
            "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-background",
            config.color,
            config.animate
          )}
        />
      </div>
    </Button>
  );
}
