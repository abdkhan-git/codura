"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Monitor, Users, Bell, Clock3, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePublicInterview } from "@/contexts/public-interview-context";

export function PublicInterviewStatusButton() {
  const { activeSession, toggleWindow, isWindowOpen, pendingRequests } = usePublicInterview();
  const [mounted, setMounted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState<{ id: string; name: string } | null>(null);

  const seenRequestsRef = useRef<Set<string>>(new Set());
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Live countdown for host sessions
  useEffect(() => {
    if (!activeSession?.endTime || activeSession.role !== "host") {
      setTimeRemaining(null);
      return;
    }

    const end = new Date(activeSession.endTime).getTime();
    if (Number.isNaN(end)) {
      setTimeRemaining(null);
      return;
    }

    const updateTime = () => {
      const diff = end - Date.now();
      if (diff <= 0) {
        setTimeRemaining("Ended");
        return;
      }

      const hours = Math.floor(diff / 3_600_000);
      const minutes = Math.floor((diff % 3_600_000) / 60_000);
      const seconds = Math.floor((diff % 60_000) / 1000);

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m ${seconds.toString().padStart(2, "0")}s`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.endTime, activeSession?.role]);

  // Surface a brief drop-down when a new join request arrives
  useEffect(() => {
    if (!activeSession || activeSession.role !== "host") {
      seenRequestsRef.current.clear();
      setIncomingRequest(null);
      return;
    }

    const pendingIds = new Set(pendingRequests.map((r) => r.id));
    const newRequest = pendingRequests.find((r) => !seenRequestsRef.current.has(r.id));

    if (newRequest) {
      const name = newRequest.requesterName || newRequest.requesterUsername || "Someone";
      setIncomingRequest({ id: newRequest.id, name });

      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      toastTimeoutRef.current = setTimeout(() => setIncomingRequest(null), 3000);
    } else if (pendingRequests.length === 0) {
      setIncomingRequest(null);
    }

    seenRequestsRef.current = pendingIds;
  }, [pendingRequests, activeSession?.role, activeSession?.publicSessionId]);


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
  const popoverOpen = isHovering && (pendingRequests.length > 0 || activeSession.role === "host");
  const formatRequestedAgo = (createdAt?: string) => {
    if (!createdAt) return "";
    const now = Date.now();
    const created = new Date(createdAt).getTime();
    const diff = now - created;
    const minutes = Math.floor(diff / 60_000);
    if (minutes <= 0) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="relative flex items-center gap-2">
      {activeSession.role === "host" && timeRemaining && (
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg border border-border/50 bg-muted/60 text-xs font-medium text-foreground/80">
          <Clock3 className="w-3.5 h-3.5 text-brand" />
          <span>{timeRemaining}</span>
        </div>
      )}

      <Popover open={popoverOpen} onOpenChange={setIsHovering}>
        <PopoverTrigger
          asChild
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
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
            <div className="relative flex items-center justify-center">
              <Icon className="w-4 h-4" />
              {pendingRequests.length > 0 && activeSession.role === "host" && (
                <Badge className="absolute -top-2 -right-3 text-[10px] px-1.5 py-0 h-5 min-w-[18px]" variant="secondary">
                  {pendingRequests.length}
                </Badge>
              )}
              <div
                className={cn(
                  "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-background",
                  config.color,
                  config.animate
                )}
              />
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          side="bottom"
          className="w-72 p-4 shadow-lg"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-foreground/80" />
              <span className="text-sm font-semibold">Active join requests</span>
            </div>
            <Badge variant="secondary">
              {pendingRequests.length}
            </Badge>
          </div>

          {pendingRequests.length > 0 ? (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {request.requesterName || request.requesterUsername || "Guest user"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatRequestedAgo(request.createdAt)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[11px]">
                    Pending
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No active requests right now. We'll let you know when someone knocks.
            </p>
          )}
        </PopoverContent>
      </Popover>

      {incomingRequest && (
        <div className="absolute top-full right-0 mt-2 w-64 rounded-xl border border-amber-400/50 bg-amber-500/10 backdrop-blur-md px-3 py-2 shadow-lg animate-in slide-in-from-top-2 fade-in-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-100">
            <Bell className="w-4 h-4" />
            {incomingRequest.name} wants to join
          </div>
        </div>
      )}
    </div>
  );
}
