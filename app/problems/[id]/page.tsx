'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Loader2, Users, Copy, Check, X, MessageSquare, MessageCircle, Trash2, Send, Pencil, Brush } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMonaco } from '@monaco-editor/react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { editor } from 'monaco-editor'

// Import separated components
import AIChatbot from '@/components/problems/AIChatbot'
import CodeEditorPanel from '@/components/problems/CodeEditorPanel'
import ProblemDescriptionPanel from '@/components/problems/ProblemDescriptionPanel'
import CollaborativeWhiteboard from '@/components/mock-interview/collaborative-whiteboard'

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

  .annotation-widget {
    pointer-events: auto;
    z-index: 999;
  }

  .annotation-icon {
    cursor: pointer;
    transition: transform 0.2s;
  }

  .annotation-icon:hover {
    transform: scale(1.2);
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

interface AnnotationComment {
  id: string
  userId: string
  userName: string
  userColor: string
  text: string
  timestamp: Date
}

interface Annotation {
  id: string
  lineNumber: number
  userId: string
  userName: string
  userColor: string
  text: string
  timestamp: Date
  comments: AnnotationComment[]
  resolved: boolean
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
  const [annotations, setAnnotations] = useState<Annotation[]>([])
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

    // Annotation events
    channel.on('broadcast', { event: 'annotation-add' }, (payload: any) => {
      if (payload.payload.userId !== userId) {
        setAnnotations((prev) => [...prev, payload.payload.annotation])
      }
    })

    channel.on('broadcast', { event: 'annotation-comment' }, (payload: any) => {
      if (payload.payload.userId !== userId) {
        setAnnotations((prev) =>
          prev.map((ann) =>
            ann.id === payload.payload.annotationId
              ? { ...ann, comments: [...ann.comments, payload.payload.comment] }
              : ann
          )
        )
      }
    })

    channel.on('broadcast', { event: 'annotation-delete' }, (payload: any) => {
      if (payload.payload.userId !== userId) {
        setAnnotations((prev) => prev.filter((ann) => ann.id !== payload.payload.annotationId))
      }
    })

    channel.on('broadcast', { event: 'annotation-resolve' }, (payload: any) => {
      if (payload.payload.userId !== userId) {
        setAnnotations((prev) =>
          prev.map((ann) =>
            ann.id === payload.payload.annotationId
              ? { ...ann, resolved: payload.payload.resolved }
              : ann
          )
        )
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

  const addAnnotation = useCallback(
    (lineNumber: number, text: string) => {
      const annotation: Annotation = {
        id: `${userId}-${Date.now()}`,
        lineNumber,
        userId,
        userName,
        userColor: userColor.current,
        text,
        timestamp: new Date(),
        comments: [],
        resolved: false,
      }
      setAnnotations((prev) => [...prev, annotation])
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'annotation-add',
          payload: { userId, annotation },
        })
      }
      return annotation.id
    },
    [userId, userName]
  )

  const addAnnotationComment = useCallback(
    (annotationId: string, text: string) => {
      const comment: AnnotationComment = {
        id: `${userId}-${Date.now()}`,
        userId,
        userName,
        userColor: userColor.current,
        text,
        timestamp: new Date(),
      }
      setAnnotations((prev) =>
        prev.map((ann) =>
          ann.id === annotationId
            ? { ...ann, comments: [...ann.comments, comment] }
            : ann
        )
      )
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'annotation-comment',
          payload: { userId, annotationId, comment },
        })
      }
    },
    [userId, userName]
  )

  const deleteAnnotation = useCallback(
    (annotationId: string) => {
      setAnnotations((prev) => prev.filter((ann) => ann.id !== annotationId))
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'annotation-delete',
          payload: { userId, annotationId },
        })
      }
    },
    [userId]
  )

  const toggleAnnotationResolved = useCallback(
    (annotationId: string) => {
      setAnnotations((prev) =>
        prev.map((ann) =>
          ann.id === annotationId ? { ...ann, resolved: !ann.resolved } : ann
        )
      )
      const annotation = annotations.find((a) => a.id === annotationId)
      if (annotation && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'annotation-resolve',
          payload: { userId, annotationId, resolved: !annotation.resolved },
        })
      }
    },
    [userId, annotations]
  )

  return {
    collaborators,
    isConnected,
    syncedCode,
    messages,
    annotations,
    broadcastCode,
    broadcastCursor,
    sendChatMessage,
    addAnnotation,
    addAnnotationComment,
    deleteAnnotation,
    toggleAnnotationResolved,
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
  annotations: Annotation[]
  currentUserId: string
  currentUserColor: string
  onClose: () => void
  onSendMessage: (text: string) => void
  onAnnotationComment: (annotationId: string, text: string) => void
  onAnnotationDelete: (annotationId: string) => void
  onAnnotationResolve: (annotationId: string) => void
  onJumpToAnnotation: (lineNumber: number) => void
}

