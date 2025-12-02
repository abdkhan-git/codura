'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card } from '@/components/ui/card';

// Icons
import {
  Play,
  Users,
  Loader2,
  ChevronLeft,
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  MonitorUp,
  MonitorOff,
  MessageSquare,
  Code2,
  Terminal,
  Send,
  CheckCircle2,
  Circle,
  Crown,
  Copy,
  Check,
  RotateCcw,
  Wifi,
  WifiOff,
} from 'lucide-react';

// Types
interface Participant {
  oduserId: string;
  odusername: string;
  fullName: string;
  avatarUrl?: string;
  cursorColor: string;
  isHost: boolean;
  isInCall: boolean;
  isTyping?: boolean;
}

interface SessionData {
  id: string;
  title: string;
  pod_id: string;
  host_user_id: string;
  status: string;
  session_type: string;
  current_code?: string;
  current_language?: string;
}

interface ChatMessage {
  id: string;
  oduserId: string;
  odusername: string;
  fullName: string;
  avatarUrl?: string;
  message: string;
  timestamp: Date;
}

interface RemoteStream {
  oduserId: string;
  fullName: string;
  stream: MediaStream;
}

// Remote Video Tile Component - handles audio properly with level indicator
const RemoteVideoTile = React.memo(function RemoteVideoTile({ stream, fullName }: { stream: MediaStream; fullName: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasAudio, setHasAudio] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamIdRef = useRef<string>('');
  const playPromiseRef = useRef<Promise<void> | null>(null);

  // Setup stream and audio
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    // Check if this is the same stream (avoid re-setting)
    if (streamIdRef.current === stream.id && video.srcObject === stream) {
      console.log('[RemoteVideo] Same stream already set, skipping re-setup');
      return;
    }
    streamIdRef.current = stream.id;

    console.log('[RemoteVideo] Setting up stream for:', fullName, 'id:', stream.id);

    // Check if stream has audio tracks
    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();
    console.log('[RemoteVideo] Tracks - Audio:', audioTracks.length, 'Video:', videoTracks.length);
    
    // Log audio track details
    audioTracks.forEach((track, i) => {
      console.log(`[RemoteVideo] Audio track ${i}:`, {
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        label: track.label,
      });
    });
    
    setHasAudio(audioTracks.length > 0);

    // Ensure all audio tracks are enabled
    audioTracks.forEach(track => {
      if (!track.enabled) {
        console.log('[RemoteVideo] Enabling audio track:', track.label);
        track.enabled = true;
      }
    });

    // Set srcObject - detach old one first if different
    if (video.srcObject && video.srcObject !== stream) {
      console.log('[RemoteVideo] Detaching old stream');
      video.srcObject = null;
    }
    
    // Set new stream
    video.srcObject = stream;
    
    // Configure video element for audio playback
    video.muted = false;
    video.volume = 1.0;
    video.autoplay = true;
    video.playsInline = true;

    // Setup audio level monitoring for remote stream
    if (audioTracks.length > 0 && !audioContextRef.current) {
      try {
        const audioContext = new AudioContext();
        
        // Resume audio context if suspended (required by browser policy)
        if (audioContext.state === 'suspended') {
          console.log('[RemoteVideo] AudioContext suspended, will resume on user interaction');
        }
        
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkLevel = () => {
          if (analyserRef.current && audioContextRef.current?.state === 'running') {
            analyserRef.current.getByteFrequencyData(dataArray);
            const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
            setAudioLevel(avg);
          }
          animationRef.current = requestAnimationFrame(checkLevel);
        };
        checkLevel();
      } catch (err) {
        console.log('[RemoteVideo] Could not setup audio monitoring:', err);
      }
    }

    // Try to play - with proper error handling
    const playVideo = async () => {
      if (!video || !video.srcObject) return;
      
      // Cancel any pending play promise
      if (playPromiseRef.current) {
        try {
          await playPromiseRef.current;
        } catch (e) {
          // Ignore errors from cancelled play
        }
      }
      
      // Small delay to let the stream stabilize
      await new Promise(resolve => setTimeout(resolve, 150));
      
      if (!video || !video.srcObject) return;
      
      try {
        // Resume audio context if suspended
        if (audioContextRef.current?.state === 'suspended') {
          console.log('[RemoteVideo] Resuming AudioContext...');
          await audioContextRef.current.resume();
        }
        
        playPromiseRef.current = video.play();
        await playPromiseRef.current;
        playPromiseRef.current = null;
        console.log('[RemoteVideo] ✅ Playing with audio for:', fullName);
      } catch (err: any) {
        playPromiseRef.current = null;
        console.error('[RemoteVideo] Play error:', err.name, err.message);
        
        if (err.name === 'AbortError') {
          // This is usually fine - just means a new play() was called
          console.log('[RemoteVideo] Play aborted (new play() called)');
          return;
        }
        
        if (err.name === 'NotAllowedError') {
          setAudioError(true);
          // Try muted first
          video.muted = true;
          try {
            playPromiseRef.current = video.play();
            await playPromiseRef.current;
            playPromiseRef.current = null;
            console.log('[RemoteVideo] Playing muted (autoplay blocked), click to unmute');
          } catch (e: any) {
            playPromiseRef.current = null;
            console.error('[RemoteVideo] Even muted play failed:', e);
          }
        }
      }
    };

    playVideo();

    // Listen for track changes
    const handleTrackAdded = (event: MediaStreamTrackEvent) => {
      console.log('[RemoteVideo] Track added:', event.track.kind);
      if (event.track.kind === 'audio') {
        event.track.enabled = true;
        setHasAudio(stream.getAudioTracks().length > 0);
      }
    };

    const handleTrackRemoved = (event: MediaStreamTrackEvent) => {
      console.log('[RemoteVideo] Track removed:', event.track.kind);
      if (event.track.kind === 'audio') {
        setHasAudio(stream.getAudioTracks().length > 0);
      }
    };

    stream.addEventListener('addtrack', handleTrackAdded);
    stream.addEventListener('removetrack', handleTrackRemoved);
    
    return () => {
      stream.removeEventListener('addtrack', handleTrackAdded);
      stream.removeEventListener('removetrack', handleTrackRemoved);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
      
      analyserRef.current = null;
      streamIdRef.current = '';
      
      // Clean up video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream, fullName]);

  // Handle click to enable audio (user interaction required for autoplay)
  const handleClick = async () => {
    const video = videoRef.current;
    if (!video || !stream) return;

    // Resume audio context if suspended
    if (audioContextRef.current?.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
        console.log('[RemoteVideo] AudioContext resumed on click');
      } catch (err) {
        console.error('[RemoteVideo] Failed to resume AudioContext:', err);
      }
    }

    // Unmute and play
    if (audioError || video.muted) {
      video.muted = false;
      video.volume = 1.0;
      
      // Ensure audio tracks are enabled
      stream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
      
      try {
        await video.play();
        setAudioError(false);
        console.log('[RemoteVideo] ✅ Unmuted and playing after click');
      } catch (e: any) {
        console.error('[RemoteVideo] Unmute/play failed:', e);
      }
    } else {
      // Just ensure it's playing
      try {
        await video.play();
      } catch (e) {
        console.error('[RemoteVideo] Play failed on click:', e);
      }
    }
  };

  return (
    <div 
      className={cn(
        "relative aspect-video rounded-lg overflow-hidden bg-zinc-900 border-2 cursor-pointer group transition-all duration-150",
        audioLevel > 15 && hasAudio && !audioError ? "border-emerald-500 shadow-lg shadow-emerald-500/20" : "border-zinc-800"
      )}
      onClick={handleClick}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded text-[9px] font-medium bg-black/70 text-white flex items-center gap-1.5">
        {fullName}
        {hasAudio && !audioError ? (
          <div className="flex items-center gap-0.5">
            <div className={cn("w-1 rounded-full bg-emerald-400 transition-all duration-75", audioLevel > 5 ? "h-2" : "h-1")} />
            <div className={cn("w-1 rounded-full bg-emerald-400 transition-all duration-75", audioLevel > 15 ? "h-3" : "h-1")} />
            <div className={cn("w-1 rounded-full bg-emerald-400 transition-all duration-75", audioLevel > 30 ? "h-2" : "h-1")} />
          </div>
        ) : audioError ? (
          <span className="text-amber-400 flex items-center gap-0.5">
            <MicOff className="h-2.5 w-2.5" />
            click
          </span>
        ) : null}
      </div>
      {audioError && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
          <div className="text-center space-y-2">
            <MicOff className="h-8 w-8 text-amber-400 mx-auto" />
            <p className="text-sm font-medium text-white">Audio Blocked</p>
            <p className="text-xs text-zinc-400">Click anywhere to enable</p>
          </div>
        </div>
      )}
      
      {/* Audio status indicator */}
      {hasAudio && !audioError && (
        <div className="absolute top-1.5 right-1.5">
          <div className={cn(
            "px-2 py-0.5 rounded text-[9px] font-medium flex items-center gap-1",
            audioLevel > 15 ? "bg-emerald-500/90 text-white" : "bg-zinc-800/90 text-zinc-300"
          )}>
            <Mic className="h-2.5 w-2.5" />
            {audioLevel > 15 ? 'Speaking' : 'Muted'}
          </div>
        </div>
      )}
    </div>
  );
});

