'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Room, RoomEvent, RemoteParticipant, RemoteTrack, RemoteTrackPublication, Track, ConnectionState, TrackEvent } from 'livekit-client';
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
  Loader2,
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  MonitorUp,
  MonitorOff,
  Code2,
  Send,
  CheckCircle2,
  Circle,
  Crown,
  Copy,
  Check,
  RotateCcw,
  Wifi,
  WifiOff,
  Sparkles,
  Zap,
  Settings,
  MoreHorizontal,
  Maximize2,
  X,
} from 'lucide-react';

// Custom SVG Icons for a more premium look
const PeopleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="4" />
    <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    <circle cx="17" cy="7" r="3" />
    <path d="M21 21v-2a3 3 0 0 0-2-2.83" />
  </svg>
);

const ChatIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const TerminalIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

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

interface RemoteTrackView {
  id: string;
  participantId: string;
  fullName: string;
  kind: 'camera' | 'screen';
  videoTrack?: RemoteTrack;
  audioTrack?: RemoteTrack;
}

// Remote Video Tile Component using LiveKit tracks directly
const RemoteVideoTile = React.memo(function RemoteVideoTile({
  videoTrack,
  audioTrack,
  fullName,
  kind,
}: RemoteTrackView) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasAudio, setHasAudio] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  // Attach video track
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (videoTrack) {
      videoTrack.attach(el);
      el.playsInline = true;
      el.muted = true;
      el.play().catch((err) => console.warn('[RemoteVideo] Video play error', err));
      return () => {
        videoTrack.detach(el);
      };
    }

    el.srcObject = null;
  }, [videoTrack]);

  // Attach audio track
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    if (audioTrack) {
      audioTrack.attach(el);
      el.autoplay = true;
      el.muted = false;
      el.volume = 1.0;
      el
        .play()
        .then(() => setAudioError(false))
        .catch((err) => {
          console.warn('[RemoteAudio] Play error', err);
          setAudioError(true);
        });
      return () => {
        audioTrack.detach(el);
      };
    }

    el.srcObject = null;
    setAudioError(false);
  }, [audioTrack]);

  // Monitor audio track state and levels
  useEffect(() => {
    if (!audioTrack?.mediaStreamTrack) {
      setHasAudio(false);
      setIsMuted(true);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      return;
    }

    setHasAudio(true);
    setIsMuted(audioTrack.isMuted);

    const handleMuted = () => setIsMuted(true);
    const handleUnmuted = () => setIsMuted(false);
    audioTrack.on(TrackEvent.Muted, handleMuted);
    audioTrack.on(TrackEvent.Unmuted, handleUnmuted);

    try {
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const stream = new MediaStream([audioTrack.mediaStreamTrack]);
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (analyserRef.current && audioContextRef.current?.state === 'running' && !audioTrack.isMuted) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
          setAudioLevel(avg);
        } else {
          setAudioLevel(0);
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      console.warn('[RemoteAudio] Analyser error', err);
    }

    return () => {
      audioTrack.off(TrackEvent.Muted, handleMuted);
      audioTrack.off(TrackEvent.Unmuted, handleUnmuted);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      analyserRef.current = null;
    };
  }, [audioTrack]);

  // Handle click to enable audio (user interaction required for autoplay)
  const handleClick = async () => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    try {
      await audioEl.play();
      setAudioError(false);
    } catch (err) {
      console.error('[RemoteVideo] Audio resume failed', err);
      setAudioError(true);
    }
  };

  const isActuallyMuted = isMuted || !hasAudio;
  const isSpeaking = hasAudio && !isMuted && audioLevel > 5;

  return (
    <div 
      className={cn(
        "relative aspect-video rounded-lg overflow-hidden bg-zinc-900 border-2 cursor-pointer group transition-all duration-150",
        isSpeaking && !audioError ? "border-emerald-500 shadow-lg shadow-emerald-500/20" : "border-zinc-800"
      )}
      onClick={handleClick}
    >
      {videoTrack ? (
        <video ref={videoRef} className="w-full h-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-sm text-zinc-300">
          {fullName}
        </div>
      )}
      <audio ref={audioRef} className="hidden" />
      
      <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded text-[9px] font-medium bg-black/70 text-white flex items-center gap-1.5">
        {fullName}
        {hasAudio && !audioError && !isMuted ? (
          <div className="flex items-center gap-0.5">
            <div className={cn("w-1 rounded-full bg-emerald-400 transition-all duration-75", audioLevel > 5 ? "h-2" : "h-1")} />
            <div className={cn("w-1 rounded-full bg-emerald-400 transition-all duration-75", audioLevel > 15 ? "h-3" : "h-1")} />
            <div className={cn("w-1 rounded-full bg-emerald-400 transition-all duration-75", audioLevel > 30 ? "h-2" : "h-1")} />
          </div>
        ) : audioError ? (
          <span className="text-amber-400 flex items-center gap-0.5">
            <MicOff className="h-2.5 w-2.5" />
            tap to enable
          </span>
        ) : isMuted ? (
          <span className="text-red-400 flex items-center gap-0.5">
            <MicOff className="h-2.5 w-2.5" />
            muted
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
            isSpeaking ? "bg-emerald-500/90 text-white" : isMuted ? "bg-red-500/90 text-white" : "bg-zinc-800/90 text-zinc-300"
          )}>
            <Mic className={cn("h-2.5 w-2.5", isMuted && "text-red-300")} />
            {isMuted ? 'Muted' : isSpeaking ? 'Speaking' : 'Quiet'}
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

  // Clear unread messages when switching to chat tab
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    if (tab === 'chat') {
      setUnreadMessages(0);
    }
  }, []);

  // Execution State
  const [output, setOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Video Call State
  const [isInCall, setIsInCall] = useState(false);
  const [isConnectingCall, setIsConnectingCall] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteTracks, setRemoteTracks] = useState<RemoteTrackView[]>([]);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<MediaStreamTrack | null>(null);
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
  const localScreenVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const isRemoteUpdate = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const livekitRoomRef = useRef<Room | null>(null);
  const remoteTrackRefs = useRef<Map<string, { video?: RemoteTrack; screen?: RemoteTrack; audio?: RemoteTrack }>>(new Map());
  const localCameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const localMicTrackRef = useRef<MediaStreamTrack | null>(null);
  const isInCallRef = useRef(false);
  const currentUserRef = useRef<any>(null);
  const currentUserProfileRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const isCleaningUpRef = useRef(false);

  const refreshRemoteTracks = useCallback(() => {
    const updated: RemoteTrackView[] = [];
    remoteTrackRefs.current.forEach((entry, identity) => {
      const participant = participants.find((p) => p.oduserId === identity);
      const fullName = participant?.fullName || 'Participant';

      // Camera view (with video and/or audio)
      if (entry.video || entry.audio) {
        updated.push({
          id: `${identity}-camera`,
          participantId: identity,
          fullName,
          kind: 'camera',
          videoTrack: entry.video,
          audioTrack: entry.audio,
        });
      }

      // Screen share view (video only, no audio)
      if (entry.screen) {
        updated.push({
          id: `${identity}-screen`,
          participantId: identity,
          fullName: `${fullName} • Screen`,
          kind: 'screen',
          videoTrack: entry.screen,
        });
      }
    });
    console.log('[LiveKit] Refreshed remote tracks:', updated.length, updated.map(t => ({ id: t.id, hasVideo: !!t.videoTrack, hasAudio: !!t.audioTrack })));
    setRemoteTracks(updated);
  }, [participants]);

  const attachRemoteTrack = useCallback(
    (identity: string | undefined, source: 'camera' | 'screen' | 'audio', track: RemoteTrack | null) => {
      if (!track || !identity) {
        if (!identity) {
          console.warn('[LiveKit] Missing identity for remote track');
        }
        return;
      }

      let entry = remoteTrackRefs.current.get(identity);
      if (!entry) {
        entry = {};
        remoteTrackRefs.current.set(identity, entry);
      }

      if (source === 'camera') {
        entry.video = track;
      } else if (source === 'screen') {
        entry.screen = track;
      } else if (source === 'audio') {
        entry.audio = track;
        // Audio is always associated with camera view
        if (!entry.video) {
          // If no camera video yet, we'll still show audio-only
        }
      }

      refreshRemoteTracks();
    },
    [refreshRemoteTracks]
  );

  const detachRemoteTrack = useCallback(
    (identity: string | undefined, source: 'camera' | 'screen' | 'audio', track: RemoteTrack | null) => {
      if (!track || !identity) {
        return;
      }
      const entry = remoteTrackRefs.current.get(identity);
      if (!entry) {
        return;
      }

      if (source === 'camera' && entry.video === track) {
        delete entry.video;
      } else if (source === 'screen' && entry.screen === track) {
        delete entry.screen;
      } else if (source === 'audio' && entry.audio === track) {
        delete entry.audio;
      }

      if (!entry.video && !entry.screen && !entry.audio) {
        remoteTrackRefs.current.delete(identity);
      }

      refreshRemoteTracks();
    },
    [refreshRemoteTracks]
  );

  const stopLocalAudioMonitor = useCallback(() => {
    if (audioAnimationRef.current) {
      cancelAnimationFrame(audioAnimationRef.current);
      audioAnimationRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  const startLocalAudioMonitor = useCallback(async (stream: MediaStream) => {
    try {
      stopLocalAudioMonitor();
      const audioContext = new AudioContext();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkAudioLevel = () => {
        if (analyserRef.current && audioContextRef.current?.state === 'running' && isAudioEnabled) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average);
        }
        audioAnimationRef.current = requestAnimationFrame(checkAudioLevel);
      };
      checkAudioLevel();
    } catch (error) {
      console.error('[Audio] Failed to initialize local audio monitor', error);
    }
  }, [isAudioEnabled, stopLocalAudioMonitor]);

  // Build local stream from our stored track refs (more reliable than room collections)
  const buildLocalStreamFromRefs = useCallback(async () => {
    const combined = new MediaStream();
    
    if (localCameraTrackRef.current) {
      console.log('[LocalStream] Adding camera track from ref');
      combined.addTrack(localCameraTrackRef.current);
      setLocalVideoTrack(localCameraTrackRef.current);
    } else {
      setLocalVideoTrack(null);
    }
    
    if (localMicTrackRef.current) {
      console.log('[LocalStream] Adding audio track from ref');
      combined.addTrack(localMicTrackRef.current);
      setLocalAudioTrack(localMicTrackRef.current);
    } else {
      setLocalAudioTrack(null);
    }
    
    if (combined.getTracks().length > 0) {
      console.log('[LocalStream] Built stream with', combined.getTracks().length, 'tracks from refs');
      localStreamRef.current = combined;
      setLocalStream(combined);
      if (combined.getAudioTracks().length > 0) {
        await startLocalAudioMonitor(combined);
      } else {
        stopLocalAudioMonitor();
      }
    } else {
      console.log('[LocalStream] No tracks in refs yet');
      localStreamRef.current = null;
      setLocalStream(null);
      stopLocalAudioMonitor();
    }
  }, [startLocalAudioMonitor, stopLocalAudioMonitor]);

  const rebuildLocalStreamFromRoom = useCallback(async () => {
    const room = livekitRoomRef.current;
    if (!room) return;

    const videoTracks = room?.localParticipant?.videoTracks
      ? Array.from(room.localParticipant.videoTracks.values())
      : [];
    const audioTracks = room?.localParticipant?.audioTracks
      ? Array.from(room.localParticipant.audioTracks.values())
      : [];

    console.log('[LocalStream] Checking room collections - Video:', videoTracks.length, 'Audio:', audioTracks.length);

    const cameraPublication = videoTracks.find(
      (pub) => pub.source === Track.Source.Camera && pub.track?.mediaStreamTrack
    );
    const audioPublication = audioTracks.find((pub) => pub.track?.mediaStreamTrack);

    // Update refs from room collections
    if (cameraPublication?.track?.mediaStreamTrack) {
      localCameraTrackRef.current = cameraPublication.track.mediaStreamTrack;
    }
    if (audioPublication?.track?.mediaStreamTrack) {
      localMicTrackRef.current = audioPublication.track.mediaStreamTrack;
    }

    // Build stream from refs
    await buildLocalStreamFromRefs();
  }, [buildLocalStreamFromRefs]);

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
    const videoEl = localVideoRef.current;
    if (!videoEl) {
      console.log('[LocalVideo] Video element not available');
      return;
    }

    if (localStream && localStream.getVideoTracks().length > 0) {
      console.log('[LocalVideo] Setting stream with', localStream.getVideoTracks().length, 'video tracks');
      videoEl.srcObject = localStream;
      videoEl.play()
        .then(() => console.log('[LocalVideo] Video playing successfully'))
        .catch(e => console.error('[LocalVideo] Play error:', e));
    } else if (localVideoTrack) {
      console.log('[LocalVideo] Setting direct video track');
      const stream = new MediaStream([localVideoTrack]);
      videoEl.srcObject = stream;
      videoEl.play()
        .then(() => console.log('[LocalVideo] Direct track playing successfully'))
        .catch(e => console.error('[LocalVideo] Direct track play error:', e));
    } else if (isInCall && livekitRoomRef.current?.localParticipant?.isCameraEnabled) {
      // Fallback: try to get track directly from LiveKit room
      const room = livekitRoomRef.current;
      const cameraPub = room.localParticipant.videoTracks?.values()?.next()?.value;
      if (cameraPub?.track?.mediaStreamTrack) {
        console.log('[LocalVideo] Using fallback - direct from LiveKit');
        localCameraTrackRef.current = cameraPub.track.mediaStreamTrack;
        const stream = new MediaStream([cameraPub.track.mediaStreamTrack]);
        videoEl.srcObject = stream;
        videoEl.play()
          .then(() => console.log('[LocalVideo] Fallback playing successfully'))
          .catch(e => console.error('[LocalVideo] Fallback play error:', e));
      } else {
        console.log('[LocalVideo] No stream or track available');
        videoEl.srcObject = null;
      }
    } else {
      console.log('[LocalVideo] No stream or track available');
      videoEl.srcObject = null;
    }
  }, [localStream, localVideoTrack, isInCall]);

  useEffect(() => {
    if (localScreenVideoRef.current) {
      if (localScreenStream) {
        localScreenVideoRef.current.srcObject = localScreenStream;
        localScreenVideoRef.current.play().catch(e => console.log('Screen video play error:', e));
      } else {
        localScreenVideoRef.current.srcObject = null;
      }
    }
  }, [localScreenStream]);

  // Keep refs in sync with state (for use in closures)
  useEffect(() => {
    isInCallRef.current = isInCall;
  }, [isInCall]);

  // Retry getting local video after a delay when joining call
  useEffect(() => {
    if (isInCall && !localStream && !localVideoTrack) {
      const timeoutId = setTimeout(() => {
        console.log('[LocalVideo] Retrying to get local video...');
        const room = livekitRoomRef.current;
        if (!room) return;
        
        // Try to get tracks from room and store in refs
        const videoTracks = room.localParticipant?.videoTracks
          ? Array.from(room.localParticipant.videoTracks.values())
          : [];
        const audioTracks = room.localParticipant?.audioTracks
          ? Array.from(room.localParticipant.audioTracks.values())
          : [];
        
        const cameraPub = videoTracks.find(p => p.source === Track.Source.Camera && p.track?.mediaStreamTrack);
        const audioPub = audioTracks.find(p => p.track?.mediaStreamTrack);
        
        if (cameraPub?.track?.mediaStreamTrack) {
          console.log('[LocalVideo] Found camera track on retry');
          localCameraTrackRef.current = cameraPub.track.mediaStreamTrack;
        }
        if (audioPub?.track?.mediaStreamTrack) {
          console.log('[LocalVideo] Found audio track on retry');
          localMicTrackRef.current = audioPub.track.mediaStreamTrack;
        }
        
        buildLocalStreamFromRefs();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isInCall, localStream, localVideoTrack, buildLocalStreamFromRefs]);

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
    remoteTrackRefs.current.clear();
    setRemoteTracks([]);
    setLocalScreenStream(null);
    setLocalScreenStream(null);
    if (localScreenVideoRef.current) {
      localScreenVideoRef.current.srcObject = null;
    }
    const room = livekitRoomRef.current;
    if (room) {
      room.disconnect();
      livekitRoomRef.current = null;
    }
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

      // Get user profile with retry and fallback
      let profile = null;
      try {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', user.id)
          .single();
        profile = data;
      } catch (e) {
        console.warn('[Init] Failed to fetch profile:', e);
      }

      // Fallback to auth metadata if profile is missing
      if (!profile) {
        console.log('[Init] Using auth metadata fallback');
        profile = {
          username: user.user_metadata?.username || user.email?.split('@')[0] || 'user',
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
          avatar_url: user.user_metadata?.avatar_url,
        };
      }
      
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

    // Helper to fetch user profile if missing
    const fetchUserProfile = async (userId: string) => {
      try {
        const { data } = await supabase
          .from('users')
          .select('username, full_name, avatar_url')
          .eq('user_id', userId)
          .single();
        return data;
      } catch {
        // Fallback: try to get from auth metadata (if we have access)
        return null;
      }
    };

    // Presence sync - this fires when presence state changes
    channel.on('presence', { event: 'sync' }, async () => {
      const state = channel.presenceState();
      console.log('[Presence] Sync event, state:', state);
      
      const presenceParticipants: Participant[] = [];
      const profilePromises: Promise<void>[] = [];
      
      Object.entries(state).forEach(([oduserId, presences]: [string, any]) => {
        const presence = presences[0];
        if (presence) {
          // If fullName is missing or generic, fetch profile
          if (!presence.fullName || presence.fullName === 'User' || presence.fullName === 'Unknown User') {
            profilePromises.push(
              fetchUserProfile(oduserId).then(profile => {
                if (profile) {
                  presence.fullName = profile.full_name || presence.fullName;
                  presence.username = profile.username || presence.username;
                  presence.avatarUrl = profile.avatar_url || presence.avatarUrl;
                }
              })
            );
          }
          
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
      
      // Wait for profile fetches, then update participants
      if (profilePromises.length > 0) {
        await Promise.all(profilePromises);
        // Rebuild participants list with updated data
        const updatedParticipants: Participant[] = [];
        Object.entries(state).forEach(([oduserId, presences]: [string, any]) => {
          const presence = presences[0];
          if (presence) {
            updatedParticipants.push({
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
        setParticipants(updatedParticipants);
      } else {
        setParticipants(presenceParticipants);
      }
      
      console.log('[Presence] Participants:', presenceParticipants.length);
      
      console.log('[Presence] Not in call or no local stream, skipping auto-connect. isInCall:', isInCallRef.current, 'hasStream:', !!localStreamRef.current);
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
      // Only destroy peer if they were in a call (they'll have sent user_left_call event)
      // Don't destroy on presence leave alone, as they might just be refreshing
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
        // Also update code to the default snippet for the new language
        if (payload.newCode) {
          isRemoteUpdate.current = true;
          setCode(payload.newCode);
          setTimeout(() => { isRemoteUpdate.current = false; }, 100);
        }
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
      // Increment unread count if not on chat tab
      setUnreadMessages(prev => prev + 1);
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

    channel.on('broadcast', { event: 'user_joined_call' }, async ({ payload }) => {
      if (payload.userId !== user.id) {
        toast.success(`${payload.fullName || 'Someone'} joined the call`);
      }
    });

    channel.on('broadcast', { event: 'user_left_call' }, ({ payload }) => {
      if (payload.userId !== user.id) {
        toast.info('A participant left the call');
      }
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
        isInCall: updates.isInCall ?? isInCallRef.current, // Use ref for current value
        isTyping: updates.isTyping ?? false,
        online_at: new Date().toISOString(),
      };
      
      console.log('[Presence] Updating presence:', presenceData);
      await channelRef.current.track(presenceData);
      console.log('[Presence] Presence updated successfully');
    } else {
      console.warn('[Presence] Cannot update presence - missing:', {
        channel: !!channelRef.current,
        user: !!currentUser,
        profile: !!currentUserProfile,
        status: realtimeStatus,
      });
    }
  }, [currentUser, currentUserProfile, myCursorColor, session, realtimeStatus]);

  // Sync peers with participants (deterministic initiator)
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
    
    // Update code to the default snippet for the new language
    const newCode = DEFAULT_CODE[newLang] || '';
    setCode(newCode);
    
    // Broadcast both language and new code
    safeBroadcast('language_change', { 
      language: newLang, 
      newCode: newCode,
      userId: currentUser?.id 
    });

    // Save both language and code
    supabase
      .from('study_pod_sessions')
      .update({ current_language: newLang, current_code: newCode })
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

    if (isConnectingCall || isInCall) {
      return;
    }

    try {
      setIsConnectingCall(true);
      remoteTrackRefs.current.clear();
      setRemoteTracks([]);
      setLocalScreenStream(null);

      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to join call' }));
        throw new Error(error.error || 'Failed to join LiveKit');
      }

      const { token, serverUrl } = await response.json();

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          videoEncoding: { maxBitrate: 1_200_000 },
        },
      });

      room
        .on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (!track) return;
          console.log('[LiveKit] Track subscribed:', track.kind, publication.source, participant.identity);
          if (track.kind === Track.Kind.Video) {
            const source = publication.source === Track.Source.ScreenShare ? 'screen' : 'camera';
            attachRemoteTrack(participant.identity, source, track);
          }
          if (track.kind === Track.Kind.Audio) {
            // Audio tracks are associated with camera (not screen share)
            attachRemoteTrack(participant.identity, 'audio', track);
          }
        })
        .on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
          if (!track) return;
          console.log('[LiveKit] Track unsubscribed:', track.kind, publication.source, participant.identity);
          if (track.kind === Track.Kind.Video) {
            const source = publication.source === Track.Source.ScreenShare ? 'screen' : 'camera';
            detachRemoteTrack(participant.identity, source, track);
          }
          if (track.kind === Track.Kind.Audio) {
            detachRemoteTrack(participant.identity, 'audio', track);
          }
        })
        .on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
          remoteTrackRefs.current.delete(participant.identity);
          refreshRemoteTracks();
        })
        .on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
          console.log('[LiveKit] Connection state:', state);
          if (state === ConnectionState.Disconnected) {
            remoteTrackRefs.current.clear();
            localCameraTrackRef.current = null;
            localMicTrackRef.current = null;
            refreshRemoteTracks();
            stopLocalAudioMonitor();
            localStreamRef.current = null;
            setLocalStream(null);
            setLocalVideoTrack(null);
            setLocalAudioTrack(null);
            setIsInCall(false);
          }
        })
        .on(RoomEvent.LocalTrackPublished, (publication) => {
          console.log('[LiveKit] Local track published:', publication.source, publication.track?.kind);
          if (publication.source === Track.Source.ScreenShare) {
            if (publication.track?.mediaStreamTrack) {
              setLocalScreenStream(new MediaStream([publication.track.mediaStreamTrack]));
            }
            setIsScreenSharing(true);
          }
          if (publication.source === Track.Source.Camera && publication.track?.mediaStreamTrack) {
            // Store camera track in ref and rebuild stream
            localCameraTrackRef.current = publication.track.mediaStreamTrack;
            console.log('[LiveKit] Stored camera track in ref');
            buildLocalStreamFromRefs();
          }
          if (publication.source === Track.Source.Microphone && publication.track?.mediaStreamTrack) {
            // Store mic track in ref and rebuild stream
            localMicTrackRef.current = publication.track.mediaStreamTrack;
            console.log('[LiveKit] Stored mic track in ref');
            buildLocalStreamFromRefs();
          }
        })
        .on(RoomEvent.LocalTrackUnpublished, (publication) => {
          if (publication.source === Track.Source.ScreenShare) {
            setIsScreenSharing(false);
            setLocalScreenStream(null);
          }
          if (publication.source === Track.Source.Camera) {
            localCameraTrackRef.current = null;
            console.log('[LiveKit] Cleared camera track from ref');
            buildLocalStreamFromRefs();
          }
          if (publication.source === Track.Source.Microphone) {
            localMicTrackRef.current = null;
            console.log('[LiveKit] Cleared mic track from ref');
            buildLocalStreamFromRefs();
          }
        });

      await room.connect(serverUrl, token);
      livekitRoomRef.current = room;

      await room.localParticipant.setMicrophoneEnabled(true);
      await room.localParticipant.setCameraEnabled(true);
      
      // Wait for tracks to be published - the LocalTrackPublished event will handle it
      // But also try to rebuild after a delay as fallback
      setTimeout(async () => {
        await rebuildLocalStreamFromRoom();
      }, 500);

      setIsInCall(true);
      setIsVideoEnabled(true);
      setIsAudioEnabled(true);
      setIsScreenSharing(false);

      await updatePresence({ isInCall: true });
      await safeBroadcast('user_joined_call', {
        userId: currentUser?.id,
        username: currentUserProfile?.username,
        fullName: currentUserProfile?.full_name,
        avatarUrl: currentUserProfile?.avatar_url,
      });

      toast.success('Joined video call');
    } catch (error: any) {
      console.error('[LiveKit] Failed to join call', error);
      toast.error(error.message || 'Could not join the call');
      if (livekitRoomRef.current) {
        livekitRoomRef.current.disconnect();
        livekitRoomRef.current = null;
      }
    } finally {
      setIsConnectingCall(false);
    }
  };

  const leaveCall = async () => {
    console.log('[Video] Leaving call...');
    
    stopLocalAudioMonitor();
    
      if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setLocalVideoTrack(null);
    setLocalAudioTrack(null);
    localCameraTrackRef.current = null;
    localMicTrackRef.current = null;

    const room = livekitRoomRef.current;
    if (room) {
      room.disconnect();
      livekitRoomRef.current = null;
    }

    remoteTrackRefs.current.clear();
    setRemoteTracks([]);
    setIsScreenSharing(false);
    setIsInCall(false);

    await updatePresence({ isInCall: false });
    await safeBroadcast('user_left_call', { userId: currentUser?.id });

    toast.success('Left video call');
  };

  const toggleVideo = async () => {
    const room = livekitRoomRef.current;
    if (!room) return;
    const nextEnabled = !isVideoEnabled;
    try {
      await room.localParticipant.setCameraEnabled(nextEnabled);
      setIsVideoEnabled(nextEnabled);
      await rebuildLocalStreamFromRoom();
    } catch (error) {
      console.error('[Video] Failed to toggle camera', error);
      toast.error('Unable to toggle camera');
    }
  };

  const toggleAudio = async () => {
    const room = livekitRoomRef.current;
    if (!room) return;
    const nextEnabled = !isAudioEnabled;
    try {
      await room.localParticipant.setMicrophoneEnabled(nextEnabled);
      setIsAudioEnabled(nextEnabled);
      await rebuildLocalStreamFromRoom();
    } catch (error) {
      console.error('[Video] Failed to toggle microphone', error);
      toast.error('Unable to toggle microphone');
    }
  };

  const toggleScreenShare = async () => {
    const room = livekitRoomRef.current;
    if (!room) return;
    try {
      const shouldEnable = !isScreenSharing;
      await room.localParticipant.setScreenShareEnabled(shouldEnable);
      if (!shouldEnable) {
        setLocalScreenStream(null);
      }
    } catch (error) {
      console.error('[Video] Failed to toggle screen share', error);
      toast.error('Unable to toggle screen share');
    }
  };

  // Debug function
  const debugConnections = () => {
    const room = livekitRoomRef.current;
    console.log('=== DEBUG INFO ===');
    console.log('Is in call:', isInCallRef.current);
    console.log('LiveKit state:', room?.state);
    console.log('Local stream:', localStreamRef.current?.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
    console.log('Remote tracks:', remoteTracks.map(rt => ({ id: rt.id, name: rt.fullName, hasVideo: !!rt.videoTrack, hasAudio: !!rt.audioTrack })));
    console.log('Participants:', participants.map(p => ({ userId: p.oduserId, name: p.fullName, inCall: p.isInCall })));
    console.log('==================');
  };

  // Retry connections to all participants in call
  const retryConnections = async () => {
    const room = livekitRoomRef.current;
    if (!room) {
      await joinCall();
      return;
    }

    try {
      await room.reconnect();
      toast.success('Reconnecting to LiveKit...');
    } catch (error) {
      console.warn('[LiveKit] Reconnect failed, restarting call', error);
      await leaveCall();
      await joinCall();
    }
  };

  // Render Avatar
  const renderAvatar = (user: { avatarUrl?: string; fullName?: string; username?: string }, size: 'xs' | 'sm' | 'md' | 'lg' = 'md') => {
    const sizes = { 
      xs: 'h-5 w-5 text-[8px]', 
      sm: 'h-6 w-6 text-[9px]', 
      md: 'h-8 w-8 text-[10px]', 
      lg: 'h-10 w-10 text-xs' 
    };
    return (
      <Avatar className={cn(sizes[size], "ring-1 ring-zinc-800/50")}>
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
      <div className="h-screen flex flex-col bg-[#0a0a0c] overflow-hidden">
      {/* Premium Header */}
        <header className="h-12 px-3 flex items-center justify-between border-b border-zinc-800/40 bg-gradient-to-r from-[#0a0a0c] via-[#0f0f12] to-[#0a0a0c]">
          {/* Left - Session Info */}
          <div className="flex items-center gap-2.5">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-1.5 rounded-md bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
      </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-[13px] font-semibold text-white tracking-tight">{session?.title || 'Live Session'}</h1>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Live</span>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 -mt-0.5">{session?.session_type || 'study'}</p>
            </div>
          </div>

          {/* Center - Connection + Participants */}
          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium",
              realtimeStatus === 'connected' 
                ? "bg-emerald-500/10 text-emerald-400" 
                : "bg-red-500/10 text-red-400"
            )}>
              {realtimeStatus === 'connected' ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              {realtimeStatus}
            </div>

            {/* Participant Avatars */}
            <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-zinc-800/50 border border-zinc-700/30">
              <div className="flex -space-x-1.5">
                {participants.slice(0, 5).map((p) => (
                  <Tooltip key={p.oduserId}>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <Avatar className="h-6 w-6 border-2 border-[#0a0a0c] ring-1 ring-zinc-700/50">
                          {p.avatarUrl && <AvatarImage src={p.avatarUrl} />}
                          <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-[8px] font-bold">
                            {p.fullName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                        {p.isInCall && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border border-[#0a0a0c]" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-zinc-900 border-zinc-700">
                      <p className="font-medium text-xs">{p.fullName}</p>
                      <p className="text-[10px] text-zinc-400">@{p.odusername}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                  </div>
              {participants.length > 5 && (
                <span className="text-[10px] text-zinc-400">+{participants.length - 5}</span>
                )}
              <span className="text-[10px] text-zinc-400 font-medium">{participants.length} online</span>
              </div>
            </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-1.5">
            {/* Attendance */}
              <Button
                size="sm"
              onClick={markAttendance}
              disabled={hasMarkedAttendance || isMarkingAttendance}
              className={cn(
                "h-7 text-[11px] gap-1.5 font-medium rounded-md px-2.5",
                hasMarkedAttendance
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 cursor-default"
                  : "bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/20"
              )}
            >
              {isMarkingAttendance ? <Loader2 className="h-3 w-3 animate-spin" /> :
               hasMarkedAttendance ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
              {hasMarkedAttendance ? 'Attended' : 'Attend'}
              </Button>

            <div className="h-4 w-px bg-zinc-800/50" />

            {/* Video Controls */}
            {!isInCall ? (
              <Button
                size="sm"
                onClick={joinCall}
                disabled={!hasMarkedAttendance || isConnectingCall}
                className="h-7 text-[11px] gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium px-2.5"
              >
                {isConnectingCall ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Video className="h-3 w-3" />
                )}
                {isConnectingCall ? 'Joining...' : 'Join Call'}
              </Button>
            ) : (
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon" 
                      onClick={toggleAudio} 
                      className={cn(
                        "h-6 w-6 rounded-md",
                        isAudioEnabled 
                          ? "bg-transparent hover:bg-zinc-700/50 text-white" 
                          : "bg-red-500/20 text-red-400"
                      )}
                    >
                      {isAudioEnabled ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
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
                        "h-6 w-6 rounded-md",
                        isVideoEnabled 
                          ? "bg-transparent hover:bg-zinc-700/50 text-white" 
                          : "bg-red-500/20 text-red-400"
                      )}
                    >
                      {isVideoEnabled ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
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
                        "h-6 w-6 rounded-md",
                        isScreenSharing 
                          ? "bg-emerald-500/20 text-emerald-400" 
                          : "bg-transparent hover:bg-zinc-700/50 text-white"
                      )}
                    >
                      {isScreenSharing ? <MonitorOff className="h-3 w-3" /> : <MonitorUp className="h-3 w-3" />}
            </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{isScreenSharing ? 'Stop Share' : 'Share Screen'}</TooltipContent>
                </Tooltip>

                <div className="w-px h-4 bg-zinc-700/50 mx-0.5" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="icon" 
                      onClick={retryConnections} 
                      className="h-6 w-6 rounded-md bg-transparent hover:bg-zinc-700/50 text-amber-400"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Refresh</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="icon" 
                      onClick={leaveCall} 
                      className="h-6 w-6 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-400"
                    >
                      <PhoneOff className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Leave</TooltipContent>
                </Tooltip>
          </div>
            )}
        </div>
      </header>

      {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <PanelGroup direction="horizontal">
            {/* Sidebar - Redesigned for scalability */}
            <Panel defaultSize={20} minSize={16} maxSize={28}>
              <div className="h-full flex flex-col border-r border-zinc-800/30 bg-[#0a0a0c]">
                {/* Video Grid - Always visible when in call */}
                {isInCall && (
                  <div className="p-2 border-b border-zinc-800/30">
                    <div className="grid grid-cols-2 gap-1.5">
                      {/* Local Video */}
                      <div className={cn(
                        "relative aspect-video rounded-md overflow-hidden bg-zinc-900/80 ring-1 transition-all duration-150",
                        audioLevel > 15 && isAudioEnabled ? "ring-emerald-500/50 shadow-lg shadow-emerald-500/10" : "ring-zinc-800/50"
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
                          onLoadedMetadata={() => console.log('[LocalVideo] Metadata loaded')}
                          onPlay={() => console.log('[LocalVideo] Video playing')}
                          onError={(e) => console.error('[LocalVideo] Video error:', e)}
                        />
                        {!isVideoEnabled && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                            {renderAvatar({ avatarUrl: currentUserProfile?.avatar_url, fullName: currentUserProfile?.full_name }, 'md')}
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-medium text-white/90">You</span>
                            <div className="flex items-center gap-1">
                              {isAudioEnabled ? (
                                <div className="flex items-center gap-0.5">
                                  <div className={cn("w-0.5 rounded-full bg-emerald-400 transition-all duration-75", audioLevel > 5 ? "h-1.5" : "h-0.5")} />
                                  <div className={cn("w-0.5 rounded-full bg-emerald-400 transition-all duration-75", audioLevel > 15 ? "h-2" : "h-0.5")} />
                                  <div className={cn("w-0.5 rounded-full bg-emerald-400 transition-all duration-75", audioLevel > 30 ? "h-1.5" : "h-0.5")} />
                                </div>
                              ) : (
                                <MicOff className="h-2 w-2 text-red-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Local Screen Share */}
                      {localScreenStream && (
                        <div className="relative aspect-video rounded-md overflow-hidden bg-zinc-900/80 ring-1 ring-emerald-500/30">
                          <video
                            ref={localScreenVideoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                            <div className="flex items-center gap-1">
                              <span className="text-[8px] font-medium text-white/90">Screen</span>
                              <span className="text-[7px] text-emerald-400 font-bold">LIVE</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Remote Videos */}
                      {remoteTracks.map(rt => (
                        <RemoteVideoTile
                          key={rt.id}
                          videoTrack={rt.videoTrack}
                          audioTrack={rt.audioTrack}
                          fullName={rt.fullName}
                          kind={rt.kind}
                        />
                      ))}

                      {/* Empty slots for visual consistency */}
                      {(1 + (localScreenStream ? 1 : 0) + remoteTracks.length) % 2 !== 0 && (
                        <div className="aspect-video rounded-md bg-zinc-900/40 ring-1 ring-zinc-800/30 flex items-center justify-center">
                          <Video className="h-4 w-4 text-zinc-700" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
                  <TabsList className="w-full justify-start rounded-none border-b border-zinc-800/30 bg-transparent px-2 h-9 gap-0.5 shrink-0">
                    <TabsTrigger 
                      value="participants" 
                      className="text-[10px] gap-1 font-medium px-2.5 h-6 rounded data-[state=active]:bg-zinc-800/80 data-[state=active]:text-white text-zinc-500"
                    >
                      <PeopleIcon className="h-3 w-3" />
                      People
                      <span className="text-zinc-600 ml-0.5">({participants.length})</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="chat" 
                      className="text-[10px] gap-1 font-medium px-2.5 h-6 rounded data-[state=active]:bg-zinc-800/80 data-[state=active]:text-white text-zinc-500 relative"
                    >
                      <ChatIcon className="h-3 w-3" />
                      Chat
                      {unreadMessages > 0 && activeTab !== 'chat' && (
                        <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-amber-500 text-[9px] font-bold text-black flex items-center justify-center">
                          {unreadMessages > 99 ? '99+' : unreadMessages}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="participants" className="flex-1 m-0 overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="p-2 space-y-0.5">
                        {participants.map(p => (
                          <div 
                            key={p.oduserId} 
                            className="flex items-center gap-2 p-1.5 rounded-md hover:bg-zinc-800/40 transition-colors group"
                          >
                            <div className="relative shrink-0">
                              {renderAvatar({ avatarUrl: p.avatarUrl, fullName: p.fullName, username: p.odusername }, 'sm')}
                              <span className={cn(
                                "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#0a0a0c]",
                                p.isInCall ? "bg-emerald-400" : "bg-zinc-600"
                              )} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-medium text-zinc-200 truncate flex items-center gap-1">
                                {p.fullName}
                                {p.oduserId === currentUser?.id && <span className="text-zinc-600">(you)</span>}
                                {p.isHost && <Crown className="h-2.5 w-2.5 text-amber-400" />}
                              </p>
                              <p className="text-[9px] text-zinc-600 truncate flex items-center gap-1">
                                @{p.odusername}
                                {p.isTyping && (
                                  <span className="text-blue-400 flex items-center gap-0.5 animate-pulse">
                                    <Code2 className="h-2 w-2" />
                                    typing
                                  </span>
                                )}
                              </p>
                            </div>
                            {p.isInCall && (
                              <div className="shrink-0">
                                <Video className="h-3 w-3 text-emerald-400" />
                              </div>
                            )}
                          </div>
                        ))}

                        {participants.length === 0 && (
                          <div className="text-center py-8 text-zinc-600">
                            <PeopleIcon className="h-6 w-6 mx-auto mb-2 opacity-40" />
                            <p className="text-[10px]">No one here yet</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="chat" className="flex-1 m-0 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1" ref={chatScrollRef}>
                      <div className="p-2 space-y-2">
                        {chatMessages.length === 0 ? (
                          <div className="text-center py-8 text-zinc-600">
                            <ChatIcon className="h-6 w-6 mx-auto mb-2 opacity-40" />
                            <p className="text-[10px]">No messages yet</p>
                            <p className="text-[9px] text-zinc-700 mt-1">Start the conversation!</p>
                          </div>
                        ) : (
                          chatMessages.map(msg => (
                            <div key={msg.id} className="flex gap-1.5 group">
                              <div className="shrink-0 mt-0.5">
                                {renderAvatar({ avatarUrl: msg.avatarUrl, fullName: msg.fullName, username: msg.odusername }, 'xs')}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-[10px] font-medium text-zinc-300">{msg.fullName}</span>
                                  <span className="text-[8px] text-zinc-700">
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-[10px] text-zinc-400 break-words leading-relaxed">{msg.message}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                    <div className="p-1.5 border-t border-zinc-800/30 bg-zinc-900/30">
                      <div className="flex gap-1">
                        <Input
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && sendMessage()}
                          placeholder={hasMarkedAttendance ? "Message..." : "Mark attendance first"}
                          disabled={!hasMarkedAttendance}
                          className="h-7 text-[10px] bg-zinc-900/50 border-zinc-800/50 focus:border-amber-500/30 placeholder:text-zinc-700 rounded"
                        />
                        <Button 
                          size="icon" 
                          onClick={sendMessage} 
                          disabled={!chatInput.trim() || !hasMarkedAttendance} 
                          className="h-7 w-7 shrink-0 bg-amber-500 hover:bg-amber-600 text-black rounded"
                        >
                          <Send className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </Panel>

            <PanelResizeHandle className="w-0.5 bg-zinc-800/20 hover:bg-amber-500/50 transition-colors" />

            {/* Editor + Output */}
            <Panel defaultSize={80}>
              <PanelGroup direction="vertical">
                {/* Editor */}
                <Panel defaultSize={70} minSize={40}>
                  <div className="h-full flex flex-col bg-[#0d0d0f]">
                    {/* Editor Toolbar - Modernized */}
                    <div className="h-9 flex items-center justify-between px-2 bg-[#111113] border-b border-zinc-800/30">
                      <div className="flex items-center gap-2">
                        {/* File Tab */}
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800/50 border border-zinc-700/30">
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            language === 'python' ? "bg-blue-400" :
                            language === 'javascript' ? "bg-yellow-400" :
                            language === 'java' ? "bg-orange-400" :
                            language === 'cpp' ? "bg-purple-400" :
                            language === 'go' ? "bg-cyan-400" :
                            "bg-zinc-400"
                          )} />
                          <span className="text-[10px] text-zinc-300 font-medium">
                            main.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'cpp' ? 'cpp' : language}
                          </span>
                        </div>

                        {/* Language Select */}
                        <Select value={language} onValueChange={handleLanguageChange} disabled={!hasMarkedAttendance}>
                          <SelectTrigger className="w-[110px] h-6 text-[10px] bg-zinc-800/30 border-zinc-700/30 focus:ring-1 focus:ring-amber-500/30 rounded">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#111113] border-zinc-700/50">
                            {LANGUAGES.map(l => (
                              <SelectItem key={l.value} value={l.value} className="text-[10px]">
                                {l.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {/* Typing indicator */}
                        {typingUsersNames.length > 0 && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                            <div className="flex gap-0.5">
                              <span className="h-1 w-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="h-1 w-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="h-1 w-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-[9px] text-blue-400 font-medium">
                              {typingUsersNames.length === 1 
                                ? `${typingUsersNames[0]} typing`
                                : `${typingUsersNames.length} typing`
                              }
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleLanguageChange(language)} 
                              className="h-6 w-6 text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded"
                              disabled={!hasMarkedAttendance}
                            >
                              <RotateCcw className="h-3 w-3" />
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
                              className="h-6 w-6 text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded"
                            >
                              {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">Copy Code</TooltipContent>
                        </Tooltip>

                        <div className="w-px h-4 bg-zinc-800/50 mx-1" />

                        <Button
                          size="sm"
                          onClick={runCode}
                          disabled={isExecuting || !hasMarkedAttendance}
                          className={cn(
                            "h-6 text-[10px] gap-1 font-medium px-2.5 rounded",
                            isExecuting 
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                          )}
                        >
                          {isExecuting ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Running
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3 fill-current" />
                              Run
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Monaco Editor */}
                    <div className="flex-1 relative">
                      <Editor
                        height="100%"
                        language={LANGUAGES.find(l => l.value === language)?.monacoId || 'python'}
                        value={code}
                        onChange={handleCodeChange}
                        theme="vs-dark"
                        options={{
                          fontSize: 13,
                          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                          fontLigatures: true,
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          wordWrap: 'on',
                          automaticLayout: true,
                          padding: { top: 12, bottom: 12 },
                          readOnly: !hasMarkedAttendance,
                          lineNumbers: 'on',
                          lineNumbersMinChars: 3,
                          renderLineHighlight: 'line',
                          cursorBlinking: 'smooth',
                          cursorSmoothCaretAnimation: 'on',
                          smoothScrolling: true,
                          tabSize: 4,
                          bracketPairColorization: { enabled: true },
                          guides: { bracketPairs: true },
                          scrollbar: {
                            verticalScrollbarSize: 8,
                            horizontalScrollbarSize: 8,
                          },
                        }}
                        onMount={(editor) => { editorRef.current = editor; }}
                      />
                      {!hasMarkedAttendance && (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                          <div className="text-center p-6 rounded-xl bg-zinc-900/80 border border-zinc-800/50">
                            <Zap className="h-8 w-8 text-amber-400 mx-auto mb-3" />
                            <p className="text-sm font-medium text-white mb-1">Mark Attendance to Edit</p>
                            <p className="text-xs text-zinc-500">Click "Attend" in the header to start coding</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Panel>

                <PanelResizeHandle className="h-1 bg-zinc-800/30 hover:bg-amber-500/50 transition-colors" />

              {/* Output Console - Redesigned */}
                <Panel defaultSize={30} minSize={15}>
                  <div className="h-full flex flex-col bg-[#0d0d0f]">
                    <div className="h-8 flex items-center justify-between px-3 bg-[#111113] border-b border-zinc-800/30">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-1">
                            <span className="h-2 w-2 rounded-full bg-red-500/80" />
                            <span className="h-2 w-2 rounded-full bg-amber-500/80" />
                            <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
                          </div>
                        </div>
                        <div className="h-3 w-px bg-zinc-800/50" />
                        <TerminalIcon className="h-3 w-3 text-emerald-400" />
                        <span className="text-[10px] font-medium text-zinc-400">Output</span>
                        {isExecuting && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10">
                            <Loader2 className="h-2.5 w-2.5 animate-spin text-amber-400" />
                            <span className="text-[9px] text-amber-400">Running...</span>
                          </div>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setOutput('')} 
                        className="h-5 px-2 text-[9px] text-zinc-600 hover:text-white hover:bg-zinc-800/50 rounded"
                      >
                        Clear
                      </Button>
                    </div>
                    <ScrollArea className="flex-1 bg-[#0d0d0f]">
                      {output ? (
                        <div className="p-3">
                          <pre className={cn(
                            "text-[11px] font-mono whitespace-pre-wrap leading-relaxed",
                            output.includes('❌') || output.includes('Error') || output.includes('error') 
                              ? 'text-red-400' 
                              : output.includes('✅') || output.includes('Success') 
                                ? 'text-emerald-400' 
                                : 'text-zinc-300'
                          )}>
                            {output}
                          </pre>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6">
                          <div className="p-3 rounded-xl bg-zinc-800/30 mb-3">
                            <TerminalIcon className="h-6 w-6 text-zinc-600" />
                          </div>
                          <p className="text-[11px] text-zinc-500 font-medium">Ready to execute</p>
                          <p className="text-[10px] text-zinc-700 mt-1">Click <span className="text-emerald-400 font-medium">Run</span> to see output here</p>
                        </div>
                      )}
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
