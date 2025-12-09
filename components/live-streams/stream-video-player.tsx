"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Loader2, AlertCircle } from "lucide-react";
import { useLiveStreamViewer } from "@/hooks/use-live-stream-viewer";

interface StreamVideoPlayerProps {
  roomId: string;
  userId: string;
  userName: string;
  streamerName?: string;
}

export function StreamVideoPlayer({
  roomId,
  userId,
  userName,
  streamerName,
}: StreamVideoPlayerProps) {
  const { theme } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasJoinedRef = useRef(false);
  const {
    remoteStream,
    isConnected,
    joinStream,
    leaveStream,
  } = useLiveStreamViewer(roomId, userId, userName);

  useEffect(() => {
    if (roomId && userId && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      joinStream();
    }

    return () => {
      if (hasJoinedRef.current) {
        hasJoinedRef.current = false;
        leaveStream();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId]);

  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
      videoRef.current.play().catch((err) => {
        console.error("Error playing video:", err);
      });
    }
  }, [remoteStream]);

  if (!isConnected && !remoteStream) {
    return (
      <div className={cn(
        "w-full aspect-video flex items-center justify-center",
        theme === 'light' ? "bg-gray-100" : "bg-zinc-900"
      )}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          <p className={cn(
            "text-sm",
            theme === 'light' ? "text-gray-600" : "text-muted-foreground"
          )}>
            Connecting to stream...
          </p>
        </div>
      </div>
    );
  }

  if (!remoteStream) {
    return (
      <div className={cn(
        "w-full aspect-video flex items-center justify-center",
        theme === 'light' ? "bg-gray-100" : "bg-zinc-900"
      )}>
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className={cn(
            "text-sm",
            theme === 'light' ? "text-gray-600" : "text-muted-foreground"
          )}>
            Stream unavailable
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        className="w-full h-full object-contain"
        onLoadedMetadata={(e) => {
          const video = e.currentTarget;
          video.play().catch((err) => {
            console.error("Error playing video on metadata load:", err);
          });
        }}
      />
      {/* Live indicator overlay */}
      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/90 backdrop-blur-sm border border-red-400/50">
        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
        <span className="text-xs font-semibold text-white">LIVE</span>
      </div>
    </div>
  );
}