// Language configurations
const LANGUAGES = [
  { value: 'python', label: 'Python', monacoId: 'python' },
  { value: 'javascript', label: 'JavaScript', monacoId: 'javascript' },
  { value: 'typescript', label: 'TypeScript', monacoId: 'typescript' },
  { value: 'java', label: 'Java', monacoId: 'java' },
  { value: 'cpp', label: 'C++', monacoId: 'cpp' },
  { value: 'go', label: 'Go', monacoId: 'go' },
  { value: 'rust', label: 'Rust', monacoId: 'rust' },
];

const DEFAULT_CODE: Record<string, string> = {
  python: `# Welcome to the live coding session!
# Write your solution below

def solution():
    print("Hello, World!")
    return True

# Test your solution
if __name__ == "__main__":
    result = solution()
    print(f"Result: {result}")
`,
  javascript: `// Welcome to the live coding session!
// Write your solution below

function solution() {
    console.log("Hello, World!");
    return true;
}

// Test your solution
const result = solution();
console.log("Result:", result);
`,
  typescript: `// Welcome to the live coding session!
// Write your solution below

function solution(): boolean {
    console.log("Hello, World!");
    return true;
}

// Test your solution
const result: boolean = solution();
console.log("Result:", result);
`,
  java: `// Welcome to the live coding session!
public class Main {
    public static void main(String[] args) {
        boolean result = solution();
        System.out.println("Result: " + result);
    }
    
    public static boolean solution() {
        System.out.println("Hello, World!");
        return true;
    }
}
`,
  cpp: `// Welcome to the live coding session!
#include <iostream>
using namespace std;

bool solution() {
    cout << "Hello, World!" << endl;
    return true;
}

int main() {
    bool result = solution();
    cout << "Result: " << result << endl;
    return 0;
}
`,
  go: `// Welcome to the live coding session!
package main

import "fmt"

func solution() bool {
    fmt.Println("Hello, World!")
    return true
}

func main() {
    result := solution()
    fmt.Printf("Result: %v\\n", result)
}
`,
  rust: `// Welcome to the live coding session!
fn solution() -> bool {
    println!("Hello, World!");
    true
}

fn main() {
    let result = solution();
    println!("Result: {}", result);
}
`,
};

const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
];

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
};

