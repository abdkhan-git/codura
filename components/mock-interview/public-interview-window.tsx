"use client";

import React from "react";
import { Minus, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { usePublicInterview } from "@/contexts/public-interview-context";
import { VideoCallInterface } from "./video-call-interface";

interface PublicInterviewWindowProps {
  user: {
    name: string;
    email: string;
    avatar: string;
    user_id?: string;
  };
  onClose: () => void;
}

export function PublicInterviewWindow({ user, onClose }: PublicInterviewWindowProps) {
  const { activeSession, setActiveSession, isWindowOpen, setIsWindowOpen } = usePublicInterview();
  const [isMaximized, setIsMaximized] = React.useState(false);

  if (!activeSession || !isWindowOpen) {
    return null;
  }

  const handleEndInterview = async () => {
    // Delete the session if host
    if (activeSession.role === "host") {
      try {
        await fetch(`/api/mock-interview/public-sessions?sessionId=${activeSession.publicSessionId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Error deleting session:', error);
      }
    }

    // Clear the active session
    setActiveSession(null);
    setIsWindowOpen(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <Card
        className={cn(
          "flex flex-col border border-white/10 bg-gradient-to-br from-zinc-900/80 via-zinc-800/70 to-zinc-900/80 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] transition-all duration-300 overflow-hidden",
          isMaximized
            ? "w-full h-full max-w-full max-h-full rounded-none"
            : "w-full h-full max-w-[95vw] max-h-[90vh] rounded-2xl"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-zinc-900/50 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-3 h-3 rounded-full",
              activeSession.isConnected ? "bg-green-500" : "bg-red-500 animate-pulse"
            )} />
            <h3 className="font-semibold text-sm">
              {activeSession.role === "host" ? "Public Interview - Host" : "Public Interview"}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMaximized(!isMaximized)}
              className="h-8 w-8 p-0"
            >
              {isMaximized ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
            {activeSession.role === "host" && !activeSession.isConnected && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsWindowOpen(false)}
                className="h-8 w-8 p-0"
                title="Minimize window (only available when not connected)"
              >
                <Minus className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <VideoCallInterface
            key={activeSession.publicSessionId}
            sessionId={activeSession.sessionCode || ""}
            publicSessionId={activeSession.publicSessionId}
            user={user}
            isHost={activeSession.role === "host"}
            isPublicHost={activeSession.role === "host"}
            onLeave={handleEndInterview}
          />
        </div>
      </Card>
    </div>
  );
}
