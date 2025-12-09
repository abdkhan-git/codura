"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Users,
  Settings,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface SessionNavbarProps {
  sessionId: string;
  isHost: boolean;
  onLeave: () => void;
  isPublic?: boolean;
}

export function SessionNavbar({
  sessionId,
  isHost,
  onLeave,
  isPublic = false,
}: SessionNavbarProps) {
  const [copied, setCopied] = useState(false);

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    toast.success("Session ID copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-zinc-900/60 backdrop-blur-2xl border-b border-white/10 px-6 py-3 shadow-lg">
      <div className="flex items-center justify-between">
        {/* Left Side - Live Indicator */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium">Live Interview</span>
        </div>

        {/* Right Side - Actions */}
        <div className="flex items-center gap-2">
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
    </div>
  );
}
