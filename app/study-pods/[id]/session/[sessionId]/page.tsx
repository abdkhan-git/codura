'use client';

import { useEffect, useState, useRef } from 'react';
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
import { SessionVideoSidebar } from '@/components/study-pods/session-video-sidebar';
import { useCollaborativeEditor } from '@/lib/hooks/use-collaborative-editor';
import { CollaborativePresence } from '@/components/study-pods/collaborative-presence';
import { LiveStreamPanel } from '@/components/study-pods/live-stream-panel';
import { LiveStreamViewer } from '@/components/study-pods/live-stream-viewer';

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
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [isVideoSidebarCollapsed, setIsVideoSidebarCollapsed] = useState(true);
  const [isSynced, setIsSynced] = useState(false);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);

  // Y.js Collaborative Editing
  useCollaborativeEditor({
    sessionId,
    userId: currentUser?.id || '',
    username: currentUser?.user_metadata?.full_name || currentUser?.email || 'Anonymous',
    editor: editorRef.current,
    monaco: monacoRef.current,
    onSync: setIsSynced,
  });

  // Colors for participants
  const CURSOR_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
  ];

  // Initialize
  useEffect(() => {
    initializeSession();
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_session', sessionId);
        socketRef.current.disconnect();
      }
    };
  }, [sessionId]);

  const initializeSession = async () => {
    try {
      // Get current user
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
          cursorColor: CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)]
        }),
      });

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
      console.log('✅ Connected to Socket.io');
      setIsConnected(true);

      // Join session room
      socket.emit('join_session', {
        sessionId,
        userData: { userId },
      });
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from Socket.io');
      setIsConnected(false);
    });

    // Session events
    socket.on('session_participants', (data) => {
      fetchParticipants();
    });

    socket.on('participant_joined', (data) => {
      toast.success(`${data.userData?.username || 'Someone'} joined the session`);
      fetchParticipants();
    });

    socket.on('participant_left', (data) => {
      console.log('👋 Participant left:', data.userId);
      fetchParticipants();
      toast.info('Someone left the session');
    });

    socket.on('code_updated', (data) => {
      if (data.userId !== userId) {
        console.log('📝 Received code update from', data.userId);
        setCode(data.code);

        // Update Monaco editor directly to ensure visual update
        if (editorRef.current && data.code !== editorRef.current.getValue()) {
          const currentPosition = editorRef.current.getPosition();
          const currentScrollTop = editorRef.current.getScrollTop();

          editorRef.current.setValue(data.code);

          // Restore cursor position and scroll if possible
          if (currentPosition) {
            editorRef.current.setPosition(currentPosition);
          }
          if (currentScrollTop !== undefined) {
            editorRef.current.setScrollTop(currentScrollTop);
          }
        }
      }
    });

    socket.on('language_changed', (data) => {
      if (data.userId !== userId) {
        setLanguage(data.language);
        toast.info(`Language changed to ${data.language}`);
      }
    });

    socket.on('code_execution_result', (data) => {
      if (data.error) {
        setOutput(`Error:\n${data.error}`);
      } else {
        setOutput(data.output || 'No output');
      }
      setIsExecuting(false);
    });

    socket.on('session_chat_message', (data) => {
      setChatMessages(prev => [...prev, data]);
    });

    socketRef.current = socket;
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

  const handleEditorChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);

    // Broadcast code change to all participants in real-time
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('code_change', {
        sessionId,
        code: newCode,
        userId: currentUser?.id,
        cursorPosition: editorRef.current?.getPosition(),
        timestamp: Date.now()
      });
    }

    // Debounced save to database
    saveCodeToDatabase(newCode);
  };

  const debouncedSaveCode = useRef<NodeJS.Timeout | null>(null);
  const saveCodeToDatabase = (codeToSave: string) => {
    if (debouncedSaveCode.current) {
      clearTimeout(debouncedSaveCode.current);
    }

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

    // Broadcast language change to all participants
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('language_change', {
        sessionId,
        language: newLanguage,
        userId: currentUser?.id,
      });
    }

    // Save to database
    fetch(`/api/study-pods/sessions/${sessionId}/code`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: newLanguage }),
    });
  };

  const handleRunCode = async () => {
    setIsExecuting(true);
    setOutput('Executing...');

    // Broadcast execution started
    if (socketRef.current) {
      socketRef.current.emit('run_code', {
        sessionId,
        code,
        language,
      });
    }

    try {
      const response = await fetch(`/api/study-pods/sessions/${sessionId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });

      if (response.ok) {
        const data = await response.json();
        const result = data.execution;

        // Broadcast result
        if (socketRef.current) {
          socketRef.current.emit('code_output', {
            sessionId,
            output: result.output,
            error: result.error,
            status: result.status,
            executionTime: result.executionTime,
          });
        }

        if (result.error) {
          setOutput(`Error:\n${result.error}`);
        } else {
          setOutput(result.output || 'No output');
        }
      } else {
        setOutput('Execution failed');
      }
    } catch (error) {
      console.error('Error executing code:', error);
      setOutput('Execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSnapshot = async () => {
    try {
      await fetch(`/api/study-pods/sessions/${sessionId}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          snapshotType: 'manual',
        }),
      });
      toast.success('Snapshot saved');
    } catch (error) {
      toast.error('Failed to save snapshot');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-all duration-300 relative",
      !isVideoSidebarCollapsed && "pr-80",
      theme === 'light' ? 'bg-gray-50' : 'bg-zinc-950'
    )}>
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0" style={{
          background: theme === 'light'
            ? 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.05), transparent 50%), radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.05), transparent 50%)'
            : 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.1), transparent 50%), radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.1), transparent 50%)'
        }} />
      </div>

      {/* Header */}
      <div className={cn(
        "border-b px-6 py-4 flex items-center justify-between backdrop-blur-xl z-10 shadow-lg relative",
        theme === 'light' ? 'bg-white/80 border-gray-200/50' : 'bg-zinc-900/80 border-zinc-800/50'
      )}>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/study-pods/${id}`)}
          >
            ← Back to Pod
          </Button>
          <div className="h-6 w-px bg-gray-300" />
          <div>
            <h1 className={cn(
              "text-xl font-bold",
              theme === 'light' ? 'text-gray-900' : 'text-white'
            )}>
              {session?.title || 'Live Coding Session'}
            </h1>
          </div>
          {isConnected && (
            <span className="flex items-center gap-1 text-sm text-green-600 ml-2">
              <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
              Connected
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Collaborative Presence Avatars */}
          <CollaborativePresence
            participants={participants}
            currentUserId={currentUser?.id || ''}
          />

          <div className="h-6 w-px bg-gray-300" />
          {/* Language Selector */}
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(lang => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyCode}
            className={cn(
              "backdrop-blur-md border shadow-md transition-all hover:shadow-lg",
              theme === 'light'
                ? 'bg-white/60 border-gray-200/50 hover:bg-white/90'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            )}
          >
            {copied ? '✓ Copied' : 'Copy Code'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveSnapshot}
            className={cn(
              "backdrop-blur-md border shadow-md transition-all hover:shadow-lg",
              theme === 'light'
                ? 'bg-white/60 border-gray-200/50 hover:bg-white/90'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            )}
          >
            💾 Save Snapshot
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsVideoSidebarCollapsed(!isVideoSidebarCollapsed)}
            className={cn(
              "backdrop-blur-md border shadow-md transition-all hover:shadow-lg",
              theme === 'light'
                ? 'bg-white/60 border-emerald-200/50 hover:bg-emerald-50/90'
                : 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
            )}
          >
            📹 Video Call
          </Button>

          <Button
            onClick={handleRunCode}
            disabled={isExecuting}
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 shadow-lg hover:shadow-xl transition-all"
          >
            {isExecuting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Run
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Participants */}
        <div className={cn(
          "w-64 border-r p-4 overflow-y-auto backdrop-blur-xl z-10 relative",
          theme === 'light' ? 'bg-white/80 border-gray-200/50' : 'bg-zinc-900/60 border-zinc-800/50'
        )}>
          <h3 className={cn(
            "text-sm font-semibold mb-3 flex items-center gap-2",
            theme === 'light' ? 'text-gray-900' : 'text-white'
          )}>
            <Users className="w-4 h-4 text-emerald-500" />
            Participants ({participants.length})
          </h3>
          <div className="space-y-2">
            {participants.map(participant => (
              <div
                key={participant.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg backdrop-blur-md border shadow-sm transition-all hover:shadow-md",
                  theme === 'light'
                    ? 'bg-white/60 border-gray-200/50 hover:bg-white/90'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                )}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: participant.cursor_color }}
                />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    theme === 'light' ? 'text-gray-900' : 'text-white'
                  )}>
                    {participant.user?.full_name || participant.user?.username}
                  </p>
                  {participant.user_id === currentUser?.id && (
                    <p className="text-xs text-gray-500">You</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Live Stream Controls - Host Only */}
          {session?.host_user_id === currentUser?.id && (
            <div className="mt-4">
              <LiveStreamPanel
                sessionId={sessionId}
                userId={currentUser?.id || ''}
                isHost={true}
                socket={socketRef.current}
              />
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col">
          {/* Live Stream Viewer - All Participants */}
          <div className="p-4">
            <LiveStreamViewer
              sessionId={sessionId}
              userId={currentUser?.id || ''}
              socket={socketRef.current}
            />
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              language={LANGUAGES.find(l => l.value === language)?.monacoLang || 'javascript'}
              value={code}
              onChange={handleEditorChange}
              theme={theme === 'light' ? 'light' : 'vs-dark'}
              options={{
                fontSize: 14,
                fontFamily: 'JetBrains Mono, Consolas, monospace',
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
              }}
              onMount={(editor, monaco) => {
                editorRef.current = editor;
                monacoRef.current = monaco;
              }}
            />
          </div>

          {/* Output Panel */}
          <div className={cn(
            "h-48 border-t p-4 overflow-y-auto font-mono text-sm backdrop-blur-xl relative z-10",
            theme === 'light' ? 'bg-gray-50/90 border-gray-200/50' : 'bg-zinc-950/90 border-zinc-800/50'
          )}>
            <div className="flex items-center justify-between mb-3">
              <span className={cn(
                "text-xs font-semibold uppercase tracking-wider flex items-center gap-2",
                theme === 'light' ? 'text-gray-700' : 'text-gray-300'
              )}>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Output
              </span>
            </div>
            <pre className={cn(
              "whitespace-pre-wrap p-3 rounded-lg backdrop-blur-md border",
              theme === 'light'
                ? 'bg-white/60 border-gray-200/50 text-gray-900'
                : 'bg-white/5 border-white/10 text-gray-100'
            )}>
              {output || 'Run your code to see output here...'}
            </pre>
          </div>
        </div>
      </div>

      {/* Video Sidebar */}
      <SessionVideoSidebar
        sessionId={sessionId}
        socket={socketRef.current}
        currentUserId={currentUser?.id || ''}
        isCollapsed={isVideoSidebarCollapsed}
        onToggleCollapse={() => setIsVideoSidebarCollapsed(!isVideoSidebarCollapsed)}
      />
    </div>
  );
}
