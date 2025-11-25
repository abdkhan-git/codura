'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Loader2,
  Users,
  Eye,
  Play,
  Square,
  Pause,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LiveStreamPanelProps {
  sessionId: string;
  userId: string;
  isHost?: boolean;
  socket?: any;
}

type StreamType = 'screen' | 'camera' | 'both';
type StreamStatus = 'idle' | 'starting' | 'active' | 'paused' | 'stopping';

export function LiveStreamPanel({
  sessionId,
  userId,
  isHost = false,
  socket,
}: LiveStreamPanelProps) {
  const { theme } = useTheme();
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle');
  const [streamType, setStreamType] = useState<StreamType>('screen');
  const [viewerCount, setViewerCount] = useState(0);
  const [streamId, setStreamId] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Fetch stream status on mount
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
    socket.on('viewer_joined', handleViewerJoined);
    socket.on('viewer_left', handleViewerLeft);
    socket.on('viewer_count_updated', handleViewerCountUpdated);

    // WebRTC signaling
    socket.on('webrtc_offer', handleWebRTCOffer);
    socket.on('webrtc_answer', handleWebRTCAnswer);
    socket.on('webrtc_ice_candidate', handleWebRTCIceCandidate);

    return () => {
      socket.off('stream_started', handleStreamStarted);
      socket.off('stream_stopped', handleStreamStopped);
      socket.off('stream_paused', handleStreamPaused);
      socket.off('stream_resumed', handleStreamResumed);
      socket.off('viewer_joined', handleViewerJoined);
      socket.off('viewer_left', handleViewerLeft);
      socket.off('viewer_count_updated', handleViewerCountUpdated);
      socket.off('webrtc_offer', handleWebRTCOffer);
      socket.off('webrtc_answer', handleWebRTCAnswer);
      socket.off('webrtc_ice_candidate', handleWebRTCIceCandidate);
    };
  }, [socket]);

  const fetchStreamStatus = async () => {
    try {
      const response = await fetch(`/api/study-pods/sessions/${sessionId}/stream`);
      const data = await response.json();

      if (data.isStreaming && data.stream) {
        setStreamId(data.stream.id);
        setStreamStatus(data.stream.status === 'paused' ? 'paused' : 'active');
        setStreamType(data.stream.stream_type);
        setViewerCount(data.stream.viewer_count || 0);
      }
    } catch (error) {
      console.error('Error fetching stream status:', error);
    }
  };

  const startStream = async (type: StreamType) => {
    setStreamStatus('starting');
    setStreamType(type);

    try {
      // Get media streams
      let screenStream: MediaStream | null = null;
      let cameraStream: MediaStream | null = null;

      if (type === 'screen' || type === 'both') {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: true,
        });
        screenStreamRef.current = screenStream;
      }

      if (type === 'camera' || type === 'both') {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: type === 'camera',
        });
        cameraStreamRef.current = cameraStream;
      }

      // Display preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream || cameraStream;
      }

      // Start stream on backend
      const response = await fetch(`/api/study-pods/sessions/${sessionId}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamType: type }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start stream');
      }

      setStreamId(data.stream.id);
      setStreamStatus('active');
      toast.success('Stream started successfully!');

      // Notify via socket
      if (socket) {
        socket.emit('stream_started', {
          sessionId,
          streamId: data.stream.id,
          streamType: type,
          hostId: userId,
        });
      }
    } catch (error: any) {
      console.error('Error starting stream:', error);
      toast.error(error.message || 'Failed to start stream');
      setStreamStatus('idle');
      stopMediaStreams();
    }
  };

  const stopStream = async () => {
    setStreamStatus('stopping');

    try {
      const response = await fetch(`/api/study-pods/sessions/${sessionId}/stream`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to stop stream');
      }

      stopMediaStreams();
      closePeerConnections();

      setStreamStatus('idle');
      setStreamId(null);
      setViewerCount(0);
      toast.success('Stream stopped');

      // Notify via socket
      if (socket) {
        socket.emit('stream_stopped', {
          sessionId,
          streamId,
        });
      }
    } catch (error) {
      console.error('Error stopping stream:', error);
      toast.error('Failed to stop stream');
      setStreamStatus('active');
    }
  };

  const togglePauseStream = async () => {
    const newStatus = streamStatus === 'paused' ? 'active' : 'paused';

    try {
      const response = await fetch(`/api/study-pods/sessions/${sessionId}/stream`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update stream status');
      }

      setStreamStatus(newStatus);
      toast.success(newStatus === 'paused' ? 'Stream paused' : 'Stream resumed');

      // Notify via socket
      if (socket) {
        socket.emit(newStatus === 'paused' ? 'stream_paused' : 'stream_resumed', {
          sessionId,
          streamId,
        });
      }
    } catch (error) {
      console.error('Error toggling stream:', error);
      toast.error('Failed to update stream');
    }
  };

  const stopMediaStreams = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  };

  const closePeerConnections = () => {
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
  };

  // WebRTC handlers
  const handleWebRTCOffer = async (data: any) => {
    // Viewer sends offer to join stream
    const { viewerId, offer } = data;

    const pc = createPeerConnection(viewerId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    // Add tracks
    const stream = screenStreamRef.current || cameraStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Send answer back
    if (socket) {
      socket.emit('webrtc_answer', {
        sessionId,
        viewerId,
        answer: pc.localDescription,
      });
    }
  };

  const handleWebRTCAnswer = async (data: any) => {
    const { viewerId, answer } = data;
    const pc = peerConnectionsRef.current.get(viewerId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const handleWebRTCIceCandidate = async (data: any) => {
    const { viewerId, candidate } = data;
    const pc = peerConnectionsRef.current.get(viewerId);
    if (pc && candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const createPeerConnection = (viewerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc_ice_candidate', {
          sessionId,
          viewerId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        pc.close();
        peerConnectionsRef.current.delete(viewerId);
      }
    };

    peerConnectionsRef.current.set(viewerId, pc);
    return pc;
  };

  // Socket event handlers
  const handleStreamStarted = (data: any) => {
    if (data.hostId !== userId) {
      fetchStreamStatus();
    }
  };

  const handleStreamStopped = () => {
    fetchStreamStatus();
  };

  const handleStreamPaused = () => {
    if (streamStatus === 'active') {
      setStreamStatus('paused');
    }
  };

  const handleStreamResumed = () => {
    if (streamStatus === 'paused') {
      setStreamStatus('active');
    }
  };

  const handleViewerJoined = (data: any) => {
    setViewerCount(prev => prev + 1);
  };

  const handleViewerLeft = (data: any) => {
    setViewerCount(prev => Math.max(0, prev - 1));
  };

  const handleViewerCountUpdated = (data: any) => {
    setViewerCount(data.count);
  };

  if (!isHost) {
    return null;
  }

  return (
    <div
      className={cn(
        'p-4 rounded-lg border backdrop-blur-xl shadow-lg transition-all',
        theme === 'light'
          ? 'bg-white/80 border-gray-200/50'
          : 'bg-zinc-900/80 border-zinc-800/50'
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className={cn(
            'text-sm font-semibold flex items-center gap-2',
            theme === 'light' ? 'text-gray-900' : 'text-white'
          )}
        >
          <Video className="w-4 h-4 text-emerald-500" />
          Live Stream Controls
        </h3>

        {streamStatus === 'active' || streamStatus === 'paused' ? (
          <div className="flex items-center gap-2 text-sm">
            <Eye className="w-4 h-4 text-emerald-500" />
            <span
              className={cn(
                'font-medium',
                theme === 'light' ? 'text-gray-700' : 'text-gray-300'
              )}
            >
              {viewerCount} {viewerCount === 1 ? 'viewer' : 'viewers'}
            </span>
          </div>
        ) : null}
      </div>

      {/* Video Preview */}
      {(streamStatus === 'active' || streamStatus === 'paused') && (
        <div className="mb-4 rounded-lg overflow-hidden border border-white/10">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-auto max-h-48 object-contain bg-black"
          />
          <div className="absolute top-2 left-2">
            <div
              className={cn(
                'px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1',
                streamStatus === 'paused'
                  ? 'bg-yellow-500/90 text-white'
                  : 'bg-red-500/90 text-white'
              )}
            >
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              {streamStatus === 'paused' ? 'PAUSED' : 'LIVE'}
            </div>
          </div>
        </div>
      )}

      {/* Stream Controls */}
      <div className="space-y-3">
        {streamStatus === 'idle' ? (
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => startStream('screen')}
              disabled={streamStatus === 'starting'}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-lg"
            >
              {streamStatus === 'starting' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Monitor className="w-4 h-4 mr-2" />
              )}
              Share Screen
            </Button>

            <Button
              onClick={() => startStream('camera')}
              disabled={streamStatus === 'starting'}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg"
            >
              {streamStatus === 'starting' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Video className="w-4 h-4 mr-2" />
              )}
              Share Camera
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={togglePauseStream}
              variant="outline"
              className="flex-1"
              disabled={streamStatus === 'starting' || streamStatus === 'stopping'}
            >
              {streamStatus === 'paused' ? (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              )}
            </Button>

            <Button
              onClick={stopStream}
              variant="destructive"
              className="flex-1"
              disabled={streamStatus === 'stopping'}
            >
              {streamStatus === 'stopping' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Square className="w-4 h-4 mr-2" />
              )}
              Stop Stream
            </Button>
          </div>
        )}
      </div>

      {streamStatus !== 'idle' && (
        <p
          className={cn(
            'text-xs mt-3 text-center',
            theme === 'light' ? 'text-gray-600' : 'text-gray-400'
          )}
        >
          {streamStatus === 'paused'
            ? 'Stream is paused. Viewers see a "Paused" message.'
            : 'Your stream is live and visible to all participants.'}
        </p>
      )}
    </div>
  );
}
