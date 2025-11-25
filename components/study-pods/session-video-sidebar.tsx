'use client';

import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Monitor,
  MonitorOff,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

interface Participant {
  userId: string;
  username: string;
  stream?: MediaStream;
  peerConnection?: RTCPeerConnection;
}

interface SessionVideoSidebarProps {
  sessionId: string;
  socket: Socket | null;
  currentUserId: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function SessionVideoSidebar({
  sessionId,
  socket,
  currentUserId,
  isCollapsed,
  onToggleCollapse,
}: SessionVideoSidebarProps) {
  const { theme } = useTheme();
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Initialize media stream
  useEffect(() => {
    if (!isInCall) return;

    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isVideoEnabled,
          audio: isAudioEnabled,
        });

        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Notify others that we joined the video call
        socket?.emit('video_joined', {
          sessionId,
          userId: currentUserId,
        });
      } catch (error) {
        console.error('Error accessing media devices:', error);
        toast.error('Failed to access camera/microphone');
      }
    };

    initializeMedia();

    return () => {
      localStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [isInCall, sessionId, socket, currentUserId]);

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  // Leave call
  const leaveCall = () => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current?.getTracks().forEach(track => track.stop());

    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();

    setIsInCall(false);
    setParticipants(new Map());

    socket?.emit('video_leave', { sessionId, userId: currentUserId });
    toast.success('Left video call');
  };

  // Toggle screen share
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
      toast.success('Stopped screen sharing');
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });

        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);
        toast.success('Screen sharing started');

        // Replace video track in peer connections
        const videoTrack = screenStream.getVideoTracks()[0];
        peerConnectionsRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });

        // Handle screen share stop
        videoTrack.onended = () => {
          setIsScreenSharing(false);
          // Switch back to camera
          if (localStreamRef.current) {
            const cameraTrack = localStreamRef.current.getVideoTracks()[0];
            peerConnectionsRef.current.forEach(pc => {
              const sender = pc.getSenders().find(s => s.track?.kind === 'video');
              if (sender && cameraTrack) {
                sender.replaceTrack(cameraTrack);
              }
            });
          }
        };
      } catch (error) {
        console.error('Error sharing screen:', error);
        toast.error('Failed to share screen');
      }
    }
  };

  // If collapsed, show minimal toggle button
  if (isCollapsed) {
    return (
      <div className={cn(
        "fixed right-0 top-20 z-40 flex flex-col gap-2 p-2",
        theme === 'light' ? 'bg-white border-l border-gray-200' : 'bg-zinc-900 border-l border-zinc-800'
      )}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="h-10 w-10 p-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {isInCall && (
          <div className="flex flex-col gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full mx-auto animate-pulse" />
            <span className="text-xs">{participants.size + 1}</span>
          </div>
        )}
      </div>
    );
  }

  // Full sidebar
  return (
    <div className={cn(
      "fixed right-0 top-16 bottom-0 w-80 z-40 flex flex-col border-l shadow-xl transition-all",
      theme === 'light' ? 'bg-white border-gray-200' : 'bg-zinc-900 border-zinc-800'
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between p-4 border-b",
        theme === 'light' ? 'border-gray-200' : 'border-zinc-800'
      )}>
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-emerald-500" />
          <h3 className={cn(
            "font-semibold",
            theme === 'light' ? 'text-gray-900' : 'text-white'
          )}>
            Video Call
          </h3>
          {isInCall && (
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              theme === 'light' ? 'bg-green-100 text-green-700' : 'bg-green-500/20 text-green-400'
            )}>
              {participants.size + 1} in call
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Video Grid */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!isInCall ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center mb-4",
              theme === 'light' ? 'bg-emerald-100' : 'bg-emerald-500/20'
            )}>
              <Video className="w-8 h-8 text-emerald-500" />
            </div>
            <h4 className={cn(
              "font-medium mb-2",
              theme === 'light' ? 'text-gray-900' : 'text-white'
            )}>
              Start Video Call
            </h4>
            <p className={cn(
              "text-sm mb-4",
              theme === 'light' ? 'text-gray-600' : 'text-gray-400'
            )}>
              Collaborate face-to-face with your pod members
            </p>
            <Button
              onClick={() => setIsInCall(true)}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
            >
              <Video className="w-4 h-4 mr-2" />
              Join Video Call
            </Button>
          </div>
        ) : (
          <>
            {/* Local Video */}
            <Card className={cn(
              "relative overflow-hidden aspect-video",
              theme === 'light' ? 'bg-gray-100' : 'bg-zinc-800'
            )}>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                You {isScreenSharing && '(Sharing)'}
              </div>
              {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-cyan-500">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="text-2xl">
                      {currentUserId.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </Card>

            {/* Participants */}
            {Array.from(participants.values()).map((participant) => (
              <Card
                key={participant.userId}
                className={cn(
                  "relative overflow-hidden aspect-video",
                  theme === 'light' ? 'bg-gray-100' : 'bg-zinc-800'
                )}
              >
                <video
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  ref={(el) => {
                    if (el && participant.stream) {
                      el.srcObject = participant.stream;
                    }
                  }}
                />
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  {participant.username}
                </div>
              </Card>
            ))}
          </>
        )}
      </div>

      {/* Controls */}
      {isInCall && (
        <div className={cn(
          "p-4 border-t",
          theme === 'light' ? 'border-gray-200 bg-gray-50' : 'border-zinc-800 bg-zinc-900/50'
        )}>
          <div className="flex items-center justify-center gap-2">
            <Button
              variant={isAudioEnabled ? "default" : "destructive"}
              size="sm"
              onClick={toggleAudio}
              className="flex-1"
            >
              {isAudioEnabled ? (
                <Mic className="w-4 h-4" />
              ) : (
                <MicOff className="w-4 h-4" />
              )}
            </Button>

            <Button
              variant={isVideoEnabled ? "default" : "destructive"}
              size="sm"
              onClick={toggleVideo}
              className="flex-1"
            >
              {isVideoEnabled ? (
                <Video className="w-4 h-4" />
              ) : (
                <VideoOff className="w-4 h-4" />
              )}
            </Button>

            <Button
              variant={isScreenSharing ? "secondary" : "outline"}
              size="sm"
              onClick={toggleScreenShare}
              className="flex-1"
            >
              {isScreenSharing ? (
                <MonitorOff className="w-4 h-4" />
              ) : (
                <Monitor className="w-4 h-4" />
              )}
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={leaveCall}
              className="flex-1"
            >
              <PhoneOff className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
