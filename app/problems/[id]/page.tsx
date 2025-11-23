'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Loader2, Users, Copy, Check, X, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMonaco } from '@monaco-editor/react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { editor } from 'monaco-editor'

// Import separated components
import AIChatbot from '@/components/problems/AIChatbot'
import CodeEditorPanel from '@/components/problems/CodeEditorPanel'
import ProblemDescriptionPanel from '@/components/problems/ProblemDescriptionPanel'

// Custom styles for tab scrolling and cursor animations
const tabScrollStyles = `
  .tab-scroll-container {
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
    transition: scrollbar-color 0.3s ease;
  }
  .tab-scroll-container:hover { scrollbar-color: rgba(0, 0, 0, 0.2) transparent; }
  .dark .tab-scroll-container:hover { scrollbar-color: rgba(255, 255, 255, 0.2) transparent; }
  .tab-scroll-container::-webkit-scrollbar { height: 4px; }
  .tab-scroll-container::-webkit-scrollbar-track { background: transparent; }
  .tab-scroll-container::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 2px;
    transition: background 0.3s ease;
  }
  .tab-scroll-container:hover::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.2); }
  .dark .tab-scroll-container:hover::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); }

  @keyframes cursorBlink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0.4; }
  }

  .remote-cursor-widget {
    position: absolute;
    pointer-events: none;
    z-index: 1000;
  }

  .remote-cursor-line {
    width: 2px;
    height: 1.2em;
    animation: cursorBlink 1s ease-in-out infinite;
  }

  .remote-cursor-label {
    position: absolute;
    bottom: 100%;
    left: 0;
    transform: translateY(-4px);
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    color: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  }
`

// ============================================
// INTERFACES
// ============================================

interface ProblemData {
  id: number
  leetcode_id: number
  title: string
  title_slug: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  description: string
  examples: Array<{ id: number; content: string }>
  constraints: string[]
  topic_tags: Array<{ name: string; slug: string }>
  acceptance_rate: number
  code_snippets: Array<{
    code: string
    lang: string
    langSlug: string
  }>
}

interface Example { id: number; content: string }

interface TestCase {
  input: string
  expectedOutput: string
  explanation?: string
}

interface Submission {
  code: string
  language: string
  timestamp: Date
  testsPassed: number
  totalTests: number
  status?: string
  runtime?: string
  memory?: string
}

interface Collaborator {
  id: string
  name: string
  color: string
  cursor: { line: number; column: number } | null
  selection: {
    startLine: number
    startColumn: number
    endLine: number
    endColumn: number
  } | null
}

interface ChatMessage {
  id: string
  userId: string
  userName: string
  userColor?: string
  text: string
  timestamp: Date
}

// ============================================
// COLLABORATION HOOK
// ============================================

