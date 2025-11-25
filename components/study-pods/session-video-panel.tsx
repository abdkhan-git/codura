'use client';

import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, MonitorOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Participant {
  userId: string;
  username: string;
  stream?: MediaStream;
  peerConnection?: RTCPeerConnection;
}

interface SessionVideoPanelProps {
  sessionId: string;
  socket: Socket | null;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  theme?: string;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function SessionVideoPanel({
  sessionId,
  socket,
  currentUserId,
  isOpen,
  onClose,
  theme = 'light',
}: SessionVideoPanelProps) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  useEffect(() => {
    if (!isOpen) return;

    initializeMedia();
    setupSignalingListeners();

    return () => {
      cleanup();
    };
  }, [isOpen, socket]);

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Notify others that we joined
      socket?.emit('video_joined', {
        sessionId,
        userId: currentUserId,
      });
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast.error('Failed to access camera/microphone');
    }
  };

  const setupSignalingListeners = () => {
    if (!socket) return;

    socket.on('video_user_joined', async (data: { userId: string; username: string }) => {
      if (data.userId === currentUserId) return;

      console.log('User joined video:', data.userId);

      // Create peer connection for new user
      const pc = createPeerConnection(data.userId);

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('video_offer', {
        sessionId,
        from: currentUserId,
        to: data.userId,
        offer,
      });
    });

    socket.on('video_offer', async (data: { from: string; offer: RTCSessionDescriptionInit }) => {
      console.log('Received offer from:', data.from);

      const pc = createPeerConnection(data.from);
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('video_answer', {
        sessionId,
        from: currentUserId,
        to: data.from,
        answer,
      });
    });

    socket.on('video_answer', async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
      console.log('Received answer from:', data.from);

      const pc = peerConnectionsRef.current.get(data.from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    socket.on('video_ice_candidate', async (data: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnectionsRef.current.get(data.from);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    socket.on('video_user_left', (data: { userId: string }) => {
      console.log('User left video:', data.userId);
      removePeer(data.userId);
    });
  };

  const createPeerConnection = (userId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log('Received track from:', userId);
      const [stream] = event.streams;

      setParticipants(prev => {
        const newMap = new Map(prev);
        newMap.set(userId, {
          userId,
          username: userId,
          stream,
          peerConnection: pc,
        });
        return newMap;
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('video_ice_candidate', {
          sessionId,
          from: currentUserId,
          to: userId,
          candidate: event.candidate,
        });
      }
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      console.log('Connection state with', userId, ':', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        removePeer(userId);
      }
    };

    peerConnectionsRef.current.set(userId, pc);
    return pc;
  };

  const removePeer = (userId: string) => {
    const pc = peerConnectionsRef.current.get(userId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(userId);
    }

    setParticipants(prev => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }

      // Restore camera
      if (localStreamRef.current && localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      setIsScreenSharing(false);
    } else {
      // Start screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false,
        });

        screenStreamRef.current = screenStream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        // Replace video track in all peer connections
        const videoTrack = screenStream.getVideoTracks()[0];
        peerConnectionsRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });

        // Handle screen share stop
        videoTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
      } catch (error) {
        console.error('Error sharing screen:', error);
        toast.error('Failed to share screen');
      }
    }
  };

  const handleLeave = () => {
    socket?.emit('video_leave', {
      sessionId,
      userId: currentUserId,
    });
    cleanup();
    onClose();
  };

  const cleanup = () => {
    // Stop all tracks
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current?.getTracks().forEach(track => track.stop());

    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();

    setParticipants(new Map());
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center p-4",
      theme === 'light' ? 'bg-black/50' : 'bg-black/70'
    )}>
      <div className={cn(
        "w-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl",
        theme === 'light' ? 'bg-white' : 'bg-zinc-900'
      )}>
        {/* Header */}
        <div className={cn(
          "px-6 py-4 border-b flex items-center justify-between",
          theme === 'light' ? 'border-gray-200' : 'border-zinc-800'
        )}>
          <h3 className={cn(
            "text-lg font-semibold",
            theme === 'light' ? 'text-gray-900' : 'text-white'
          )}>
            Video Call
          </h3>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm",
              theme === 'light' ? 'text-gray-600' : 'text-gray-400'
            )}>
              {participants.size + 1} participant{participants.size !== 0 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Video Grid */}
        <div className="p-6">
          <div className={cn(
            "grid gap-4",
            participants.size === 0 ? 'grid-cols-1' :
            participants.size === 1 ? 'grid-cols-2' :
            participants.size <= 3 ? 'grid-cols-2' :
            'grid-cols-3'
          )}>
            {/* Local Video */}
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/60 rounded-full">
                <span className="text-white text-sm font-medium">You</span>
              </div>
              {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <VideoOff className="w-12 h-12 text-white/50" />
                </div>
              )}
            </div>

            {/* Remote Videos */}
            {Array.from(participants.values()).map(participant => (
              <RemoteVideo
                key={participant.userId}
                participant={participant}
                theme={theme}
              />
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className={cn(
          "px-6 py-4 border-t flex items-center justify-center gap-3",
          theme === 'light' ? 'border-gray-200' : 'border-zinc-800'
        )}>
          <Button
            variant={isAudioEnabled ? 'default' : 'destructive'}
            size="lg"
            onClick={toggleAudio}
            className="rounded-full w-14 h-14"
          >
            {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>

          <Button
            variant={isVideoEnabled ? 'default' : 'destructive'}
            size="lg"
            onClick={toggleVideo}
            className="rounded-full w-14 h-14"
          >
            {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>

          <Button
            variant={isScreenSharing ? 'secondary' : 'default'}
            size="lg"
            onClick={toggleScreenShare}
            className="rounded-full w-14 h-14"
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          </Button>

          <Button
            variant="destructive"
            size="lg"
            onClick={handleLeave}
            className="rounded-full w-14 h-14"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function RemoteVideo({ participant, theme }: { participant: Participant; theme: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/60 rounded-full">
        <span className="text-white text-sm font-medium">
          {participant.username}
        </span>
      </div>
    </div>
  );
}
