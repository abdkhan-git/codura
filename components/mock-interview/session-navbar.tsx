"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Users,
  Settings,
  Copy,
  Check,
  Clock,
  Bell,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PendingUser } from "./admission-modal";

interface SessionNavbarProps {
  sessionId: string;
  isHost: boolean;
  onLeave: () => void;
  isPublic?: boolean;
  timerEndMs?: number | null;
  timerRemainingMs?: number;
  formatMs?: (ms: number) => string;
  pendingUsers?: PendingUser[];
}

export function SessionNavbar({
  sessionId,
  isHost,
  onLeave,
  isPublic = false,
  timerEndMs,
  timerRemainingMs = 0,
  formatMs,
  pendingUsers = [],
}: SessionNavbarProps) {
  const [copied, setCopied] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationUser, setNotificationUser] = useState<PendingUser | null>(null);

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    toast.success("Session ID copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Show notification when a new user joins
  useEffect(() => {
    if (pendingUsers.length > 0 && isHost) {
      const latestUser = pendingUsers[pendingUsers.length - 1];
      setNotificationUser(latestUser);
      setShowNotification(true);

      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [pendingUsers.length, isHost]);

  return (
    <div className="bg-zinc-900/60 backdrop-blur-2xl border-b border-white/10 px-6 py-3 shadow-lg relative">
      <div className="flex items-center justify-between">
        {/* Left Side - Live Indicator & Timer */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium">Live Interview</span>
          </div>

          {/* Timer Display */}
          {timerEndMs && formatMs && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/60 border border-white/10">
              <Clock className="w-3.5 h-3.5 text-brand" />
              <span className="text-sm font-mono font-medium text-brand">
                {formatMs(timerRemainingMs)}
              </span>
            </div>
          )}
        </div>

        {/* Right Side - Actions */}
        <div className="flex items-center gap-2">
          {/* Pending Requests Indicator - Only show for hosts */}
          {isHost && pendingUsers.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-yellow-500/50 bg-yellow-500/10 hover:bg-yellow-500/20 relative"
                >
                  <div className="relative">
                    <Bell className="w-4 h-4 text-yellow-500 animate-pulse" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-yellow-500" />
                  </div>
                  <span className="text-yellow-500 font-medium">{pendingUsers.length}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Pending Requests
                </div>
                <DropdownMenuSeparator />
                {pendingUsers.map((user) => (
                  <DropdownMenuItem key={user.user_id} className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-brand" />
                    <span className="text-sm">{user.full_name || user.username}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Invite Partner - Hidden for non-host in public interviews */}
          {!(isPublic && !isHost) && (
            <Button
              variant="outline"
              size="sm"
              onClick={copySessionId}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Invite</span>
                </>
              )}
            </Button>
          )}

          {/* More Options - Hidden for non-host in public interviews */}
          {!(isPublic && !isHost) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={copySessionId}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Session ID
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={onLeave}
                  className="text-red-600 focus:text-red-600"
                >
                  Leave Interview
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Notification Dropdown - Shows when new user joins */}
      {showNotification && notificationUser && isHost && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="bg-zinc-900 border border-yellow-500/50 rounded-lg px-4 py-3 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                {notificationUser.full_name?.charAt(0) || notificationUser.username?.charAt(0) || "U"}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">
                  {notificationUser.full_name || notificationUser.username}
                </span>
                <span className="text-sm text-yellow-500">wants to join</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