const useCollaboration = (roomId: string, problemId: number, userId: string, userName: string) => {
  const supabase = createClient()
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [syncedCode, setSyncedCode] = useState<string>('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const userColor = useRef(`hsl(${Math.random() * 360}, 70%, 60%)`)

  useEffect(() => {
    if (!roomId || !userId) return

    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: userId },
      },
    })

    // Track presence (who's in the room)
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users = Object.values(state).flat() as Collaborator[]
        setCollaborators(users)
        setIsConnected(true)
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('👋 User joined:', newPresences)
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('👋 User left:', leftPresences)
      })

    // Broadcast code changes
    channel.on('broadcast', { event: 'code-change' }, (payload: any) => {
      if (payload.payload.userId !== userId) {
        setSyncedCode(payload.payload.code)
      }
    })

    // Broadcast cursor position
    channel.on('broadcast', { event: 'cursor-move' }, (payload: any) => {
      console.log('📥 Received cursor update:', payload.payload)
      if (payload.payload.userId !== userId) {
        setCollaborators((prev) =>
          prev.map((c) =>
            c.id === payload.payload.userId
              ? { ...c, cursor: payload.payload.cursor, selection: payload.payload.selection }
              : c
          )
        )
      }
    })

    // Chat messages
    channel.on('broadcast', { event: 'chat-message' }, (payload: any) => {
      if (payload.payload.userId !== userId) {
        setMessages((prev) => [...prev, payload.payload.message])
      }
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          id: userId,
          name: userName,
          color: userColor.current,
          cursor: null,
        })
      }
    })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
    }
  }, [roomId, userId, userName, supabase])

  const broadcastCode = useCallback(
    (code: string) => {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'code-change',
          payload: { userId, code },
        })
      }
    },
    [userId]
  )

  const broadcastCursor = useCallback(
    (position: { line: number; column: number }, selection?: {
      startLine: number
      startColumn: number
      endLine: number
      endColumn: number
    } | null) => {
      if (channelRef.current) {
        console.log('📡 Broadcasting cursor:', { userId, position, selection })
        channelRef.current.send({
          type: 'broadcast',
          event: 'cursor-move',
          payload: { userId, cursor: position, selection: selection || null },
        })
      }
    },
    [userId]
  )

  const sendChatMessage = useCallback(
    (text: string) => {
      const message: ChatMessage = {
        id: Date.now().toString(),
        userId,
        userName,
        userColor: userColor.current,
        text,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, message])
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'chat-message',
          payload: { userId, message },
        })
      }
    },
    [userId, userName]
  )

  return {
    collaborators,
    isConnected,
    syncedCode,
    messages,
    broadcastCode,
    broadcastCursor,
    sendChatMessage,
    userColor: userColor.current,
  }
}

// ============================================
// COLLABORATION SIDEBAR COMPONENT
// ============================================

interface CollaborationSidebarProps {
  roomId: string
  collaborators: Collaborator[]
  messages: ChatMessage[]
  currentUserId: string
  currentUserColor: string
  onClose: () => void
  onSendMessage: (text: string) => void
}

