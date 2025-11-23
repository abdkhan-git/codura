"use client";

import React from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card
        className={cn(
          "flex flex-col bg-background shadow-2xl transition-all duration-300",
          isMaximized
            ? "w-full h-full rounded-none"
            : "w-[95vw] h-[90vh] rounded-xl"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-3 h-3 rounded-full",
              activeSession.isConnected ? "bg-green-500" : "bg-red-500 animate-pulse"
            )} />
            <h3 className="font-semibold">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsWindowOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <VideoCallInterface
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
