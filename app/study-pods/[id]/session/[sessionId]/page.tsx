'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Editor, { Monaco } from '@monaco-editor/react';
import { io, Socket } from 'socket.io-client';
import { useTheme } from 'next-themes';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Play,
  Users,
  Loader2,
  ChevronLeft,
  Video,
  Monitor as MonitorIcon,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface Participant {
  id: string;
  user_id: string;
  cursor_color: string;
  cursor_position: any;
  is_active: boolean;
  user: {
    user_id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

interface SessionData {
  id: string;
  title: string;
  pod_id: string;
  host_user_id: string;
  status: string;
  session_type: string;
}

interface VideoParticipant {
  userId: string;
  username: string;
  stream?: MediaStream;
  peerConnection?: RTCPeerConnection;
  isSharingScreen?: boolean;
}

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', monacoLang: 'javascript' },
  { value: 'typescript', label: 'TypeScript', monacoLang: 'typescript' },
  { value: 'python', label: 'Python', monacoLang: 'python' },
  { value: 'java', label: 'Java', monacoLang: 'java' },
  { value: 'cpp', label: 'C++', monacoLang: 'cpp' },
  { value: 'c', label: 'C', monacoLang: 'c' },
  { value: 'go', label: 'Go', monacoLang: 'go' },
  { value: 'rust', label: 'Rust', monacoLang: 'rust' },
];

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function LiveSessionPage() {
  const params = useParams();
  const router = useRouter();
  const { theme } = useTheme();
  const supabase = createClient();

  const id = params.id as string;
  const sessionId = params.sessionId as string;

  // State
  const [session, setSession] = useState<SessionData | null>(null);
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('javascript');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [output, setOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // Video call state
  const [isInVideoCall, setIsInVideoCall] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [videoParticipants, setVideoParticipants] = useState<Map<string, VideoParticipant>>(new Map());

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const cursorDecorations = useRef<string[]>([]);

  // Initialize
  useEffect(() => {
    initializeSession();
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_session', sessionId);
        socketRef.current.disconnect();
      }
      cleanupMedia();
    };
  }, [sessionId]);

  const cleanupMedia = () => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
  };

  const initializeSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUser(user);

      // Fetch session details
      const response = await fetch(`/api/study-pods/${id}/sessions/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
      }

      // Fetch current code state
      const codeResponse = await fetch(`/api/study-pods/sessions/${sessionId}/code`);
      if (codeResponse.ok) {
        const codeData = await codeResponse.json();
        setCode(codeData.code || '');
        setLanguage(codeData.language || 'javascript');
      }

      // Initialize Socket.io
      initializeSocket(user.id);

      // Join session as participant
      await fetch(`/api/study-pods/sessions/${sessionId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cursorColor: getRandomColor()
        }),
      });

      fetchParticipants();
      setLoading(false);
    } catch (error) {
      console.error('Error initializing session:', error);
      toast.error('Failed to load session');
      setLoading(false);
    }
  };

  const initializeSocket = (userId: string) => {
    const socket = io({
      path: '/socket.io/',
      auth: { userId },
    });

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join_session', { sessionId, userData: { userId } });
      toast.success('Connected to session');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Session events
    socket.on('session_participants', fetchParticipants);
    socket.on('participant_joined', (data) => {
      toast.success(`${data.userData?.username || 'Someone'} joined`);
      fetchParticipants();
    });
    socket.on('participant_left', () => {
      fetchParticipants();
    });

    // Code sync
    socket.on('code_updated', (data) => {
      if (data.userId !== userId && editorRef.current) {
        const currentPosition = editorRef.current.getPosition();
        editorRef.current.setValue(data.code);
        if (currentPosition) editorRef.current.setPosition(currentPosition);
      }
    });

    socket.on('language_changed', (data) => {
      if (data.userId !== userId) {
        setLanguage(data.language);
        toast.info(`Language changed to ${data.language}`);
      }
    });

    // Cursor sync
    socket.on('cursor_moved', (data) => {
      if (data.userId !== userId) {
        updateRemoteCursor(data.userId, data.position, data.color, data.username);
      }
    });

    // Code execution
    socket.on('code_execution_result', (data) => {
      if (data.error) {
        setOutput(`Error:\n${data.error}`);
      } else {
        setOutput(data.output || 'No output');
      }
      setIsExecuting(false);
    });

    // Video call events
    socket.on('video_user_joined', handleVideoUserJoined);
    socket.on('video_user_left', handleVideoUserLeft);
    socket.on('webrtc_offer', handleWebRTCOffer);
    socket.on('webrtc_answer', handleWebRTCAnswer);
    socket.on('webrtc_ice_candidate', handleWebRTCIceCandidate);
    socket.on('screen_share_started', handleScreenShareStarted);
    socket.on('screen_share_stopped', handleScreenShareStopped);

    socketRef.current = socket;
  };

  const getRandomColor = () => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const fetchParticipants = async () => {
    try {
      const response = await fetch(`/api/study-pods/sessions/${sessionId}/participants`);
      if (response.ok) {
        const data = await response.json();
        setParticipants(data.participants || []);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const updateRemoteCursor = (userId: string, position: any, _color: string, username: string) => {
    if (!monacoRef.current || !editorRef.current || !position) return;

    const participant = participants.find(p => p.user_id === userId);
    if (!participant) return;

    // Create cursor decoration
    const decorations = editorRef.current.deltaDecorations(
      cursorDecorations.current,
      [
        {
          range: new monacoRef.current.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          ),
          options: {
            className: 'remote-cursor',
            glyphMarginClassName: 'remote-cursor-glyph',
            hoverMessage: { value: `**${username}** is here` },
            beforeContentClassName: 'remote-cursor-label',
            before: {
              content: username,
              inlineClassName: 'remote-cursor-name',
              inlineClassNameAffectsLetterSpacing: true,
            },
            stickiness: 1,
          },
        },
      ]
    );

    cursorDecorations.current = decorations;
  };

  const handleEditorChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);

    if (socketRef.current?.connected) {
      socketRef.current.emit('code_change', {
        sessionId,
        code: newCode,
        userId: currentUser?.id,
        timestamp: Date.now()
      });
    }

    // Debounced save
    saveCodeToDatabase(newCode);
  };

  const handleCursorChange = useCallback(() => {
    if (!editorRef.current || !socketRef.current?.connected) return;

    const position = editorRef.current.getPosition();
    if (position) {
      const participant = participants.find(p => p.user_id === currentUser?.id);
      socketRef.current.emit('cursor_move', {
        sessionId,
        userId: currentUser?.id,
        username: currentUser?.user_metadata?.full_name || 'Anonymous',
        position,
        color: participant?.cursor_color || '#10B981',
      });
    }
  }, [sessionId, currentUser, participants]);

  const debouncedSaveCode = useRef<NodeJS.Timeout | null>(null);
  const saveCodeToDatabase = (codeToSave: string) => {
    if (debouncedSaveCode.current) clearTimeout(debouncedSaveCode.current);
    debouncedSaveCode.current = setTimeout(async () => {
      try {
        await fetch(`/api/study-pods/sessions/${sessionId}/code`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: codeToSave, language }),
        });
      } catch (error) {
        console.error('Error saving code:', error);
      }
    }, 2000);
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    if (socketRef.current?.connected) {
      socketRef.current.emit('language_change', {
        sessionId,
        language: newLanguage,
        userId: currentUser?.id,
      });
    }
    fetch(`/api/study-pods/sessions/${sessionId}/code`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: newLanguage }),
    });
  };

  const handleRunCode = async () => {
    setIsExecuting(true);
    setOutput('Executing code...');

    try {
      const response = await fetch(`/api/study-pods/sessions/${sessionId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });

      if (response.ok) {
        const data = await response.json();
        const result = data.execution;
        setOutput(result.error ? `Error:\n${result.error}` : result.output || 'No output');
      } else {
        setOutput('Execution failed');
        toast.error('Failed to execute code');
      }
    } catch (error) {
      setOutput('Execution failed: Network error');
      toast.error('Failed to execute code');
    } finally {
      setIsExecuting(false);
    }
  };

  // Video call functions
  const joinVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled,
        audio: isAudioEnabled,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setIsInVideoCall(true);

      socketRef.current?.emit('video_join', {
        sessionId,
        userId: currentUser?.id,
        username: currentUser?.user_metadata?.full_name || 'Anonymous',
      });

      toast.success('Joined video call');
    } catch (error) {
      console.error('Error joining video call:', error);
      toast.error('Failed to access camera/microphone');
    }
  };

  const leaveVideoCall = () => {
    cleanupMedia();
    setIsInVideoCall(false);
    setVideoParticipants(new Map());

    socketRef.current?.emit('video_leave', {
      sessionId,
      userId: currentUser?.id,
    });

    toast.success('Left video call');
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
      screenStreamRef.current?.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);

      // Switch back to camera
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        peerConnectionsRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender && videoTrack) sender.replaceTrack(videoTrack);
        });
      }

      socketRef.current?.emit('screen_share_stop', { sessionId, userId: currentUser?.id });
      toast.success('Stopped screen sharing');
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);

        const videoTrack = screenStream.getVideoTracks()[0];
        peerConnectionsRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(videoTrack);
        });

        socketRef.current?.emit('screen_share_start', { sessionId, userId: currentUser?.id });
        toast.success('Screen sharing started');

        videoTrack.onended = () => toggleScreenShare();
      } catch (error) {
        toast.error('Failed to share screen');
      }
    }
  };

  // WebRTC handlers
  const handleVideoUserJoined = async (data: { userId: string; username: string }) => {
    if (data.userId === currentUser?.id) return;

    try {
      const pc = createPeerConnection(data.userId);

      // Add local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current?.emit('webrtc_offer', {
        sessionId,
        targetUserId: data.userId,
        offer: pc.localDescription,
      });

      setVideoParticipants(prev => new Map(prev).set(data.userId, {
        userId: data.userId,
        username: data.username,
        peerConnection: pc,
      }));
    } catch (error) {
      console.error('Error handling user joined:', error);
    }
  };

  const handleVideoUserLeft = (data: { userId: string }) => {
    const pc = peerConnectionsRef.current.get(data.userId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(data.userId);
    }

    setVideoParticipants(prev => {
      const updated = new Map(prev);
      updated.delete(data.userId);
      return updated;
    });
  };

  const handleWebRTCOffer = async (data: { fromUserId: string; offer: RTCSessionDescriptionInit }) => {
    try {
      const pc = createPeerConnection(data.fromUserId);
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

      // Add local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current?.emit('webrtc_answer', {
        sessionId,
        targetUserId: data.fromUserId,
        answer: pc.localDescription,
      });
    } catch (error) {
      console.error('Error handling WebRTC offer:', error);
    }
  };

  const handleWebRTCAnswer = async (data: { fromUserId: string; answer: RTCSessionDescriptionInit }) => {
    const pc = peerConnectionsRef.current.get(data.fromUserId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
  };

  const handleWebRTCIceCandidate = async (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
    const pc = peerConnectionsRef.current.get(data.fromUserId);
    if (pc && data.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  };

  const handleScreenShareStarted = (data: { userId: string }) => {
    setVideoParticipants(prev => {
      const updated = new Map(prev);
      const participant = updated.get(data.userId);
      if (participant) {
        participant.isSharingScreen = true;
        updated.set(data.userId, participant);
      }
      return updated;
    });
  };

  const handleScreenShareStopped = (data: { userId: string }) => {
    setVideoParticipants(prev => {
      const updated = new Map(prev);
      const participant = updated.get(data.userId);
      if (participant) {
        participant.isSharingScreen = false;
        updated.set(data.userId, participant);
      }
      return updated;
    });
  };

  const createPeerConnection = (userId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.ontrack = (event) => {
      setVideoParticipants(prev => {
        const updated = new Map(prev);
        const participant = updated.get(userId);
        if (participant) {
          participant.stream = event.streams[0];
          updated.set(userId, participant);
        }
        return updated;
      });
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('webrtc_ice_candidate', {
          sessionId,
          targetUserId: userId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        pc.close();
        peerConnectionsRef.current.delete(userId);
      }
    };

    peerConnectionsRef.current.set(userId, pc);
    return pc;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-sm font-medium text-gray-400">Loading session...</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-all duration-300",
      theme === 'light' ? 'bg-gradient-to-br from-gray-50 via-blue-50 to-emerald-50' : 'bg-zinc-950'
    )}>
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.1),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <header className={cn(
        "sticky top-0 z-50 backdrop-blur-xl border-b shadow-lg transition-all",
        theme === 'light' ? 'bg-white/90 border-gray-200/60' : 'bg-zinc-900/90 border-zinc-800/60'
      )}>
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/study-pods/${id}`)}
              className="group hover:bg-emerald-500/10 transition-all"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </Button>

            <div className="h-8 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent" />

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent truncate">
                {session?.title || 'Live Coding Session'}
              </h1>
            </div>

            {isConnected && (
              <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600 gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Live
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Active Participants */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md",
              theme === 'light' ? 'bg-white/80 border border-gray-200' : 'bg-white/5 border border-white/10'
            )}>
              <Users className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold">{participants.length}</span>
              <div className="flex -space-x-2">
                {participants.slice(0, 3).map(p => (
                  <Avatar key={p.id} className="w-6 h-6 border-2 border-white ring-2 ring-white/20">
                    <AvatarFallback className="text-xs" style={{ backgroundColor: p.cursor_color }}>
                      {p.user.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {participants.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-zinc-800 border-2 border-white flex items-center justify-center text-xs font-bold">
                    +{participants.length - 3}
                  </div>
                )}
              </div>
            </div>

            {/* Language Selector */}
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className={cn(
                "w-36 backdrop-blur-md border transition-all hover:scale-105",
                theme === 'light' ? 'bg-white/80 border-gray-200' : 'bg-white/5 border-white/10'
              )}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(lang => (
                  <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Video Call Button */}
            {!isInVideoCall ? (
              <Button
                onClick={joinVideoCall}
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <Video className="w-4 h-4 mr-2" />
                Join Call
              </Button>
            ) : (
              <Button
                onClick={leaveVideoCall}
                size="sm"
                variant="destructive"
                className="shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <PhoneOff className="w-4 h-4 mr-2" />
                Leave
              </Button>
            )}

            {/* Run Button */}
            <Button
              onClick={handleRunCode}
              disabled={isExecuting}
              size="sm"
              className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-cyan-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  Run Code
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        <PanelGroup direction="horizontal" className="relative z-10">
          {/* Sidebar - Participants & Video */}
          <Panel defaultSize={25} minSize={20} maxSize={35}>
            <div className={cn(
              "h-full overflow-y-auto backdrop-blur-2xl border-r p-6 space-y-6",
              theme === 'light' ? 'bg-white/80 border-gray-200' : 'bg-zinc-900/80 border-zinc-800'
            )}>
              {/* Participants List */}
              <div>
                <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  Active Members
                </h3>
                <div className="space-y-3">
                  {participants.map(p => (
                    <Card key={p.id} className={cn(
                      "p-4 backdrop-blur-md border transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer group",
                      theme === 'light' ? 'bg-white/70 border-gray-200/50 hover:bg-white' : 'bg-white/5 border-white/10 hover:bg-white/10'
                    )}>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="w-11 h-11 ring-2 ring-white/20">
                            <AvatarFallback className="text-base font-semibold" style={{ backgroundColor: p.cursor_color }}>
                              {p.user.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          {p.is_active && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{p.user.full_name}</p>
                          <p className="text-xs text-gray-500">@{p.user.username}</p>
                        </div>
                        {p.user_id === currentUser?.id && (
                          <Badge variant="secondary" className="text-xs font-semibold">You</Badge>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Video Participants */}
              {isInVideoCall && (
                <div>
                  <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
                      <Video className="w-5 h-5 text-white" />
                    </div>
                    In Call ({videoParticipants.size + 1})
                  </h3>
                  <div className="space-y-4">
                    {/* Local Video */}
                    <Card className={cn(
                      "relative overflow-hidden aspect-video backdrop-blur-xl border transition-all hover:scale-[1.02]",
                      theme === 'light' ? 'bg-gradient-to-br from-white/90 to-gray-100/90 border-gray-200' : 'bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 border-zinc-700'
                    )}>
                      <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      {!isVideoEnabled && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-cyan-500">
                          <Avatar className="w-16 h-16">
                            <AvatarFallback className="text-2xl">
                              {currentUser?.user_metadata?.full_name?.charAt(0) || 'Y'}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md font-medium">
                        You {isScreenSharing && '(Sharing)'}
                      </div>
                      {isScreenSharing && (
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-red-500 text-white">
                            <MonitorIcon className="w-3 h-3 mr-1" />
                            Sharing
                          </Badge>
                        </div>
                      )}
                    </Card>

                    {/* Remote Videos */}
                    {Array.from(videoParticipants.values()).map(participant => (
                      <Card key={participant.userId} className={cn(
                        "relative overflow-hidden aspect-video backdrop-blur-xl border transition-all hover:scale-[1.02]",
                        theme === 'light' ? 'bg-gradient-to-br from-white/90 to-gray-100/90 border-gray-200' : 'bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 border-zinc-700'
                      )}>
                        <video
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover"
                          ref={el => {
                            if (el && participant.stream) {
                              el.srcObject = participant.stream;
                            }
                          }}
                        />
                        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md font-medium">
                          {participant.username}
                        </div>
                        {participant.isSharingScreen && (
                          <div className="absolute top-2 left-2">
                            <Badge className="bg-red-500 text-white">
                              <MonitorIcon className="w-3 h-3 mr-1" />
                              Sharing
                            </Badge>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Video Controls */}
              {isInVideoCall && (
                <Card className={cn(
                  "p-5 backdrop-blur-xl border",
                  theme === 'light' ? 'bg-white/90 border-gray-200' : 'bg-zinc-800/90 border-zinc-700'
                )}>
                  <h4 className="text-sm font-semibold mb-4 text-gray-500 uppercase tracking-wide">Call Controls</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      onClick={toggleAudio}
                      size="sm"
                      variant={isAudioEnabled ? "default" : "destructive"}
                      className="w-full"
                    >
                      {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </Button>
                    <Button
                      onClick={toggleVideo}
                      size="sm"
                      variant={isVideoEnabled ? "default" : "destructive"}
                      className="w-full"
                    >
                      {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                    </Button>
                    <Button
                      onClick={toggleScreenShare}
                      size="sm"
                      variant={isScreenSharing ? "secondary" : "outline"}
                      className="w-full"
                    >
                      <MonitorIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </Panel>

          <PanelResizeHandle className={cn(
            "w-1 hover:w-2 transition-all relative group",
            theme === 'light' ? 'hover:bg-gray-300' : 'hover:bg-zinc-700'
          )}>
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 opacity-0 group-hover:opacity-100 bg-gradient-to-b from-emerald-500 to-cyan-500 transition-opacity" />
          </PanelResizeHandle>

          {/* Editor & Console */}
          <Panel defaultSize={75}>
            <PanelGroup direction="vertical">
              {/* Code Editor */}
              <Panel defaultSize={70} minSize={40}>
                <div className="h-full relative">
                  <Editor
                    height="100%"
                    language={LANGUAGES.find(l => l.value === language)?.monacoLang || 'javascript'}
                    value={code}
                    onChange={handleEditorChange}
                    theme={theme === 'light' ? 'light' : 'vs-dark'}
                    options={{
                      fontSize: 15,
                      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                      fontLigatures: true,
                      minimap: { enabled: true },
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      automaticLayout: true,
                      smoothScrolling: true,
                      cursorBlinking: 'smooth',
                      cursorSmoothCaretAnimation: 'on',
                      padding: { top: 20, bottom: 20 },
                      lineHeight: 26,
                      renderWhitespace: 'selection',
                      bracketPairColorization: { enabled: true },
                    }}
                    onMount={(editor, monaco) => {
                      editorRef.current = editor;
                      monacoRef.current = monaco;
                      editor.onDidChangeCursorPosition(handleCursorChange);
                    }}
                  />
                </div>
              </Panel>

              <PanelResizeHandle className={cn(
                "h-1 hover:h-2 transition-all relative group",
                theme === 'light' ? 'bg-gray-200 hover:bg-gray-300' : 'bg-zinc-800 hover:bg-zinc-700'
              )}>
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-emerald-500 to-cyan-500 transition-opacity" />
              </PanelResizeHandle>

              {/* Output Console */}
              <Panel defaultSize={30} minSize={25} maxSize={50}>
                <div className={cn(
                  "h-full px-6 py-5 overflow-y-auto backdrop-blur-2xl",
                  theme === 'light' ? 'bg-gray-50/95' : 'bg-zinc-950/95'
                )}>
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="outline" className={cn(
                      "font-bold uppercase tracking-wider gap-2 px-3 py-1.5",
                      theme === 'light' ? 'bg-gray-200/80 text-gray-700' : 'bg-white/10 text-gray-300'
                    )}>
                      <div className={cn(
                        "w-2.5 h-2.5 rounded-full",
                        isExecuting ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-500'
                      )} />
                      Console
                    </Badge>
                  </div>

                  <pre className={cn(
                    "font-mono text-sm whitespace-pre-wrap p-6 rounded-xl backdrop-blur-sm border transition-all min-h-[200px]",
                    theme === 'light' ? 'bg-white/80 border-gray-200 text-gray-900' : 'bg-white/5 border-white/10 text-gray-100',
                    output.includes('Error:') && 'border-red-500/30 bg-red-500/5'
                  )}>
                    {output || <span className="text-gray-500 italic">Run your code to see output here...</span>}
                  </pre>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>

      {/* Cursor styles */}
      <style jsx global>{`
        .remote-cursor {
          background-color: rgba(255, 255, 255, 0.2);
          border-left: 2px solid currentColor;
        }
        .remote-cursor-name {
          position: absolute;
          top: -20px;
          left: 0;
          padding: 2px 6px;
          background-color: currentColor;
          color: white;
          border-radius: 4px;
          font-size: 10px;
          white-space: nowrap;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
