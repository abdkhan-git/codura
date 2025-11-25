'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Loader2,
  Eye,
  Play,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LiveStreamViewerProps {
  sessionId: string;
  userId: string;
  socket?: any;
}

interface StreamInfo {
  id: string;
  host_user_id: string;
  stream_type: string;
  status: string;
  viewer_count: number;
  host: {
    full_name: string;
    username: string;
    avatar_url?: string;
  };
}

export function LiveStreamViewer({
  sessionId,
  userId,
  socket,
}: LiveStreamViewerProps) {
  const { theme } = useTheme();
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch stream status
  useEffect(() => {
    fetchStreamStatus();
  }, [sessionId]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('stream_started', handleStreamStarted);
    socket.on('stream_stopped', handleStreamStopped);
    socket.on('stream_paused', handleStreamPaused);
    socket.on('stream_resumed', handleStreamResumed);
    socket.on('viewer_count_updated', handleViewerCountUpdated);

    // WebRTC signaling
    socket.on('webrtc_answer', handleWebRTCAnswer);
    socket.on('webrtc_ice_candidate', handleWebRTCIceCandidate);

    return () => {
      socket.off('stream_started', handleStreamStarted);
      socket.off('stream_stopped', handleStreamStopped);
      socket.off('stream_paused', handleStreamPaused);
      socket.off('stream_resumed', handleStreamResumed);
      socket.off('viewer_count_updated', handleViewerCountUpdated);
      socket.off('webrtc_answer', handleWebRTCAnswer);
      socket.off('webrtc_ice_candidate', handleWebRTCIceCandidate);
    };
  }, [socket]);

  // Join stream when available
  useEffect(() => {
    if (streamInfo && !isConnected && !isConnecting) {
      joinStream();
    }
  }, [streamInfo]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveStream();
      closePeerConnection();
      stopHeartbeat();
    };
  }, []);

  const fetchStreamStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/study-pods/sessions/${sessionId}/stream`);
      const data = await response.json();

      if (data.isStreaming && data.stream) {
        setStreamInfo(data.stream);
      } else {
        setStreamInfo(null);
      }
    } catch (error) {
      console.error('Error fetching stream status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const joinStream = async () => {
    if (!streamInfo) return;

    setIsConnecting(true);
    setConnectionError(null);

    try {
      // Register as viewer
      const response = await fetch(
        `/api/study-pods/sessions/${sessionId}/stream/viewer`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to join stream');
      }

      // Setup WebRTC connection
      await setupWebRTCConnection();

      // Start heartbeat
      startHeartbeat();

      setIsConnected(true);
      toast.success('Connected to stream');
    } catch (error: any) {
      console.error('Error joining stream:', error);
      setConnectionError(error.message || 'Failed to connect to stream');
      toast.error('Failed to connect to stream');
      setIsConnecting(false);
    }
  };

  const leaveStream = async () => {
    try {
      await fetch(`/api/study-pods/sessions/${sessionId}/stream/viewer`, {
        method: 'DELETE',
      });

      setIsConnected(false);
    } catch (error) {
      console.error('Error leaving stream:', error);
    }
  };

  const setupWebRTCConnection = async () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    pc.ontrack = (event) => {
      console.log('Received track:', event.track.kind);
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        setIsConnecting(false);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc_ice_candidate', {
          sessionId,
          hostId: streamInfo?.host_user_id,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);

      if (pc.connectionState === 'connected') {
        setIsConnecting(false);
        setConnectionError(null);
      } else if (pc.connectionState === 'disconnected') {
        setConnectionError('Disconnected from stream');
      } else if (pc.connectionState === 'failed') {
        setConnectionError('Connection failed');
        closePeerConnection();
      }
    };

    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Send offer to host
    if (socket) {
      socket.emit('webrtc_offer', {
        sessionId,
        viewerId: userId,
        offer: pc.localDescription,
      });
    }

    peerConnectionRef.current = pc;
  };

  const closePeerConnection = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startHeartbeat = () => {
    stopHeartbeat();
    heartbeatIntervalRef.current = setInterval(async () => {
      try {
        await fetch(`/api/study-pods/sessions/${sessionId}/stream/viewer`, {
          method: 'PATCH',
        });
      } catch (error) {
        console.error('Heartbeat failed:', error);
      }
    }, 20000); // Every 20 seconds
  };

  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Socket event handlers
  const handleStreamStarted = (data: any) => {
    fetchStreamStatus();
  };

  const handleStreamStopped = () => {
    setStreamInfo(null);
    setIsConnected(false);
    closePeerConnection();
    stopHeartbeat();
    toast.info('Stream has ended');
  };

  const handleStreamPaused = () => {
    if (streamInfo) {
      setStreamInfo({ ...streamInfo, status: 'paused' });
    }
  };

  const handleStreamResumed = () => {
    if (streamInfo) {
      setStreamInfo({ ...streamInfo, status: 'active' });
    }
  };

  const handleViewerCountUpdated = (data: any) => {
    if (streamInfo) {
      setStreamInfo({ ...streamInfo, viewer_count: data.count });
    }
  };

  const handleWebRTCAnswer = async (data: any) => {
    const { answer } = data;
    if (peerConnectionRef.current && answer) {
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    }
  };

  const handleWebRTCIceCandidate = async (data: any) => {
    const { candidate } = data;
    if (peerConnectionRef.current && candidate) {
      await peerConnectionRef.current.addIceCandidate(
        new RTCIceCandidate(candidate)
      );
    }
  };

  // Don't show anything while loading
  if (isLoading) {
    return null;
  }

  // No active stream
  if (!streamInfo) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'rounded-lg border backdrop-blur-xl shadow-lg overflow-hidden transition-all',
        theme === 'light'
          ? 'bg-white/80 border-gray-200/50'
          : 'bg-zinc-900/80 border-zinc-800/50'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'px-4 py-3 border-b flex items-center justify-between',
          theme === 'light' ? 'border-gray-200/50' : 'border-zinc-800/50'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
            {streamInfo.host.full_name?.charAt(0) || 'H'}
          </div>
          <div>
            <p
              className={cn(
                'text-sm font-semibold',
                theme === 'light' ? 'text-gray-900' : 'text-white'
              )}
            >
              {streamInfo.host.full_name}
            </p>
            <p
              className={cn(
                'text-xs',
                theme === 'light' ? 'text-gray-600' : 'text-gray-400'
              )}
            >
              @{streamInfo.host.username}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Eye className="w-4 h-4 text-emerald-500" />
            <span
              className={cn(
                'font-medium',
                theme === 'light' ? 'text-gray-700' : 'text-gray-300'
              )}
            >
              {streamInfo.viewer_count}
            </span>
          </div>

          <div
            className={cn(
              'px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1',
              streamInfo.status === 'paused'
                ? 'bg-yellow-500/90 text-white'
                : 'bg-red-500/90 text-white'
            )}
          >
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {streamInfo.status === 'paused' ? 'PAUSED' : 'LIVE'}
          </div>
        </div>
      </div>

      {/* Video Container */}
      <div className="relative bg-black aspect-video">
        {isConnecting ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
            <p className="text-white text-sm">Connecting to stream...</p>
          </div>
        ) : connectionError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <VideoOff className="w-12 h-12 text-red-500" />
            <div>
              <p className="text-white font-semibold mb-2">Connection Error</p>
              <p className="text-gray-400 text-sm mb-4">{connectionError}</p>
              <Button
                onClick={() => {
                  setConnectionError(null);
                  joinStream();
                }}
                size="sm"
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
              >
                <Play className="w-4 h-4 mr-2" />
                Retry Connection
              </Button>
            </div>
          </div>
        ) : streamInfo.status === 'paused' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Video className="w-12 h-12 text-yellow-500" />
            <p className="text-white text-sm">Stream is paused</p>
          </div>
        ) : null}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          className="w-full h-full object-contain"
        />

        {/* Video Controls Overlay */}
        {isConnected && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={toggleMute}
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </Button>

              <Button
                onClick={toggleFullscreen}
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5" />
                ) : (
                  <Maximize className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
