"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Circle,
  Square,
  Home,
  Users,
  Settings,
  Info,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
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
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onLeave: () => void;
}

export function SessionNavbar({
  sessionId,
  isHost,
  isRecording,
  onStartRecording,
  onStopRecording,
  onLeave,
}: SessionNavbarProps) {
  const [copied, setCopied] = useState(false);
  const [showSessionInfo, setShowSessionInfo] = useState(false);

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    toast.success("Session ID copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRecordingToggle = () => {
    if (isRecording) {
      if (confirm("Stop recording? The recording will be downloaded.")) {
        onStopRecording();
      }
    } else {
      if (confirm("Start recording this session? Both participants will be notified.")) {
        onStartRecording();
      }
    }
  };

  return (
    <div className="bg-card/50 backdrop-blur-xl border-b border-border/20 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left Side - Session Info */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
          </Link>

          <div className="h-6 w-px bg-border/20" />

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium">Live Interview</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-xs"
              onClick={() => setShowSessionInfo(!showSessionInfo)}
            >
              <Info className="w-3.5 h-3.5" />
              Session Info
            </Button>
          </div>

          {/* Session Info Dropdown */}
          {showSessionInfo && (
            <div className="absolute top-full left-0 mt-2 bg-card border border-border/20 rounded-lg shadow-xl p-4 z-50 min-w-[300px]">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Session ID</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted px-2 py-1 rounded font-mono truncate">
                      {sessionId}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={copySessionId}
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Role</p>
                  <p className="text-sm font-medium">
                    {isHost ? "Host" : "Participant"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowSessionInfo(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Actions */}
        <div className="flex items-center gap-2">
          {/* Recording Control (Host Only) */}
          {isHost && (
            <>
              <Button
                variant={isRecording ? "destructive" : "default"}
                size="sm"
                onClick={handleRecordingToggle}
                className={cn(
                  "gap-2",
                  isRecording &&
                    "bg-red-500 hover:bg-red-600 animate-pulse-subtle"
                )}
              >
                {isRecording ? (
                  <>
                    <Square className="w-4 h-4 fill-white" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Circle className="w-4 h-4" />
                    Record
                  </>
                )}
              </Button>

              <div className="h-6 w-px bg-border/20" />
            </>
          )}

          {/* Invite Partner */}
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

          {/* More Options */}
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

              <DropdownMenuItem asChild>
                <Link href="/dashboard" className="w-full cursor-pointer">
                  <Home className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
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
        </div>
      </div>
    </div>
  );
}