const CollaborationSidebar: React.FC<CollaborationSidebarProps> = ({
  roomId,
  collaborators,
  messages,
  annotations,
  currentUserId,
  currentUserColor,
  onClose,
  onSendMessage,
  onAnnotationComment,
  onAnnotationDelete,
  onAnnotationResolve,
  onJumpToAnnotation,
}) => {
  const [copied, setCopied] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'chat' | 'annotations'>('chat')
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({})
  const [showResolved, setShowResolved] = useState(false)
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

  const handleAddComment = (annotationId: string) => {
    const text = commentText[annotationId]
    if (!text?.trim()) return
    onAnnotationComment(annotationId, text)
    setCommentText((prev) => ({ ...prev, [annotationId]: '' }))
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const getUserColor = (userId: string, userName: string, messageColor?: string) => {
    if (messageColor) return messageColor
    const collaborator = collaborators.find(c => c.id === userId)
    if (collaborator) return collaborator.color
    if (userId === currentUserId) return currentUserColor
    return 'hsl(200, 70%, 60%)'
  }

  const filteredAnnotations = showResolved
    ? annotations
    : annotations.filter((a) => !a.resolved)

  const unresolvedCount = annotations.filter((a) => !a.resolved).length

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

      {/* Tabs */}
      <div className="flex border-b">
        <button
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'chat'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare className="w-4 h-4 inline mr-2" />
          Chat
        </button>
        <button
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'annotations'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('annotations')}
        >
          <MessageCircle className="w-4 h-4 inline mr-2" />
          Comments
          {unresolvedCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
              {unresolvedCount}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === 'chat' ? (
          <>
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
                        <span className="text-xs font-medium" style={{ color: userColor }}>
                          {msg.userName}
                        </span>
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
          </>
        ) : (
          <>
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showResolved"
                  checked={showResolved}
                  onChange={(e) => setShowResolved(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="showResolved" className="text-xs text-muted-foreground cursor-pointer">
                  Show resolved
                </label>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {filteredAnnotations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No {!showResolved && 'unresolved '}comments yet. Click the line numbers in the editor to add one!
                </p>
              ) : (
                filteredAnnotations
                  .sort((a, b) => a.lineNumber - b.lineNumber)
                  .map((annotation) => (
                    <div
                      key={annotation.id}
                      className={`border rounded-lg p-3 space-y-2 ${
                        annotation.resolved ? 'opacity-60 bg-muted/50' : 'bg-card'
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onJumpToAnnotation(annotation.lineNumber)}
                              className="text-xs font-mono bg-muted px-2 py-0.5 rounded hover:bg-muted/80 transition-colors"
                            >
                              Line {annotation.lineNumber}
                            </button>
                            <span
                              className="text-xs font-medium"
                              style={{ color: annotation.userColor }}
                            >
                              {annotation.userName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(annotation.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-sm mt-2">{annotation.text}</p>
                        </div>
                        
                        {annotation.userId === currentUserId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onAnnotationDelete(annotation.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>

                      {/* Comments */}
                      {annotation.comments.length > 0 && (
                        <div className="space-y-2 pl-3 border-l-2 border-muted">
                          {annotation.comments.map((comment) => (
                            <div key={comment.id} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-xs font-medium"
                                  style={{ color: comment.userColor }}
                                >
                                  {comment.userName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(comment.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <p className="text-sm">{comment.text}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentText[annotation.id] || ''}
                          onChange={(e) =>
                            setCommentText((prev) => ({
                              ...prev,
                              [annotation.id]: e.target.value,
                            }))
                          }
                          onKeyPress={(e) =>
                            e.key === 'Enter' && handleAddComment(annotation.id)
                          }
                          placeholder="Reply..."
                          className="flex-1 bg-muted border rounded px-2 py-1 text-xs"
                        />
                        <Button
                          onClick={() => handleAddComment(annotation.id)}
                          size="sm"
                          className="h-7 px-2"
                        >
                          <Send className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* Resolve button */}
                      <Button
                        variant={annotation.resolved ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => onAnnotationResolve(annotation.id)}
                        className="w-full h-7 text-xs"
                      >
                        {annotation.resolved ? 'Unresolve' : 'Resolve'}
                      </Button>
                    </div>
                  ))
              )}
            </div>
          </>
        )}
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
  const annotationWidgetsRef = useRef<Map<string, editor.IContentWidget>>(new Map())
  const annotationDecorationsRef = useRef<string[]>([])
  
  // Annotation modal state
  const [showAnnotationModal, setShowAnnotationModal] = useState(false)
  const [annotationLineNumber, setAnnotationLineNumber] = useState<number | null>(null)
  const [annotationText, setAnnotationText] = useState('')
  
  // Whiteboard
  const [showWhiteboard, setShowWhiteboard] = useState(false)

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
      const urlRoomId = searchParams.get('room')
      if (urlRoomId) {
        setRoomId(urlRoomId)
      } else {
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
    annotations,
    broadcastCode,
    broadcastCursor,
    sendChatMessage,
    addAnnotation,
    addAnnotationComment,
    deleteAnnotation,
    toggleAnnotationResolved,
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

  // Handle adding annotation on line number click
  const handleAddAnnotation = useCallback((lineNumber: number) => {
    setAnnotationLineNumber(lineNumber)
    setAnnotationText('')
    setShowAnnotationModal(true)
  }, [])

  const handleSubmitAnnotation = useCallback(() => {
    if (annotationText.trim() && annotationLineNumber) {
      addAnnotation(annotationLineNumber, annotationText)
      setShowAnnotationModal(false)
      setAnnotationText('')
      setAnnotationLineNumber(null)
    }
  }, [annotationText, annotationLineNumber, addAnnotation])

  const handleCancelAnnotation = useCallback(() => {
    setShowAnnotationModal(false)
    setAnnotationText('')
    setAnnotationLineNumber(null)
  }, [])

  // Handle jumping to annotation line
  const handleJumpToAnnotation = useCallback((lineNumber: number) => {
    if (editorInstance) {
      editorInstance.revealLineInCenter(lineNumber)
      editorInstance.setPosition({ lineNumber, column: 1 })
      editorInstance.focus()
    }
  }, [editorInstance])

  // Render annotation icons in gutter
  useEffect(() => {
    if (!editorInstance || !monaco) return

    // Remove old widgets
    annotationWidgetsRef.current.forEach((widget) => {
      editorInstance.removeContentWidget(widget)
    })
    annotationWidgetsRef.current.clear()

    // Remove old decorations
    if (annotationDecorationsRef.current.length > 0) {
      editorInstance.deltaDecorations(annotationDecorationsRef.current, [])
      annotationDecorationsRef.current = []
    }

    // Group annotations by line
    const annotationsByLine = annotations.reduce((acc, ann) => {
      if (!acc[ann.lineNumber]) acc[ann.lineNumber] = []
      acc[ann.lineNumber].push(ann)
      return acc
    }, {} as { [line: number]: Annotation[] })

    // Add decorations for annotated lines
    const decorations = Object.keys(annotationsByLine).map((lineStr) => {
      const lineNumber = parseInt(lineStr)
      const lineAnnotations = annotationsByLine[lineNumber]
      const hasUnresolved = lineAnnotations.some((a) => !a.resolved)
      
      return {
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          className: hasUnresolved ? 'annotation-line-highlight' : 'annotation-line-resolved',
          glyphMarginClassName: hasUnresolved ? 'annotation-glyph' : 'annotation-glyph-resolved',
        }
      }
    })

    annotationDecorationsRef.current = editorInstance.deltaDecorations([], decorations)

    // Add CSS for decorations
    const styleId = 'annotation-styles'
    let styleElement = document.getElementById(styleId) as HTMLStyleElement
    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = styleId
      document.head.appendChild(styleElement)
    }
    
    styleElement.textContent = `
      .annotation-line-highlight {
        background-color: rgba(59, 130, 246, 0.1) !important;
      }
      .annotation-line-resolved {
        background-color: rgba(34, 197, 94, 0.05) !important;
      }
      .annotation-glyph {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233b82f6'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z'/%3E%3C/svg%3E") !important;
        background-repeat: no-repeat !important;
        background-size: 16px 16px !important;
        background-position: center !important;
        cursor: pointer !important;
      }
      .annotation-glyph-resolved {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2322c55e'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/%3E%3C/svg%3E") !important;
        background-repeat: no-repeat !important;
        background-size: 16px 16px !important;
        background-position: center !important;
        cursor: pointer !important;
        opacity: 0.5 !important;
      }
    `

    // Add click handler for glyph margin
    const clickDisposable = editorInstance.onMouseDown((e) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const lineNumber = e.target.position?.lineNumber
        if (lineNumber && annotationsByLine[lineNumber]) {
          // Line already has annotations, show them in sidebar
          setShowCollabSidebar(true)
          handleJumpToAnnotation(lineNumber)
        }
      }
    })

    return () => {
      clickDisposable.dispose()
    }
  }, [annotations, editorInstance, monaco, handleJumpToAnnotation])

  // Add line number click handler for creating annotations
  useEffect(() => {
    if (!editorInstance || !monaco) return

    const clickDisposable = editorInstance.onMouseDown((e) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS) {
        const lineNumber = e.target.position?.lineNumber
        if (lineNumber) {
          handleAddAnnotation(lineNumber)
        }
      }
    })

    return () => {
      clickDisposable.dispose()
    }
  }, [editorInstance, monaco, handleAddAnnotation])

  // Render remote cursors using Monaco Content Widgets
  useEffect(() => {
    if (!editorInstance || !monaco) return

    if (!showRemoteCursors) {
      cursorWidgetsRef.current.forEach((widget) => {
        editorInstance.removeContentWidget(widget)
      })
      cursorWidgetsRef.current.clear()
      
      selectionDecorationsRef.current.forEach((decorations) => {
        editorInstance.deltaDecorations(decorations, [])
      })
      selectionDecorationsRef.current.clear()
      return
    }

    const remoteCursors = collaborators.filter(c => c.cursor && c.id !== session?.user?.id)

    const activeUserIds = new Set(remoteCursors.map(c => c.id))
    cursorWidgetsRef.current.forEach((widget, userId) => {
      if (!activeUserIds.has(userId)) {
        editorInstance.removeContentWidget(widget)
        cursorWidgetsRef.current.delete(userId)
      }
    })

    selectionDecorationsRef.current.forEach((decorations, userId) => {
      if (!activeUserIds.has(userId)) {
        editorInstance.deltaDecorations(decorations, [])
        selectionDecorationsRef.current.delete(userId)
      }
    })

    remoteCursors.forEach(collaborator => {
      const position = collaborator.cursor!
      const widgetId = `cursor-widget-${collaborator.id}`

      const existingWidget = cursorWidgetsRef.current.get(collaborator.id)
      if (existingWidget) {
        editorInstance.removeContentWidget(existingWidget)
      }

      const cursorWidget: editor.IContentWidget = {
        getId: () => widgetId,
        getDomNode: () => {
          const container = document.createElement('div')
          container.className = 'remote-cursor-widget'
          container.style.cssText = 'pointer-events: none; z-index: 1000;'

          const cursorLine = document.createElement('div')
          cursorLine.className = 'remote-cursor-line'
          cursorLine.style.cssText = `
            width: 2px;
            height: 1.2em;
            background-color: ${collaborator.color};
            animation: cursorBlink 1s ease-in-out infinite;
          `

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

      const oldDecorations = selectionDecorationsRef.current.get(collaborator.id) || []
      
      if (collaborator.selection) {
        const { startLine, startColumn, endLine, endColumn } = collaborator.selection
        
        const colorMatch = collaborator.color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
        let backgroundColor = collaborator.color
        
        if (colorMatch) {
          const [, h, s, l] = colorMatch
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
        if (oldDecorations.length > 0) {
          editorInstance.deltaDecorations(oldDecorations, [])
          selectionDecorationsRef.current.delete(collaborator.id)
          
          const styleId = `selection-style-${collaborator.id}`
          const styleElement = document.getElementById(styleId)
          if (styleElement) {
            styleElement.remove()
          }
        }
      }
    })

  }, [collaborators, editorInstance, monaco, session?.user?.id, showRemoteCursors])

  // Track cursor position and broadcast
  useEffect(() => {
    if (!editorInstance) return

    const cursorDisposable = editorInstance.onDidChangeCursorPosition((e) => {
      broadcastCursor({
        line: e.position.lineNumber,
        column: e.position.column,
      })
    })

    const selectionDisposable = editorInstance.onDidChangeCursorSelection((e) => {
      const selection = e.selection
      
      if (selection.isEmpty()) {
        broadcastCursor({
          line: selection.startLineNumber,
          column: selection.startColumn,
        }, null)
      } else {
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

  // Fetch user's submissions
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

  // Starter code getter
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

  return (
    <div className="caffeine-theme h-screen w-full bg-background flex flex-col overflow-hidden">
      <style jsx global>{tabScrollStyles}</style>
      
      {/* Annotation Modal */}
      {showAnnotationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCancelAnnotation}
          />
          
          {/* Modal */}
          <div className="relative bg-background border rounded-lg shadow-2xl w-full max-w-md mx-4 p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Add Comment</h3>
                <p className="text-sm text-muted-foreground">
                  Line {annotationLineNumber}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelAnnotation}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Your comment</label>
              <textarea
                value={annotationText}
                onChange={(e) => setAnnotationText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSubmitAnnotation()
                  }
                  if (e.key === 'Escape') {
                    handleCancelAnnotation()
                  }
                }}
                placeholder="What do you want to discuss about this line?"
                className="w-full min-h-[120px] bg-muted border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Press <kbd className="px-1.5 py-0.5 bg-muted border rounded text-xs">⌘</kbd> + <kbd className="px-1.5 py-0.5 bg-muted border rounded text-xs">Enter</kbd> to submit
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={handleCancelAnnotation}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitAnnotation}
                disabled={!annotationText.trim()}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Add Comment
              </Button>
            </div>
          </div>
        </div>
      )}
      
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
          {annotations.filter(a => !a.resolved).length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageCircle className="w-3 h-3" />
              <span>{annotations.filter(a => !a.resolved).length} unresolved</span>
            </div>
          )}
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
            variant={showRemoteCursors ? 'secondary' : 'outline'}
            title={showRemoteCursors ? 'Hide remote cursors' : 'Show remote cursors'}
            className='cursor-pointer'
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {showRemoteCursors ? (
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </>
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              )}
            </svg>
            {showRemoteCursors ? 'Cursors On' : 'Cursors Off'}
          </Button>

          {/* Toggle Sidebar Button */}
          <Button
            onClick={() => setShowCollabSidebar(!showCollabSidebar)}
            size="sm"
            variant={showCollabSidebar ? 'default' : 'outline'}
            className='cursor-pointer'
          >
            <Users className="w-4 h-4 mr-2" />
            {showCollabSidebar ? 'Hide' : 'Show'} Collaboration
          </Button>

          <Button
            onClick={() => setShowWhiteboard(!showWhiteboard)}
            size="sm"
            variant={showWhiteboard ? 'secondary' : 'outline'}
            className='cursor-pointer'
          >
            <Brush className="w-4 h-4" />
          </Button>

          {showWhiteboard && (
            <CollaborativeWhiteboard />
          )}

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
                annotations={annotations}
                currentUserId={session?.user?.id || 'anonymous'}
                currentUserColor={userColor}
                onClose={() => setShowCollabSidebar(false)}
                onSendMessage={sendChatMessage}
                onAnnotationComment={addAnnotationComment}
                onAnnotationDelete={deleteAnnotation}
                onAnnotationResolve={toggleAnnotationResolved}
                onJumpToAnnotation={handleJumpToAnnotation}
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