const CollaborationSidebar: React.FC<CollaborationSidebarProps> = ({
  roomId,
  collaborators,
  messages,
  currentUserId,
  currentUserColor,
  onClose,
  onSendMessage,
}) => {
  const [copied, setCopied] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const copyRoomLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendMessage = () => {
    if (!newMessage.trim()) return
    onSendMessage(newMessage)
    setNewMessage('')
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

    // Helper function to get user color
  const getUserColor = (userId: string, userName: string, messageColor?: string) => {
    // First try to use the color from the message itself
    if (messageColor) return messageColor
    
    // Then try to find the user in collaborators
    const collaborator = collaborators.find(c => c.id === userId)
    if (collaborator) return collaborator.color
    
    // If it's the current user, use their color
    if (userId === currentUserId) return currentUserColor
    
    // Fallback to default
    return 'hsl(200, 70%, 60%)'
  }

  return (
    <div className="h-full flex flex-col bg-background border-l">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Users className="w-4 h-4" />
          Collaboration
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Room Link */}
      <div className="p-4 border-b space-y-2">
        <label className="text-xs text-muted-foreground">Share Room Link</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={`...?room=${roomId}`}
            readOnly
            className="flex-1 bg-muted border rounded px-3 py-2 text-sm"
          />
          <Button onClick={copyRoomLink} size="sm" variant="secondary">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Active Users */}
      <div className="p-4 border-b">
        <h4 className="text-xs text-muted-foreground mb-3 uppercase tracking-wide">
          Active Users ({collaborators.length})
        </h4>
        <div className="space-y-2">
          {collaborators.map((user) => (
            <div key={user.id} className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white"
                style={{ backgroundColor: user.color }}
              >
                {user.name[0].toUpperCase()}
              </div>
              <span className="text-sm">{user.name}</span>
              {user.id === currentUserId && (
                <span className="text-xs text-muted-foreground ml-auto">(you)</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-3 border-b">
          <h4 className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <MessageSquare className="w-3 h-3" />
            Team Chat
          </h4>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No messages yet. Start the conversation!
            </p>
          ) : (
            messages.map((msg) => {
              const userColor = getUserColor(msg.userId, msg.userName, msg.userColor)
              return (
              <div key={msg.id} className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-primary" style={{ color: userColor }}>{msg.userName}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-sm">{msg.text}</p>
              </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 border-t">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-muted border rounded px-3 py-2 text-sm"
            />
            <Button onClick={handleSendMessage} size="sm">
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// HELPERS
// ============================================

const parseExamplesToTestCases = (examples: Example[] | undefined): TestCase[] => {
  if (!examples) return [];
  
  return examples.map(example => {
    const content = example.content
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .trim();
    
    const inputMatch = content.match(/Input:\s*([^\n]+(?:\n(?!Output:)[^\n]+)*)/);
    const input = inputMatch ? inputMatch[1].trim() : '';
    
    const outputMatch = content.match(/Output:\s*([^\n]+)/);
    const expectedOutput = outputMatch ? outputMatch[1].trim() : '';
    
    const explanationMatch = content.match(/Explanation:\s*(.+?)$/s);
    const explanation = explanationMatch ? explanationMatch[1].trim() : undefined;
    
    return { 
      input, 
      expectedOutput, 
      explanation 
    };
  }).filter(tc => tc.input && tc.expectedOutput);
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function ProblemPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const monaco = useMonaco()
  const supabase = createClient()

  // State
  const [problem, setProblem] = useState<ProblemData | null>(null)
  const [testcases, setTestcases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allOfUsersSubmissions, setAllOfUsersSubmissions] = useState<any[]>([])
  const [latestUserSubmission, setLatestUserSubmission] = useState<any>(undefined)
  const [session, setSession] = useState<any>(null)
  
  // Collaboration state
  const [showCollabSidebar, setShowCollabSidebar] = useState(false)
  const [showRemoteCursors, setShowRemoteCursors] = useState(true)
  const [roomId, setRoomId] = useState<string>('')
  const [editorInstance, setEditorInstance] = useState<editor.IStandaloneCodeEditor | null>(null)
  const cursorWidgetsRef = useRef<Map<string, editor.IContentWidget>>(new Map())
  const selectionDecorationsRef = useRef<Map<string, string[]>>(new Map())
  
  // Language & code
  const [userLang, setUserLang] = useState({
    id: 92,
    name: 'Python (3.11.2)',
    value: 'python',
  })
  const [usersCode, setUsersCode] = useState<string | undefined>(undefined)

  // AI
  const [aiSubmission, setAiSubmission] = useState<Submission | null>(null)

  // Get session
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
    }
    getSession()
  }, [supabase])

  // Generate or join room ID
  useEffect(() => {
    if (params.id && session?.user?.id) {
      // Check if there's a room parameter in the URL
      const urlRoomId = searchParams.get('room')
      if (urlRoomId) {
        setRoomId(urlRoomId)
      } else {
        // Generate a default room for this problem
        const defaultRoom = `problem-${params.id}`
        setRoomId(defaultRoom)
      }
    }
  }, [params.id, session?.user?.id, searchParams])

  // Collaboration hook
  const {
    collaborators,
    isConnected,
    syncedCode,
    messages,
    broadcastCode,
    broadcastCursor,
    sendChatMessage,
    userColor,
  } = useCollaboration(
    roomId,
    Number(params.id),
    session?.user?.id || 'anonymous',
    session?.user?.email?.split('@')[0] || 'Anonymous'
  )

  // Sync collaboration code with local code
  useEffect(() => {
    if (syncedCode && syncedCode !== usersCode) {
      setUsersCode(syncedCode)
    }
  }, [syncedCode])

  // Render remote cursors using Monaco Content Widgets
  useEffect(() => {
    if (!editorInstance || !monaco) {
      console.log('❌ Cannot render cursors - missing:', { 
        hasEditor: !!editorInstance, 
        hasMonaco: !!monaco 
      })
      return
    }

    // If cursors are disabled, remove all widgets and stop
    if (!showRemoteCursors) {
      console.log('👁️ Remote cursors hidden by user')
      cursorWidgetsRef.current.forEach((widget, id) => {
        editorInstance.removeContentWidget(widget)
      })
      cursorWidgetsRef.current.clear()
      
      // Also remove all selection decorations
      selectionDecorationsRef.current.forEach((decorations, userId) => {
        editorInstance.deltaDecorations(decorations, [])
      })
      selectionDecorationsRef.current.clear()
      return
    }

    const remoteCursors = collaborators.filter(c => c.cursor && c.id !== session?.user?.id)
    console.log('👥 Rendering cursors for:', remoteCursors.map(c => ({ 
      name: c.name, 
      pos: c.cursor,
      color: c.color,
      selection: c.selection
    })))

    // Remove widgets for users who left or no longer have cursors
    const activeUserIds = new Set(remoteCursors.map(c => c.id))
    cursorWidgetsRef.current.forEach((widget, userId) => {
      if (!activeUserIds.has(userId)) {
        editorInstance.removeContentWidget(widget)
        cursorWidgetsRef.current.delete(userId)
      }
    })

    // Remove selection decorations for users who left
    selectionDecorationsRef.current.forEach((decorations, userId) => {
      if (!activeUserIds.has(userId)) {
        editorInstance.deltaDecorations(decorations, [])
        selectionDecorationsRef.current.delete(userId)
      }
    })

    // Add or update widgets and selections for active remote cursors
    remoteCursors.forEach(collaborator => {
      const position = collaborator.cursor!
      const widgetId = `cursor-widget-${collaborator.id}`

      // Remove old widget if exists
      const existingWidget = cursorWidgetsRef.current.get(collaborator.id)
      if (existingWidget) {
        editorInstance.removeContentWidget(existingWidget)
      }

      // Create cursor widget
      const cursorWidget: editor.IContentWidget = {
        getId: () => widgetId,
        getDomNode: () => {
          const container = document.createElement('div')
          container.className = 'remote-cursor-widget'
          container.style.cssText = 'pointer-events: none; z-index: 1000;'

          // Cursor line
          const cursorLine = document.createElement('div')
          cursorLine.className = 'remote-cursor-line'
          cursorLine.style.cssText = `
            width: 2px;
            height: 1.2em;
            background-color: ${collaborator.color};
            animation: cursorBlink 1s ease-in-out infinite;
          `

          // Cursor label
          const cursorLabel = document.createElement('div')
          cursorLabel.className = 'remote-cursor-label'
          cursorLabel.textContent = collaborator.name
          cursorLabel.style.cssText = `
            position: absolute;
            bottom: 100%;
            left: 0;
            transform: translateY(-4px);
            background-color: ${collaborator.color};
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 600;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          `

          container.appendChild(cursorLabel)
          container.appendChild(cursorLine)
          
          return container
        },
        getPosition: () => ({
          position: {
            lineNumber: position.line,
            column: position.column
          },
          preference: [monaco.editor.ContentWidgetPositionPreference.EXACT]
        })
      }

      editorInstance.addContentWidget(cursorWidget)
      cursorWidgetsRef.current.set(collaborator.id, cursorWidget)
      console.log('✅ Added cursor widget for:', collaborator.name)

      // Handle selection highlighting
      const oldDecorations = selectionDecorationsRef.current.get(collaborator.id) || []
      
      if (collaborator.selection) {
        const { startLine, startColumn, endLine, endColumn } = collaborator.selection
        
        // Convert the color to RGBA with transparency
        const colorMatch = collaborator.color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
        let backgroundColor = collaborator.color
        
        if (colorMatch) {
          const [, h, s, l] = colorMatch
          // Convert HSL to RGBA with 20% opacity
          backgroundColor = `hsla(${h}, ${s}%, ${l}%, 0.2)`
        }

        const newDecorations = editorInstance.deltaDecorations(oldDecorations, [
          {
            range: new monaco.Range(startLine, startColumn, endLine, endColumn),
            options: {
              className: `remote-selection-${collaborator.id}`,
              stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
              inlineClassName: `remote-selection-inline-${collaborator.id}`,
            }
          }
        ])
        
        selectionDecorationsRef.current.set(collaborator.id, newDecorations)
        
        // Inject dynamic CSS for this selection
        const styleId = `selection-style-${collaborator.id}`
        let styleElement = document.getElementById(styleId) as HTMLStyleElement
        
        if (!styleElement) {
          styleElement = document.createElement('style')
          styleElement.id = styleId
          document.head.appendChild(styleElement)
        }
        
        styleElement.textContent = `
          .monaco-editor .remote-selection-inline-${collaborator.id} {
            background-color: ${backgroundColor} !important;
          }
        `
      } else {
        // No selection, clear decorations
        if (oldDecorations.length > 0) {
          editorInstance.deltaDecorations(oldDecorations, [])
          selectionDecorationsRef.current.delete(collaborator.id)
          
          // Remove style element
          const styleId = `selection-style-${collaborator.id}`
          const styleElement = document.getElementById(styleId)
          if (styleElement) {
            styleElement.remove()
          }
        }
      }
    })

  }, [collaborators, editorInstance, monaco, session?.user?.id, showRemoteCursors])

  // Track cursor position and broadcast (with idle tracking)
  useEffect(() => {
    if (!editorInstance) return

    // Broadcast cursor position on change
    const cursorDisposable = editorInstance.onDidChangeCursorPosition((e) => {
      broadcastCursor({
        line: e.position.lineNumber,
        column: e.position.column,
      })
    })

    // Broadcast selection changes
    const selectionDisposable = editorInstance.onDidChangeCursorSelection((e) => {
      const selection = e.selection
      
      // Check if there's an actual selection (not just a cursor)
      if (selection.isEmpty()) {
        // No selection, just broadcast cursor with null selection
        broadcastCursor({
          line: selection.startLineNumber,
          column: selection.startColumn,
        }, null)
      } else {
        // There's a selection, broadcast both cursor and selection
        broadcastCursor({
          line: selection.endLineNumber,
          column: selection.endColumn,
        }, {
          startLine: selection.startLineNumber,
          startColumn: selection.startColumn,
          endLine: selection.endLineNumber,
          endColumn: selection.endColumn,
        })
      }
    })

    // Also broadcast on focus to show idle cursor position
    const focusDisposable = editorInstance.onDidFocusEditorText(() => {
      const position = editorInstance.getPosition()
      const selection = editorInstance.getSelection()
      if (position && selection) {
        if (selection.isEmpty()) {
          broadcastCursor({
            line: position.lineNumber,
            column: position.column,
          }, null)
        } else {
          broadcastCursor({
            line: position.lineNumber,
            column: position.column,
          }, {
            startLine: selection.startLineNumber,
            startColumn: selection.startColumn,
            endLine: selection.endLineNumber,
            endColumn: selection.endColumn,
          })
        }
      }
    })

    // Broadcast current position periodically (every 5 seconds) to maintain presence
    const intervalId = setInterval(() => {
      const position = editorInstance.getPosition()
      const selection = editorInstance.getSelection()
      if (position && selection && editorInstance.hasTextFocus()) {
        if (selection.isEmpty()) {
          broadcastCursor({
            line: position.lineNumber,
            column: position.column,
          }, null)
        } else {
          broadcastCursor({
            line: position.lineNumber,
            column: position.column,
          }, {
            startLine: selection.startLineNumber,
            startColumn: selection.startColumn,
            endLine: selection.endLineNumber,
            endColumn: selection.endColumn,
          })
        }
      }
    }, 5000)

    return () => {
      cursorDisposable.dispose()
      selectionDisposable.dispose()
      focusDisposable.dispose()
      clearInterval(intervalId)
    }
  }, [editorInstance, broadcastCursor])

  // Broadcast code changes
  const handleCodeChange = useCallback((code: string | undefined) => {
    setUsersCode(code)
    if (code && isConnected) {
      broadcastCode(code)
    }
  }, [isConnected, broadcastCode])

  // Proof of life
  useEffect(() => {
    console.log('🟢 PAGE.TSX mounted')
  }, [])

  // Monaco theme
  useEffect(() => {
    if (!monaco) return
    monaco.editor.defineTheme('caffeine-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: 'f2f2f2', background: '2d2d2d' },
        { token: 'comment', foreground: 'c5c5c5', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'f4d394' },
        { token: 'string', foreground: 'a8d191' },
        { token: 'number', foreground: 'd4a5c7' },
        { token: 'function', foreground: '8ec8d8' },
        { token: 'variable', foreground: 'f2f2f2' },
        { token: 'type', foreground: '8ec8d8' },
        { token: 'class', foreground: 'f4d394' },
      ],
      colors: {
        'editor.background': '#2d2d2d',
        'editor.foreground': '#f2f2f2',
        'editor.lineHighlightBackground': '#3a3a3a',
        'editorLineNumber.foreground': '#c5c5c5',
        'editorLineNumber.activeForeground': '#f2f2f2',
        'editor.selectionBackground': '#404040',
        'editor.inactiveSelectionBackground': '#353535',
        'editorCursor.foreground': '#f4d394',
        'editorWhitespace.foreground': '#404040',
        'editorIndentGuide.background': '#404040',
        'editorIndentGuide.activeBackground': '#505050',
      },
    })
    monaco.editor.setTheme('caffeine-dark')
  }, [monaco])

  // Fetch user's submissions for the left panel
  useEffect(() => {
    const fetchUsersSubmissions = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user?.id) return
        const { data, error } = await supabase
          .from('submissions')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('problem_id', params.id)
          .order('submitted_at', { ascending: false })
        if (error) throw error
        if (data) setAllOfUsersSubmissions(data)
      } catch (err) {
        console.error('Error fetching user submissions: ', err)
      }
    }
    fetchUsersSubmissions()
  }, [latestUserSubmission, params.id, supabase])

  // Fetch problem
  useEffect(() => {
    const fetchProblem = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('problems')
          .select('*')
          .eq('id', params.id)
          .single()
        if (error) throw error
        if (!data) {
          setError('Problem not found')
          return
        }
        setProblem(data as ProblemData)
        setTestcases(parseExamplesToTestCases(data.examples))
        if (!usersCode) {
          const starter = data.code_snippets?.find((s: any) => s.langSlug === userLang.value)?.code || ''
          setUsersCode(starter)
        }
      } catch (err) {
        console.error('Error fetching problem:', err)
        setError('Failed to load problem')
      } finally {
        setLoading(false)
      }
    }
    if (params.id) fetchProblem()
  }, [params.id, supabase])

  // Update starter code when language changes
  useEffect(() => {
    if (!problem?.code_snippets) return
    const starter = problem.code_snippets.find(s => s.langSlug === userLang.value)?.code || ''
    setUsersCode(starter)
  }, [userLang.value, problem])

  // Starter code getter (memoized)
  const getStarterCode = useCallback(() => {
    if (problem?.code_snippets) {
      return problem.code_snippets.find(snippet => snippet.langSlug === userLang.value)?.code || ''
    }
    return ''
  }, [problem?.code_snippets, userLang.value])

  // AI message analytics (optional)
  const handleAIChatMessage = (message: string) => {
    console.log('💬 AIChatbot user msg:', message)
  }

  // Receive normalized submission from editor → unlock AIChatbot
  const handleSubmissionComplete = async (submission: Submission) => {
    console.log('✅ handleSubmissionComplete:', {
      lang: submission.language,
      tests: `${submission.testsPassed}/${submission.totalTests}`,
      status: submission.status,
    })
    setAiSubmission(submission)
    setLatestUserSubmission({ _ts: Date.now() })
  }

  // Loading / Error UI
  if (loading) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-muted-foreground">Loading problem...</p>
        </div>
      </div>
    )
  }

  if (error || !problem) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-xl text-destructive">{error || 'Problem not found'}</p>
          <Button onClick={() => router.push('/problems')}>Back to Problems</Button>
        </div>
      </div>
    )
  }

  // Render
  return (
    <div className="caffeine-theme h-screen w-full bg-background flex flex-col overflow-hidden">
      <style jsx global>{tabScrollStyles}</style>
      
      {/* Collaboration Header Bar */}
      <div className="h-12 bg-muted/50 border-b flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold text-sm">Live Collaboration</h2>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Collaborator Avatars */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {collaborators.slice(0, 3).map((user) => (
                <div
                  key={user.id}
                  className="w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-xs font-medium text-white"
                  style={{ backgroundColor: user.color }}
                  title={user.name}
                >
                  {user.name[0].toUpperCase()}
                </div>
              ))}
            </div>
            {collaborators.length > 3 && (
              <span className="text-xs text-muted-foreground">+{collaborators.length - 3}</span>
            )}
          </div>

          {/* Toggle Cursors Button */}
          <Button
            onClick={() => setShowRemoteCursors(!showRemoteCursors)}
            size="sm"
            variant={showRemoteCursors ? 'default' : 'outline'}
            title={showRemoteCursors ? 'Hide remote cursors' : 'Show remote cursors'}
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              {showRemoteCursors ? (
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </>
              ) : (
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </>
              )}
            </svg>
            {showRemoteCursors ? 'Cursors On' : 'Cursors Off'}
          </Button>

          {/* Toggle Sidebar Button */}
          <Button
            onClick={() => setShowCollabSidebar(!showCollabSidebar)}
            size="sm"
            variant={showCollabSidebar ? 'default' : 'outline'}
          >
            <Users className="w-4 h-4 mr-2" />
            {showCollabSidebar ? 'Hide' : 'Show'} Collaboration
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-2 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* LEFT: Problem Description & history */}
          <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
            <ProblemDescriptionPanel
              problem={problem}
              allOfUsersSubmissions={allOfUsersSubmissions}
              onCopyToEditor={setUsersCode}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* MIDDLE: Editor + Testcases UI */}
          <ResizablePanel defaultSize={45} minSize={30}>
            <CodeEditorPanel
              problem={problem}
              testcases={testcases}
              userLang={userLang}
              setUserLang={setUserLang}
              usersCode={usersCode}
              setUsersCode={handleCodeChange}
              getStarterCode={getStarterCode}
              onSubmissionComplete={handleSubmissionComplete}
              onEditorMount={setEditorInstance}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* RIGHT: AI Chatbot OR Collaboration Sidebar */}
          {showCollabSidebar ? (
            <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
              <CollaborationSidebar
                roomId={roomId}
                collaborators={collaborators}
                messages={messages}
                currentUserId={session?.user?.id || 'anonymous'}
                currentUserColor={userColor}
                onClose={() => setShowCollabSidebar(false)}
                onSendMessage={sendChatMessage}
              />
            </ResizablePanel>
          ) : (
            <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
              <AIChatbot
                problemId={problem.id}
                problemTitle={problem.title}
                problemDescription={problem.description}
                problemDifficulty={problem.difficulty}
                submission={aiSubmission}
                onMessageSent={handleAIChatMessage}
              />
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  )
}