export default function LiveSessionPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const podId = params.id as string;
  const sessionId = params.sessionId as string;

  // Core State
  const [session, setSession] = useState<SessionData | null>(null);
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('python');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [myCursorColor] = useState(() => CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)]);

  // Attendance State
  const [hasMarkedAttendance, setHasMarkedAttendance] = useState(false);
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);

  // UI State
  const [activeTab, setActiveTab] = useState<string>('participants');
  const [copiedCode, setCopiedCode] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // Execution State
  const [output, setOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Video Call State
  const [isInCall, setIsInCall] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // Typing indicator
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  
  // Audio analyzer ref
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioAnimationRef = useRef<number | null>(null);

  // Refs
  const editorRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const isRemoteUpdate = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidate[]>>(new Map());
  const isInCallRef = useRef(false);
  const currentUserRef = useRef<any>(null);
  const currentUserProfileRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const isCleaningUpRef = useRef(false);

  // Initialize
  useEffect(() => {
    // Prevent double initialization (React Strict Mode)
    if (isInitializedRef.current) {
      console.log('[Init] Already initialized, skipping...');
      return;
    }
    isInitializedRef.current = true;
    isCleaningUpRef.current = false;
    
    initSession();
    
    return () => {
      isCleaningUpRef.current = true;
      cleanup();
      // Reset for potential remount
      isInitializedRef.current = false;
    };
  }, [sessionId]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Attach local stream to video element when it changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(e => console.log('Video play error:', e));
    }
  }, [localStream, isInCall]);

  // Keep refs in sync with state (for use in closures)
  useEffect(() => {
    isInCallRef.current = isInCall;
  }, [isInCall]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    currentUserProfileRef.current = currentUserProfile;
  }, [currentUserProfile]);

  const cleanup = () => {
    console.log('[Cleanup] Starting cleanup...');
    // Cleanup realtime channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    // Cleanup media
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => {
        t.stop();
        console.log('[Cleanup] Stopped track:', t.kind);
      });
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    // Cleanup peer connections
    peerConnectionsRef.current.forEach((pc, oduserId) => {
      console.log('[Cleanup] Closing peer connection for:', oduserId);
      pc.close();
    });
    peerConnectionsRef.current.clear();
    pendingCandidatesRef.current.clear();
  };

  const initSession = async () => {
    try {
      console.log('[Init] Starting session initialization...');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUser(user);
      console.log('[Init] Current user:', user.id);

      // Get user profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setCurrentUserProfile(profile);
      console.log('[Init] User profile:', profile?.username);

      // Fetch session
      const { data: sessionData } = await supabase
        .from('study_pod_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionData) {
        setSession(sessionData);
        setCode(sessionData.current_code || DEFAULT_CODE['python']);
        setLanguage(sessionData.current_language || 'python');
        console.log('[Init] Session loaded:', sessionData.title);
      }

      // Check attendance
      const { data: attendance } = await supabase
        .from('study_pod_session_attendance')
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .maybeSingle();

      setHasMarkedAttendance(!!attendance);
      console.log('[Init] Attendance status:', !!attendance);

      // Setup realtime channel
      await setupRealtimeChannel(user, profile, sessionData);

      setLoading(false);
    } catch (error) {
      console.error('[Init] Error:', error);
      toast.error('Failed to load session');
      setLoading(false);
    }
  };

  const setupRealtimeChannel = async (user: any, profile: any, sessionData: any) => {
    // Check if we're cleaning up
    if (isCleaningUpRef.current) {
      console.log('[Realtime] Cleanup in progress, skipping channel setup');
      return;
    }
    
    console.log('[Realtime] Setting up channel for session:', sessionId);
    
    // Clean up any existing channel first
    if (channelRef.current) {
      console.log('[Realtime] Removing existing channel before creating new one');
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    // Create a unique channel name
    const channelName = `live-session-${sessionId}`;
    
    const channel = supabase.channel(channelName, {
      config: { 
        presence: { key: user.id },
        broadcast: { self: false, ack: false } // Disable ack to prevent REST fallback
      },
    });

    // Presence sync - this fires when presence state changes
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      console.log('[Presence] Sync event, state:', state);
      
      const presenceParticipants: Participant[] = [];
      
      Object.entries(state).forEach(([oduserId, presences]: [string, any]) => {
        const presence = presences[0];
        if (presence) {
          presenceParticipants.push({
            oduserId,
            odusername: presence.username || 'unknown',
            fullName: presence.fullName || 'Unknown User',
            avatarUrl: presence.avatarUrl,
            cursorColor: presence.cursorColor || '#10B981',
            isHost: presence.isHost || false,
            isInCall: presence.isInCall || false,
            isTyping: presence.isTyping || false,
          });
        }
      });
      
      console.log('[Presence] Participants:', presenceParticipants.length);
      setParticipants(presenceParticipants);
    });

    // Presence join
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('[Presence] User joined:', key, newPresences);
      toast.success(`${newPresences[0]?.fullName || 'Someone'} joined the session`);
    });

    // Presence leave
    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('[Presence] User left:', key);
      toast.info(`${leftPresences[0]?.fullName || 'Someone'} left the session`);
      // Clean up their peer connection if they were in a call
      removeUserPeerConnection(key);
    });

    // Code sync via broadcast
    channel.on('broadcast', { event: 'code_sync' }, ({ payload }) => {
      console.log('[Broadcast] Code sync from:', payload.userId);
      if (payload.userId !== user.id) {
        isRemoteUpdate.current = true;
        setCode(payload.code);
        if (payload.language) {
          setLanguage(payload.language);
        }
        setTimeout(() => { isRemoteUpdate.current = false; }, 100);
      }
    });

    // Language change
    channel.on('broadcast', { event: 'language_change' }, ({ payload }) => {
      console.log('[Broadcast] Language change from:', payload.userId);
      if (payload.userId !== user.id) {
        setLanguage(payload.language);
        const langLabel = LANGUAGES.find(l => l.value === payload.language)?.label;
        toast.info(`Language changed to ${langLabel}`);
      }
    });

    // Chat messages
    channel.on('broadcast', { event: 'chat_message' }, ({ payload }) => {
      console.log('[Broadcast] Chat message from:', payload.userId);
      setChatMessages(prev => [...prev, {
        id: payload.id,
        oduserId: payload.userId,
        odusername: payload.username,
        fullName: payload.fullName,
        avatarUrl: payload.avatarUrl,
        message: payload.message,
        timestamp: new Date(payload.timestamp),
      }]);
    });

    // Typing indicator
    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.userId !== user.id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (payload.isTyping) {
            newSet.add(payload.userId);
      } else {
            newSet.delete(payload.userId);
          }
          return newSet;
        });
      }
    });

    // Code execution results (shared)
    channel.on('broadcast', { event: 'execution_result' }, ({ payload }) => {
      console.log('[Broadcast] Execution result from:', payload.userId);
      if (payload.userId !== user.id) {
        setOutput(payload.output);
        toast.info(`${payload.fullName} ran the code`);
      }
    });

    // WebRTC Signaling
    channel.on('broadcast', { event: 'webrtc_offer' }, async ({ payload }) => {
      console.log('[WebRTC] Received offer from:', payload.fromUserId, 'for:', payload.targetUserId);
      if (payload.targetUserId === user.id) {
        await handleWebRTCOffer(payload);
      }
    });

    channel.on('broadcast', { event: 'webrtc_answer' }, async ({ payload }) => {
      console.log('[WebRTC] Received answer from:', payload.fromUserId, 'for:', payload.targetUserId);
      if (payload.targetUserId === user.id) {
        await handleWebRTCAnswer(payload);
      }
    });

    channel.on('broadcast', { event: 'webrtc_ice' }, async ({ payload }) => {
      console.log('[WebRTC] Received ICE from:', payload.fromUserId);
      if (payload.targetUserId === user.id) {
        await handleWebRTCIce(payload);
      }
    });

    channel.on('broadcast', { event: 'user_joined_call' }, async ({ payload }) => {
      console.log('[WebRTC] User joined call:', payload.userId, 'I am in call:', isInCallRef.current);
      // Use ref to get current value instead of stale closure
      if (payload.userId !== user.id && isInCallRef.current && localStreamRef.current) {
        console.log('[WebRTC] Creating offer to new caller:', payload.userId);
        // Wait a bit for the other user to be ready
        setTimeout(async () => {
          await createOfferToUser(payload.userId, payload);
        }, 500);
      }
    });

    channel.on('broadcast', { event: 'user_left_call' }, ({ payload }) => {
      console.log('[WebRTC] User left call:', payload.userId);
      removeUserPeerConnection(payload.userId);
    });

    // Store channel ref before subscribing
    channelRef.current = channel;
    
    // Subscribe and track presence
    channel.subscribe(async (status) => {
      console.log('[Realtime] Channel status:', status);
      
      // Check if we're cleaning up
      if (isCleaningUpRef.current) {
        console.log('[Realtime] Cleanup in progress, ignoring status change');
        return;
      }
      
      if (status === 'SUBSCRIBED') {
        setRealtimeStatus('connected');
        
        // Track presence
        const presenceData = {
          oduserId: user.id,
          username: profile?.username || 'unknown',
          fullName: profile?.full_name || user.email?.split('@')[0] || 'User',
          avatarUrl: profile?.avatar_url,
          cursorColor: myCursorColor,
          isHost: sessionData?.host_user_id === user.id,
          isInCall: isInCallRef.current, // Use ref for current value
          isTyping: false,
          online_at: new Date().toISOString(),
        };
        
        console.log('[Presence] Tracking with data:', presenceData);
        const trackResult = await channel.track(presenceData);
        console.log('[Presence] Track result:', trackResult);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.log('[Realtime] Channel error/timeout:', status);
        setRealtimeStatus('disconnected');
        // Don't show error toast during cleanup
        if (!isCleaningUpRef.current) {
          toast.error('Connection lost. Attempting to reconnect...');
          // Try to reconnect after a delay
          setTimeout(async () => {
            if (!isCleaningUpRef.current && channelRef.current) {
              console.log('[Realtime] Attempting reconnect...');
              try {
                await supabase.removeChannel(channelRef.current);
                channelRef.current = null;
                // Re-setup if we have user info
                if (currentUserRef.current && currentUserProfileRef.current) {
                  await setupRealtimeChannel(currentUserRef.current, currentUserProfileRef.current, session);
                }
              } catch (err) {
                console.error('[Realtime] Reconnect failed:', err);
              }
            }
          }, 2000);
        }
      } else if (status === 'CLOSED') {
        console.log('[Realtime] Channel closed');
        setRealtimeStatus('disconnected');
      }
    });
  };

  // Safe broadcast helper - checks channel is connected
  const safeBroadcast = useCallback(async (event: string, payload: any) => {
    if (!channelRef.current) {
      console.warn('[Broadcast] No channel available for:', event);
      return false;
    }
    if (realtimeStatus !== 'connected') {
      console.warn('[Broadcast] Channel not connected, status:', realtimeStatus);
      return false;
    }
    try {
      await channelRef.current.send({
        type: 'broadcast',
        event,
        payload,
      });
      return true;
    } catch (err) {
      console.error('[Broadcast] Failed to send:', event, err);
      return false;
    }
  }, [realtimeStatus]);

  // Update presence when call status changes
  const updatePresence = useCallback(async (updates: Partial<{ isInCall: boolean; isTyping: boolean }>) => {
    if (channelRef.current && currentUser && currentUserProfile && realtimeStatus === 'connected') {
      const presenceData = {
        oduserId: currentUser.id,
        username: currentUserProfile?.username || 'unknown',
        fullName: currentUserProfile?.full_name || currentUser.email?.split('@')[0] || 'User',
        avatarUrl: currentUserProfile?.avatar_url,
        cursorColor: myCursorColor,
        isHost: session?.host_user_id === currentUser.id,
        isInCall: updates.isInCall ?? isInCall,
        isTyping: updates.isTyping ?? false,
        online_at: new Date().toISOString(),
      };
      
      await channelRef.current.track(presenceData);
    }
  }, [currentUser, currentUserProfile, myCursorColor, session, isInCall, realtimeStatus]);

  // Mark Attendance
  const markAttendance = async () => {
    if (hasMarkedAttendance || isMarkingAttendance) return;
    setIsMarkingAttendance(true);

    try {
      const res = await fetch(`/api/study-pods/sessions/${sessionId}/join`, {
        method: 'POST',
      });

      if (res.ok) {
        setHasMarkedAttendance(true);
        toast.success('Attendance marked! You can now code and chat.');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to mark attendance');
      }
      } catch (error) {
      toast.error('Failed to mark attendance');
    } finally {
      setIsMarkingAttendance(false);
    }
  };

  // Code Editor with typing indicator
  const handleCodeChange = useCallback((value: string | undefined) => {
    if (isRemoteUpdate.current) return;
    const newCode = value || '';
    setCode(newCode);

    // Broadcast typing indicator
    safeBroadcast('typing', { userId: currentUser?.id, isTyping: true });

    // Clear typing after delay
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      safeBroadcast('typing', { userId: currentUser?.id, isTyping: false });
    }, 1000);

    // Broadcast code to others
    safeBroadcast('code_sync', { code: newCode, language, userId: currentUser?.id });

    // Save to DB (debounced)
    debouncedSave(newCode);
  }, [currentUser, language, safeBroadcast]);

  const debouncedSave = (codeToSave: string) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await supabase
        .from('study_pod_sessions')
        .update({ current_code: codeToSave, current_language: language })
        .eq('id', sessionId);
    }, 2000);
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    
    // Broadcast
    safeBroadcast('language_change', { language: newLang, userId: currentUser?.id });

    // Save
    supabase
      .from('study_pod_sessions')
      .update({ current_language: newLang })
      .eq('id', sessionId);
  };

  // Run Code
  const runCode = async () => {
    if (!hasMarkedAttendance) {
      toast.error('Mark attendance first');
      return;
    }

    setIsExecuting(true);
    setOutput('⏳ Running...\n');

    try {
      const res = await fetch(`/api/study-pods/sessions/${sessionId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });

      const data = await res.json();
      let outputText = '';
      
      if (data.execution) {
        if (data.execution.error) {
          outputText = `❌ Error:\n${data.execution.error}`;
      } else {
          outputText = `✅ Output:\n${data.execution.output || '(no output)'}`;
        }
      } else {
        outputText = '❌ Execution failed';
      }

      setOutput(outputText);

      // Broadcast execution result
      safeBroadcast('execution_result', {
        output: outputText,
        userId: currentUser?.id,
        fullName: currentUserProfile?.full_name || 'User',
      });
    } catch {
      setOutput('❌ Network error - please try again');
    } finally {
      setIsExecuting(false);
    }
  };

  // Chat
  const sendMessage = () => {
    if (!chatInput.trim() || !hasMarkedAttendance) return;

    const msg = {
      id: crypto.randomUUID(),
      userId: currentUser?.id,
      username: currentUserProfile?.username || 'unknown',
      fullName: currentUserProfile?.full_name || 'User',
      avatarUrl: currentUserProfile?.avatar_url,
      message: chatInput.trim(),
      timestamp: new Date().toISOString(),
    };

    safeBroadcast('chat_message', msg);

    // Add to local state immediately
    setChatMessages(prev => [...prev, {
      ...msg,
      oduserId: msg.userId,
      odusername: msg.username,
      timestamp: new Date(msg.timestamp),
    }]);

    setChatInput('');
  };

  // Video Call Functions
  const joinCall = async () => {
    if (!hasMarkedAttendance) {
      toast.error('Mark attendance first');
      return;
    }

    try {
      console.log('[Video] Requesting media devices...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true
        },
      });

      console.log('[Video] Got local stream:', stream.getTracks().map(t => `${t.kind}: ${t.label}`));

      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsInCall(true);
      setIsVideoEnabled(true);
      setIsAudioEnabled(true);

      // Setup audio level monitoring
      try {
        const audioContext = new AudioContext();
        
        // Resume audio context immediately (user interaction from button click)
        if (audioContext.state === 'suspended') {
          console.log('[Video] Resuming AudioContext...');
          await audioContext.resume();
        }
        
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        
        // Start monitoring audio levels
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkAudioLevel = () => {
          if (analyserRef.current && isAudioEnabled && audioContextRef.current?.state === 'running') {
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            setAudioLevel(average);
          }
          audioAnimationRef.current = requestAnimationFrame(checkAudioLevel);
        };
        checkAudioLevel();
        console.log('[Video] Audio level monitoring started, context state:', audioContext.state);
      } catch (err) {
        console.log('[Video] Could not setup audio monitoring:', err);
      }
      
      // Ensure all audio tracks are enabled
      stream.getAudioTracks().forEach(track => {
        if (!track.enabled) {
          console.log('[Video] Enabling audio track:', track.label);
          track.enabled = true;
        }
        console.log('[Video] Audio track state:', {
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
        });
      });

      // Update presence
      await updatePresence({ isInCall: true });

      // Announce to others
      await safeBroadcast('user_joined_call', {
        userId: currentUser?.id,
        username: currentUserProfile?.username,
        fullName: currentUserProfile?.full_name,
        avatarUrl: currentUserProfile?.avatar_url,
      });

      toast.success('Joined video call');

      // Wait a moment for presence to update, then check for other callers
      setTimeout(async () => {
        // Re-check participants after presence has synced
        const currentParticipants = channelRef.current?.presenceState() || {};
        console.log('[Video] Current presence state:', currentParticipants);
        
        const participantsInCall: { userId: string; fullName: string; avatarUrl?: string }[] = [];
        
        Object.entries(currentParticipants).forEach(([userId, presences]: [string, any]) => {
          const presence = presences[0];
          if (presence && presence.isInCall && userId !== currentUser?.id) {
            participantsInCall.push({
              userId,
              fullName: presence.fullName || 'User',
              avatarUrl: presence.avatarUrl,
            });
          }
        });
        
        console.log('[Video] Participants already in call:', participantsInCall.length, participantsInCall);
        
        for (const participant of participantsInCall) {
          console.log('[Video] Creating offer to:', participant.userId);
          await createOfferToUser(participant.userId, {
            fullName: participant.fullName,
            avatarUrl: participant.avatarUrl,
          });
        }
      }, 1000);
    } catch (err: any) {
      console.error('[Video] Media error:', err);
      if (err.name === 'NotAllowedError') {
        toast.error('Camera/microphone permission denied. Please allow access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        toast.error('No camera or microphone found.');
      } else {
        toast.error('Could not access camera/microphone: ' + err.message);
      }
    }
  };

  const leaveCall = async () => {
    console.log('[Video] Leaving call...');
    
    // Stop audio monitoring
    if (audioAnimationRef.current) {
      cancelAnimationFrame(audioAnimationRef.current);
      audioAnimationRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
    
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => {
        t.stop();
        console.log('[Video] Stopped track:', t.kind);
      });
      localStreamRef.current = null;
    }
    
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    
    // Close all peer connections
    peerConnectionsRef.current.forEach((pc, oduserId) => {
      console.log('[Video] Closing connection to:', oduserId);
      pc.close();
    });
    peerConnectionsRef.current.clear();
    pendingCandidatesRef.current.clear();
    
    setIsInCall(false);
    setLocalStream(null);
    setRemoteStreams([]);
    setIsScreenSharing(false);

    // Update presence
    await updatePresence({ isInCall: false });

    // Announce to others
    await safeBroadcast('user_left_call', { userId: currentUser?.id });

    toast.success('Left video call');
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log('[Video] Video enabled:', videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log('[Video] Audio enabled:', audioTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen share
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      }
      setIsScreenSharing(false);

      // Replace with camera track
      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (videoTrack) {
        peerConnectionsRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(videoTrack);
        });
      }
    } else {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screen;
        setIsScreenSharing(true);

        const screenTrack = screen.getVideoTracks()[0];
        
        // Replace video track in all peer connections
        peerConnectionsRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        screenTrack.onended = () => {
          setIsScreenSharing(false);
          screenStreamRef.current = null;
          const videoTrack = localStreamRef.current?.getVideoTracks()[0];
          if (videoTrack) {
            peerConnectionsRef.current.forEach(pc => {
              const sender = pc.getSenders().find(s => s.track?.kind === 'video');
              if (sender) sender.replaceTrack(videoTrack);
            });
          }
        };
      } catch (err) {
        console.log('[Video] Screen share cancelled');
      }
    }
  };

  // WebRTC Functions
  const createPeerConnection = (remoteUserId: string): RTCPeerConnection => {
    console.log('[WebRTC] Creating peer connection for:', remoteUserId);
    
    const pc = new RTCPeerConnection(ICE_SERVERS);

      // Add local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          console.log('[WebRTC] Adding local track:', {
            kind: track.kind,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
            label: track.label,
          });
          pc.addTrack(track, localStreamRef.current!);
        });
      } else {
        console.warn('[WebRTC] No local stream available when creating peer connection!');
      }

    // Handle remote tracks
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind, 'from:', remoteUserId);
      console.log('[WebRTC] Track details:', {
        kind: event.track.kind,
        enabled: event.track.enabled,
        muted: event.track.muted,
        readyState: event.track.readyState,
        label: event.track.label,
      });
      
      const [remoteStream] = event.streams;
      
      // Log all tracks in the stream
      console.log('[WebRTC] Stream tracks:', remoteStream.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState,
      })));
      
      setRemoteStreams(prev => {
        const existing = prev.find(s => s.oduserId === remoteUserId);
        if (existing) {
          return prev.map(s => s.oduserId === remoteUserId ? { ...s, stream: remoteStream } : s);
        }
        const participant = participants.find(p => p.oduserId === remoteUserId);
        return [...prev, {
          oduserId: remoteUserId,
          fullName: participant?.fullName || 'User',
          stream: remoteStream,
        }];
      });
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WebRTC] Sending ICE candidate to:', remoteUserId);
        safeBroadcast('webrtc_ice', {
          targetUserId: remoteUserId,
          fromUserId: currentUserRef.current?.id,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE state for', remoteUserId, ':', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected') {
        console.log('[WebRTC] ✅ Connected to:', remoteUserId);
      }
      if (pc.iceConnectionState === 'failed') {
        console.log('[WebRTC] ICE failed, restarting...');
        pc.restartIce();
      }
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'closed') {
        removeUserPeerConnection(remoteUserId);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state for', remoteUserId, ':', pc.connectionState);
      if (pc.connectionState === 'connected') {
        console.log('[WebRTC] ✅ Peer connection established with:', remoteUserId);
      }
    };
    
    pc.onnegotiationneeded = () => {
      console.log('[WebRTC] Negotiation needed for:', remoteUserId);
    };

    peerConnectionsRef.current.set(remoteUserId, pc);
    return pc;
  };

  const createOfferToUser = async (targetUserId: string, userData: any) => {
    console.log('[WebRTC] Creating offer to:', targetUserId);
    
    // Don't create duplicate connections
    if (peerConnectionsRef.current.has(targetUserId)) {
      console.log('[WebRTC] Connection already exists for:', targetUserId);
      return;
    }
    
    const pc = createPeerConnection(targetUserId);
    
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      console.log('[WebRTC] Created and set local offer');

      await safeBroadcast('webrtc_offer', {
        targetUserId,
        fromUserId: currentUserRef.current?.id,
        offer: pc.localDescription?.toJSON(),
        userData: {
          username: currentUserProfileRef.current?.username,
          fullName: currentUserProfileRef.current?.full_name,
          avatarUrl: currentUserProfileRef.current?.avatar_url,
        },
      });
    } catch (err) {
      console.error('[WebRTC] Error creating offer:', err);
    }
  };

  const handleWebRTCOffer = async (payload: any) => {
    console.log('[WebRTC] Handling offer from:', payload.fromUserId);
    
    // Make sure we're in a call and have local stream
    if (!isInCallRef.current) {
      console.log('[WebRTC] Not in call, ignoring offer');
      return;
    }
    
    // Wait for local stream if not ready
    if (!localStreamRef.current) {
      console.log('[WebRTC] Waiting for local stream...');
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!localStreamRef.current) {
        console.log('[WebRTC] Still no local stream, ignoring offer');
        return;
      }
    }
    
    // Close existing connection if any
    if (peerConnectionsRef.current.has(payload.fromUserId)) {
      console.log('[WebRTC] Closing existing connection to:', payload.fromUserId);
      peerConnectionsRef.current.get(payload.fromUserId)?.close();
      peerConnectionsRef.current.delete(payload.fromUserId);
    }
    
    const pc = createPeerConnection(payload.fromUserId);
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
      console.log('[WebRTC] Set remote description (offer)');
      
      // Apply any pending ICE candidates
      const pendingCandidates = pendingCandidatesRef.current.get(payload.fromUserId) || [];
      for (const candidate of pendingCandidates) {
        await pc.addIceCandidate(candidate);
      }
      pendingCandidatesRef.current.delete(payload.fromUserId);
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('[WebRTC] Created and set local answer');

      await safeBroadcast('webrtc_answer', {
        targetUserId: payload.fromUserId,
        fromUserId: currentUserRef.current?.id,
        answer: pc.localDescription?.toJSON(),
      });
    } catch (err) {
      console.error('[WebRTC] Error handling offer:', err);
    }
  };

  const handleWebRTCAnswer = async (payload: any) => {
    console.log('[WebRTC] Handling answer from:', payload.fromUserId);
    const pc = peerConnectionsRef.current.get(payload.fromUserId);
    
    if (pc && pc.signalingState === 'have-local-offer') {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
        console.log('[WebRTC] Set remote description (answer)');
        
        // Apply any pending ICE candidates
        const pendingCandidates = pendingCandidatesRef.current.get(payload.fromUserId) || [];
        for (const candidate of pendingCandidates) {
          await pc.addIceCandidate(candidate);
        }
        pendingCandidatesRef.current.delete(payload.fromUserId);
      } catch (err) {
        console.error('[WebRTC] Error setting answer:', err);
      }
    } else {
      console.log('[WebRTC] Cannot set answer, state:', pc?.signalingState);
    }
  };

  const handleWebRTCIce = async (payload: any) => {
    console.log('[WebRTC] Handling ICE from:', payload.fromUserId);
    const pc = peerConnectionsRef.current.get(payload.fromUserId);
    
    if (pc && payload.candidate) {
      try {
        const candidate = new RTCIceCandidate(payload.candidate);
        
        if (pc.remoteDescription) {
          await pc.addIceCandidate(candidate);
          console.log('[WebRTC] Added ICE candidate');
        } else {
          // Queue the candidate
          const pending = pendingCandidatesRef.current.get(payload.fromUserId) || [];
          pending.push(candidate);
          pendingCandidatesRef.current.set(payload.fromUserId, pending);
          console.log('[WebRTC] Queued ICE candidate (no remote description yet)');
        }
      } catch (err) {
        console.error('[WebRTC] Error adding ICE candidate:', err);
      }
    }
  };

  const removeUserPeerConnection = (oduserId: string) => {
    console.log('[WebRTC] Removing peer connection for:', oduserId);
    const pc = peerConnectionsRef.current.get(oduserId);
    if (pc) {
        pc.close();
      peerConnectionsRef.current.delete(oduserId);
    }
    pendingCandidatesRef.current.delete(oduserId);
    setRemoteStreams(prev => prev.filter(s => s.oduserId !== oduserId));
  };

  // Render Avatar
  const renderAvatar = (user: { avatarUrl?: string; fullName?: string; username?: string }, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizes = { sm: 'h-7 w-7 text-[10px]', md: 'h-9 w-9 text-xs', lg: 'h-12 w-12 text-sm' };
    return (
      <Avatar className={cn(sizes[size], "ring-2 ring-background")}>
        {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
        <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold">
          {(user.fullName || user.username || 'U').slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    );
  };

  // Get typing users names
  const typingUsersNames = participants
    .filter(p => typingUsers.has(p.oduserId) && p.oduserId !== currentUser?.id)
    .map(p => p.fullName.split(' ')[0]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-[#09090b]">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full blur-xl opacity-30 animate-pulse" />
          <Loader2 className="w-12 h-12 animate-spin text-amber-500 relative" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-white">Loading Session</p>
          <p className="text-sm text-zinc-500">Connecting to live environment...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-[#09090b] overflow-hidden">
      {/* Header */}
        <header className="h-14 px-4 flex items-center justify-between border-b border-zinc-800/50 bg-[#09090b]/95 backdrop-blur-xl">
          {/* Left */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon" 
              onClick={() => router.push(`/study-pods/${podId}`)}
              className="h-8 w-8 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20">
                <Code2 className="h-4 w-4 text-amber-500" />
            </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-semibold text-white">{session?.title || 'Live Session'}</h1>
                  <Badge className="h-5 px-1.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border-0 gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
              </Badge>
                </div>
                <p className="text-[11px] text-zinc-500">{session?.session_type || 'Study Session'}</p>
              </div>
            </div>
          </div>

          {/* Center - Participants + Connection Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {realtimeStatus === 'connected' ? (
                <Wifi className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-red-400" />
              )}
              <span className="text-[11px] text-zinc-500">{realtimeStatus}</span>
          </div>

            <div className="h-4 w-px bg-zinc-800" />
            
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {participants.slice(0, 4).map((p) => (
                  <Tooltip key={p.oduserId}>
                    <TooltipTrigger>
                      <div className="relative">
                        <Avatar className="h-7 w-7 border-2 border-[#09090b]">
                          {p.avatarUrl && <AvatarImage src={p.avatarUrl} />}
                          <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-[9px] font-bold">
                            {p.fullName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                        {p.isInCall && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#09090b]" />
                        )}
                        {p.isTyping && (
                          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-400 border-2 border-[#09090b] animate-pulse" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-zinc-900 border-zinc-800">
                      <p className="font-medium text-xs">{p.fullName}</p>
                      <p className="text-[10px] text-zinc-400">@{p.odusername}</p>
                      {p.isTyping && <p className="text-[10px] text-blue-400">Typing...</p>}
                    </TooltipContent>
                  </Tooltip>
                ))}
                  </div>
              <span className="text-xs text-zinc-400 font-medium">{participants.length} online</span>
              </div>
            </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-2">
            {/* Attendance */}
            <Button
              size="sm"
              onClick={markAttendance}
              disabled={hasMarkedAttendance || isMarkingAttendance}
              className={cn(
                "h-8 text-xs gap-1.5 font-medium rounded-lg",
                hasMarkedAttendance
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 cursor-default"
                  : "bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-600 hover:to-orange-600"
              )}
            >
              {isMarkingAttendance ? <Loader2 className="h-3 w-3 animate-spin" /> :
               hasMarkedAttendance ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
              {hasMarkedAttendance ? 'Attended' : 'Mark Attendance'}
            </Button>

            <div className="h-5 w-px bg-zinc-800" />

            {/* Video Controls */}
            {!isInCall ? (
              <Button
                size="sm"
                onClick={joinCall}
                disabled={!hasMarkedAttendance}
                className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                <Video className="h-3 w-3" />
                Join Call
              </Button>
            ) : (
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
              <Button
                      size="icon" 
                      onClick={toggleAudio} 
                      className={cn(
                        "h-8 w-8 rounded-lg",
                        isAudioEnabled 
                          ? "bg-zinc-800 hover:bg-zinc-700 text-white" 
                          : "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                      )}
                    >
                      {isAudioEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
              </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{isAudioEnabled ? 'Mute' : 'Unmute'}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
            <Button
                      size="icon" 
                      onClick={toggleVideo} 
                      className={cn(
                        "h-8 w-8 rounded-lg",
                        isVideoEnabled 
                          ? "bg-zinc-800 hover:bg-zinc-700 text-white" 
                          : "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                      )}
                    >
                      {isVideoEnabled ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{isVideoEnabled ? 'Stop Video' : 'Start Video'}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="icon" 
                      onClick={toggleScreenShare} 
                      className={cn(
                        "h-8 w-8 rounded-lg",
                        isScreenSharing 
                          ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400" 
                          : "bg-zinc-800 hover:bg-zinc-700 text-white"
                      )}
                    >
                      {isScreenSharing ? <MonitorOff className="h-3.5 w-3.5" /> : <MonitorUp className="h-3.5 w-3.5" />}
            </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{isScreenSharing ? 'Stop Share' : 'Share Screen'}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="icon" 
                      onClick={leaveCall} 
                      className="h-8 w-8 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400"
                    >
                      <PhoneOff className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Leave Call</TooltipContent>
                </Tooltip>
          </div>
            )}
        </div>
      </header>

      {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <PanelGroup direction="horizontal">
            {/* Sidebar */}
            <Panel defaultSize={18} minSize={15} maxSize={25}>
              <div className="h-full flex flex-col border-r border-zinc-800/50 bg-[#0c0c0e]">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                  <TabsList className="w-full justify-start rounded-none border-b border-zinc-800/50 bg-transparent px-2 h-10 gap-1">
                    <TabsTrigger 
                      value="participants" 
                      className="text-[11px] gap-1 font-medium px-3 h-7 rounded-md data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-400"
                    >
                      <Users className="h-3 w-3" />
                      People ({participants.length})
                    </TabsTrigger>
                    <TabsTrigger 
                      value="chat" 
                      className="text-[11px] gap-1 font-medium px-3 h-7 rounded-md data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-400"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Chat
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="participants" className="flex-1 m-0 overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="p-3 space-y-2">
                        {/* Video Streams */}
                        {isInCall && (
                          <div className="space-y-2 mb-3">
                    {/* Local Video */}
            <div className={cn(
                              "relative aspect-video rounded-lg overflow-hidden bg-zinc-900 border-2 transition-all duration-150",
                              audioLevel > 15 && isAudioEnabled ? "border-emerald-500 shadow-lg shadow-emerald-500/20" : "border-zinc-800"
                            )}>
                      <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                                className={cn(
                                  "w-full h-full object-cover",
                                  !isVideoEnabled && "hidden"
                                )}
                      />
                      {!isVideoEnabled && (
                                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                                  {renderAvatar({ avatarUrl: currentUserProfile?.avatar_url, fullName: currentUserProfile?.full_name }, 'lg')}
                  </div>
                      )}
                              <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded text-[9px] font-medium bg-black/70 text-white flex items-center gap-1.5">
                                You {isScreenSharing && '• Screen'}
                                {isAudioEnabled ? (
                                  <div className="flex items-center gap-0.5">
                                    <div className={cn("w-1 rounded-full bg-emerald-400 transition-all duration-75", audioLevel > 5 ? "h-2" : "h-1")} />
                                    <div className={cn("w-1 rounded-full bg-emerald-400 transition-all duration-75", audioLevel > 15 ? "h-3" : "h-1")} />
                                    <div className={cn("w-1 rounded-full bg-emerald-400 transition-all duration-75", audioLevel > 30 ? "h-2" : "h-1")} />
                                  </div>
                                ) : (
                                  <MicOff className="h-2.5 w-2.5 text-red-400" />
                                )}
                      </div>
                        </div>

                    {/* Remote Videos */}
                            {remoteStreams.map(rs => (
                              <RemoteVideoTile key={rs.oduserId} stream={rs.stream} fullName={rs.fullName} />
                            ))}
                        </div>
                        )}

                        {/* Participant List */}
                  {participants.map(p => (
                          <div 
                            key={p.oduserId} 
                            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
                          >
                        <div className="relative">
                              {renderAvatar({ avatarUrl: p.avatarUrl, fullName: p.fullName, username: p.odusername }, 'sm')}
                              <span className={cn(
                                "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0c0c0e]",
                                p.isInCall ? "bg-emerald-400" : "bg-zinc-600"
                              )} />
                        </div>
                        <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium text-white truncate flex items-center gap-1">
                                {p.fullName}
                                {p.oduserId === currentUser?.id && <span className="text-zinc-500">(you)</span>}
                                {p.isHost && <Crown className="h-3 w-3 text-amber-400" />}
                              </p>
                              <p className="text-[10px] text-zinc-500 truncate flex items-center gap-1">
                                @{p.odusername}
                                {p.isTyping && (
                                  <span className="text-blue-400 flex items-center gap-0.5">
                                    <Code2 className="h-2.5 w-2.5" />
                                    typing...
                                  </span>
                                )}
                              </p>
                      </div>
                          </div>
                  ))}

                        {participants.length === 0 && (
                          <div className="text-center py-8 text-zinc-500">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p className="text-xs">No one here yet</p>
                </div>
                        )}
              </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="chat" className="flex-1 m-0 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1" ref={chatScrollRef}>
                      <div className="p-3 space-y-3">
                        {chatMessages.length === 0 ? (
                          <div className="text-center py-8 text-zinc-500">
                            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p className="text-xs">No messages yet</p>
                    </div>
                        ) : (
                          chatMessages.map(msg => (
                            <div key={msg.id} className="flex gap-2">
                              {renderAvatar({ avatarUrl: msg.avatarUrl, fullName: msg.fullName, username: msg.odusername }, 'sm')}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-[11px] font-medium text-white">{msg.fullName}</span>
                                  <span className="text-[9px] text-zinc-600">
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                        </div>
                                <p className="text-[11px] text-zinc-400 break-words">{msg.message}</p>
                      </div>
                        </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                    <div className="p-2 border-t border-zinc-800/50">
                      <div className="flex gap-1.5">
                        <Input
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && sendMessage()}
                          placeholder={hasMarkedAttendance ? "Type a message..." : "Mark attendance to chat"}
                          disabled={!hasMarkedAttendance}
                          className="h-8 text-xs bg-zinc-900 border-zinc-800 focus:border-amber-500/50 placeholder:text-zinc-600"
                        />
                        <Button 
                          size="icon" 
                          onClick={sendMessage} 
                          disabled={!chatInput.trim() || !hasMarkedAttendance} 
                          className="h-8 w-8 shrink-0 bg-amber-500 hover:bg-amber-600 text-black"
                        >
                          <Send className="h-3 w-3" />
                        </Button>
                        </div>
                          </div>
                  </TabsContent>
                </Tabs>
              </div>
            </Panel>

            <PanelResizeHandle className="w-1 bg-zinc-800/30 hover:bg-amber-500/50 transition-colors" />

            {/* Editor + Output */}
            <Panel defaultSize={82}>
              <PanelGroup direction="vertical">
                {/* Editor */}
                <Panel defaultSize={70} minSize={40}>
                  <div className="h-full flex flex-col bg-[#1e1e1e]">
                    {/* Editor Toolbar */}
                    <div className="h-10 flex items-center justify-between px-3 bg-[#252526] border-b border-[#3c3c3c]">
                      <div className="flex items-center gap-3">
                        <Select value={language} onValueChange={handleLanguageChange} disabled={!hasMarkedAttendance}>
                          <SelectTrigger className="w-[140px] h-7 text-xs bg-[#3c3c3c] border-0 focus:ring-1 focus:ring-amber-500/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#252526] border-[#3c3c3c]">
                            {LANGUAGES.map(l => (
                              <SelectItem key={l.value} value={l.value} className="text-xs">
                                {l.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <span className="text-[10px] text-zinc-500">main.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : language}</span>
                        
                        {/* Typing indicator */}
                        {typingUsersNames.length > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-blue-400 animate-pulse">
                            <Code2 className="h-3 w-3" />
                            {typingUsersNames.length === 1 
                              ? `${typingUsersNames[0]} is typing...`
                              : `${typingUsersNames.length} people typing...`
                            }
                </div>
              )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                    <Button
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setCode(DEFAULT_CODE[language] || '')} 
                              className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-[#3c3c3c]"
                              disabled={!hasMarkedAttendance}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">Reset Code</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                    <Button
                              variant="ghost" 
                              size="icon" 
                              onClick={() => { 
                                navigator.clipboard.writeText(code); 
                                setCopiedCode(true); 
                                setTimeout(() => setCopiedCode(false), 2000); 
                              }} 
                              className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-[#3c3c3c]"
                            >
                              {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">Copy Code</TooltipContent>
                        </Tooltip>

                        <div className="w-px h-4 bg-[#3c3c3c] mx-1" />

                    <Button
                      size="sm"
                          onClick={runCode}
                          disabled={isExecuting || !hasMarkedAttendance}
                          className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3"
                    >
                          {isExecuting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-current" />}
                          Run
                    </Button>
                  </div>
            </div>

                    {/* Monaco Editor */}
                    <div className="flex-1">
                  <Editor
                    height="100%"
                        language={LANGUAGES.find(l => l.value === language)?.monacoId || 'python'}
                    value={code}
                        onChange={handleCodeChange}
                        theme="vs-dark"
                    options={{
                          fontSize: 14,
                      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                          minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      automaticLayout: true,
                          padding: { top: 16, bottom: 16 },
                          readOnly: !hasMarkedAttendance,
                          lineNumbers: 'on',
                          renderLineHighlight: 'line',
                      cursorBlinking: 'smooth',
                          smoothScrolling: true,
                          tabSize: 4,
                        }}
                        onMount={(editor) => { editorRef.current = editor; }}
                      />
                    </div>
                </div>
              </Panel>

                <PanelResizeHandle className="h-1 bg-zinc-800/30 hover:bg-amber-500/50 transition-colors" />

              {/* Output Console */}
                <Panel defaultSize={30} minSize={15}>
                  <div className="h-full flex flex-col bg-[#1e1e1e]">
                    <div className="h-9 flex items-center justify-between px-3 bg-[#252526] border-b border-[#3c3c3c]">
                      <div className="flex items-center gap-2">
                        <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-xs font-medium text-zinc-300">Console</span>
                        {isExecuting && <Loader2 className="h-3 w-3 animate-spin text-amber-400" />}
                  </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setOutput('')} 
                        className="h-6 text-[10px] text-zinc-500 hover:text-white hover:bg-[#3c3c3c]"
                      >
                        Clear
                      </Button>
                    </div>
                    <ScrollArea className="flex-1">
                  <pre className={cn(
                        "p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed",
                        output.includes('❌') ? 'text-red-400' : output.includes('✅') ? 'text-emerald-400' : 'text-zinc-300'
                  )}>
                        {output || <span className="text-zinc-600 italic">Click "Run" to execute your code...</span>}
                  </pre>
                    </ScrollArea>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </div>
    </TooltipProvider>
  );
}
