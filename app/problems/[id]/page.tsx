'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Loader2, Users, Copy, Check, X, MessageSquare, MessageCircle, Trash2, Send, Pencil, Brush, Video, VideoOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMonaco } from '@monaco-editor/react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { editor } from 'monaco-editor'
import { cn } from '@/lib/utils'

// Import separated components
import AIChatbot from '@/components/problems/AIChatbot'
import CodeEditorPanel from '@/components/problems/CodeEditorPanel'
import ProblemDescriptionPanel from '@/components/problems/ProblemDescriptionPanel'
import CollaborativeWhiteboard from '@/components/mock-interview/collaborative-whiteboard'

// Import live streaming hooks
import { useLiveStream } from '@/hooks/use-live-stream'
import { useLiveStreamViewer } from '@/hooks/use-live-stream-viewer'
import { StreamChat } from '@/components/live-streams/stream-chat'
import { useStreamChat } from '@/hooks/use-stream-chat'

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

const useCollaboration = (
  roomId: string, 
  problemId: number, 
  userId: string, 
  userName: string,
  enabled: boolean = false // NEW: Add enabled parameter with default false
) => {
  const supabase = createClient()
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [syncedCode, setSyncedCode] = useState<string>('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const userColor = useRef(`hsl(${Math.random() * 360}, 70%, 60%)`)

  useEffect(() => {
    // NEW: Early return if collaboration is not enabled
    if (!enabled || !roomId || !userId) {
      // Clean up if collaboration was previously enabled
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
      setCollaborators([])
      setIsConnected(false)
      setMessages([])
      setAnnotations([])
      return
    }

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
        const users = Object.values(state).flat().map((presence: any) => ({
          id: presence.userId || presence.id || '',
          name: presence.userName || presence.name || 'Anonymous',
          color: presence.color || userColor.current,
          cursor: presence.cursor || null,
          selection: presence.selection || null,
        })) as Collaborator[]
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
  }, [roomId, userId, userName, supabase, enabled]) // NEW: Add enabled to dependency array

  const broadcastCode = useCallback(
    (code: string) => {
      if (channelRef.current && enabled) { // NEW: Check if enabled
        channelRef.current.send({
          type: 'broadcast',
          event: 'code-change',
          payload: { userId, code },
        })
      }
    },
    [userId, enabled] // NEW: Add enabled to dependency
  )

  const broadcastCursor = useCallback(
    (position: { line: number; column: number }, selection?: {
      startLine: number
      startColumn: number
      endLine: number
      endColumn: number
    } | null) => {
      if (channelRef.current && enabled) { // NEW: Check if enabled
        channelRef.current.send({
          type: 'broadcast',
          event: 'cursor-move',
          payload: { userId, cursor: position, selection: selection || null },
        })
      }
    },
    [userId, enabled] // NEW: Add enabled to dependency
  )

  const broadcastWhiteboard = useCallback(
    (message: any) => {
      if (!channelRef.current) return
      channelRef.current.send({
        type: 'broadcast',
        event: 'whiteboard-update',
        payload: { userId, message },
      })
    },
    [userId]
  )

  const sendChatMessage = useCallback(
    (text: string) => {
      if (!enabled) return // NEW: Guard clause
      
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
    [userId, userName, enabled] // NEW: Add enabled to dependency
  )

  const addAnnotation = useCallback(
    (lineNumber: number, text: string) => {
      if (!enabled) return '' // NEW: Guard clause
      
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
    [userId, userName, enabled] // NEW: Add enabled to dependency
  )

  const addAnnotationComment = useCallback(
    (annotationId: string, text: string) => {
      if (!enabled) return // NEW: Guard clause
      
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
    [userId, userName, enabled] // NEW: Add enabled to dependency
  )

  const deleteAnnotation = useCallback(
    (annotationId: string) => {
      if (!enabled) return // NEW: Guard clause
      
      setAnnotations((prev) => prev.filter((ann) => ann.id !== annotationId))
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'annotation-delete',
          payload: { userId, annotationId },
        })
      }
    },
    [userId, enabled] // NEW: Add enabled to dependency
  )

  const toggleAnnotationResolved = useCallback(
    (annotationId: string) => {
      if (!enabled) return // NEW: Guard clause
      
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
    [userId, annotations, enabled] // NEW: Add enabled to dependency
  )

  return {
    collaborators,
    isConnected,
    syncedCode,
    messages,
    annotations,
    broadcastCode,
    broadcastCursor,
    broadcastWhiteboard,
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
    <div className="h-full flex flex-col bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl border-l-2 border-border/20">
      <div className="p-4 border-b border-border/20 flex items-center justify-between bg-gradient-to-r from-card/30 to-transparent">
        <h3 className="font-semibold flex items-center gap-2 text-foreground">
          <Users className="w-4 h-4 text-brand" />
          Collaboration
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-brand/10 transition-all">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Room Link */}
      <div className="p-4 border-b border-border/20 space-y-2">
        <label className="text-xs text-muted-foreground font-medium">Share Room Link</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={`...?room=${roomId}`}
            readOnly
            className="flex-1 bg-muted/50 border border-border/30 rounded-lg px-3 py-2 text-sm backdrop-blur-sm focus:border-brand/50 transition-colors"
          />
          <Button onClick={copyRoomLink} size="sm" variant="secondary" className="hover:scale-105 transition-transform">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Active Users */}
      <div className="p-4 border-b border-border/20">
        <h4 className="text-xs text-muted-foreground mb-3 uppercase tracking-wide font-semibold">
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
      <div className="flex border-b border-border/20">
        <button
          className={`flex-1 px-4 py-2 text-sm font-medium transition-all duration-300 ${
            activeTab === 'chat'
              ? 'border-b-2 border-brand text-brand bg-brand/5'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
          }`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare className="w-4 h-4 inline mr-2" />
          Chat
        </button>
        <button
          className={`flex-1 px-4 py-2 text-sm font-medium transition-all duration-300 relative ${
            activeTab === 'annotations'
              ? 'border-b-2 border-brand text-brand bg-brand/5'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
          }`}
          onClick={() => setActiveTab('annotations')}
        >
          <MessageCircle className="w-4 h-4 inline mr-2" />
          Comments
          {unresolvedCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-brand text-brand-foreground text-xs rounded-full shadow-lg shadow-brand/30">
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

            <div className="p-3 border-t border-border/20 bg-gradient-to-r from-muted/20 to-transparent">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-muted/50 border border-border/30 rounded-lg px-3 py-2 text-sm backdrop-blur-sm focus:border-brand/50 transition-colors"
                />
                <Button onClick={handleSendMessage} size="sm" className="bg-gradient-to-r from-brand to-orange-300 hover:from-brand/90 hover:to-orange-300/90 shadow-lg shadow-brand/30 transition-all">
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
                      className={`border-2 rounded-lg p-3 space-y-2 transition-all duration-300 ${
                        annotation.resolved
                          ? 'opacity-60 bg-muted/30 border-green-500/20'
                          : 'bg-card/50 border-brand/20 hover:border-brand/40 backdrop-blur-sm'
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
                        className={`w-full h-7 text-xs transition-all ${
                          annotation.resolved
                            ? 'hover:border-brand/50'
                            : 'bg-gradient-to-r from-brand to-orange-300 hover:from-brand/90 hover:to-orange-300/90 shadow-lg shadow-brand/30'
                        }`}
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
  const [collaborationEnabled, setCollaborationEnabled] = useState(false)
  
  // Annotation modal state
  const [showAnnotationModal, setShowAnnotationModal] = useState(false)
  const [annotationLineNumber, setAnnotationLineNumber] = useState<number | null>(null)
  const [annotationText, setAnnotationText] = useState('')
  
  // Whiteboard
  const [showWhiteboard, setShowWhiteboard] = useState(false)

  // Live streaming state
  const [showStreamPrompt, setShowStreamPrompt] = useState(false)
  const [hasCheckedForStream, setHasCheckedForStream] = useState(false)
  const [showStreamChat, setShowStreamChat] = useState(false)
  const [streamId, setStreamId] = useState<string | null>(null)
  const [streamChatMessages, setStreamChatMessages] = useState<Array<{
    id: string
    userId: string
    userName: string
    userColor?: string
    text: string
    timestamp: Date
  }>>([])

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
    broadcastWhiteboard,
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
    session?.user?.email?.split('@')[0] || 'Anonymous',
    collaborationEnabled
  )

  // Live streaming hooks
  const {
    isStreaming,
    viewers,
    streamId: currentStreamId,
    startStream,
    stopStream,
  } = useLiveStream(
    roomId,
    session?.user?.id || 'anonymous',
    session?.user?.email?.split('@')[0] || 'Anonymous',
    Number(params.id)
  )

  // Update streamId when it changes
  useEffect(() => {
    if (currentStreamId) {
      setStreamId(currentStreamId)
    } else {
      setStreamId(null)
      setShowStreamChat(false) // Close chat when stream ends
      setStreamChatMessages([]) // Clear messages when stream ends
    }
  }, [currentStreamId])

  // Keep chat connection alive even when chat is hidden (for streamer)
  // This ensures messages persist and connection stays active
  const { isConnected: isChatConnected, sendMessage: sendStreamChatMessage, messagesEndRef: chatMessagesEndRef } = useStreamChat(
    isStreaming && streamId ? streamId : '', // Only connect when streaming
    session?.user?.id || 'anonymous',
    session?.user?.email?.split('@')[0] || 'Anonymous',
    streamChatMessages,
    setStreamChatMessages
  )

  const {
    remoteStream,
    isConnected: isViewingStream,
    streamerName,
    joinStream,
    leaveStream,
  } = useLiveStreamViewer(
    roomId,
    session?.user?.id || 'anonymous',
    session?.user?.email?.split('@')[0] || 'Anonymous'
  )

  // Auto-join stream if available (only once)
  useEffect(() => {
    if (roomId && !hasCheckedForStream && !isStreaming && !isViewingStream) {
      setHasCheckedForStream(true)
      // Small delay to let presence sync
      const timer = setTimeout(() => {
        joinStream()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [roomId, hasCheckedForStream, isStreaming, isViewingStream, joinStream])

  // Fetch streamId for viewers (when viewing a stream)
  useEffect(() => {
    if (isViewingStream && roomId && !streamId) {
      // Fetch stream by roomId to get streamId
      const fetchStreamId = async () => {
        try {
          const response = await fetch(`/api/live-streams`)
          if (response.ok) {
            const data = await response.json()
            const activeStream = data.streams?.find((s: any) => s.room_id === roomId && s.is_active)
            if (activeStream) {
              setStreamId(activeStream.id)
            }
          }
        } catch (error) {
          console.error('Error fetching streamId:', error)
        }
      }
      fetchStreamId()
    }
  }, [isViewingStream, roomId, streamId])

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
    monaco.editor.setTheme('vs-dark')
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

  // Initialize starter code when problem loads (only once)
  useEffect(() => {
    if (!problem?.code_snippets) return
    const starter = problem.code_snippets.find(s => s.langSlug === userLang.value)?.code || ''
    setUsersCode(starter)
  }, [problem?.id]) // Only run when problem changes, not language

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
    <div className="caffeine-theme h-screen w-full bg-background flex flex-col overflow-hidden relative">
      <style jsx global>{tabScrollStyles}</style>

      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute top-[-10%] right-[20%] w-[500px] h-[500px] bg-brand/5 dark:bg-brand/8 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-[10%] left-[15%] w-[400px] h-[400px] bg-brand/3 dark:bg-brand/5 rounded-full blur-[80px] animate-float-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Stream Start Prompt Modal */}
      {showStreamPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setShowStreamPrompt(false)}
          />

          {/* Modal */}
          <div className="relative bg-gradient-to-br from-card/80 via-card/60 to-transparent backdrop-blur-xl border-2 border-border/30 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Video className="w-5 h-5 text-brand" />
                  Start Live Stream
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Share your screen so others can watch you code in real-time
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStreamPrompt(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium">What will be shared:</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Your entire screen or a specific window</li>
                  <li>System audio (if available)</li>
                  <li>Real-time video feed to all viewers in the room</li>
                </ul>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  <strong>Note:</strong> You'll be prompted to select which screen or window to share. 
                  Make sure to select the browser tab or window where you're coding.
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowStreamPrompt(false)}
                className="hover:bg-muted/80 transition-all"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await startStream()
                    setShowStreamPrompt(false)
                  } catch (error: any) {
                    console.error('Failed to start stream:', error)
                    // Error is already handled in the hook
                  }
                }}
                className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 shadow-lg shadow-purple-500/25 text-white transition-all"
              >
                <Video className="w-4 h-4 mr-2" />
                Start Streaming
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Annotation Modal - Only show when collaboration is enabled */}
      {collaborationEnabled && showAnnotationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={handleCancelAnnotation}
          />

          {/* Modal */}
          <div className="relative bg-gradient-to-br from-card/80 via-card/60 to-transparent backdrop-blur-xl border-2 border-border/30 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4 animate-in fade-in zoom-in duration-200">
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
                className="hover:bg-muted/80 transition-all"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitAnnotation}
                disabled={!annotationText.trim()}
                className="bg-gradient-to-r from-brand to-orange-300 hover:from-brand/90 hover:to-orange-300/90 text-brand-foreground shadow-lg shadow-brand/30 transition-all"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Add Comment
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Collaboration Header Bar - Only show when collaboration is enabled */}
      {collaborationEnabled && (
        <div className="relative z-10 h-12 from-card/80 via-card/50 to-transparent backdrop-blur-xl border-b border-border/20 flex items-center justify-between px-4 shadow-lg">
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
              className='cursor-pointer hover:scale-105 transition-all duration-300'
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
              className={`cursor-pointer hover:scale-105 transition-all duration-300 ${
                showCollabSidebar ? 'bg-gradient-to-r from-brand to-orange-300 hover:from-brand/90 hover:to-orange-300/90 shadow-lg shadow-brand/30' : ''
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              {showCollabSidebar ? 'Hide' : 'Show'} Collaboration
            </Button>

            <Button
              onClick={() => setShowWhiteboard(!showWhiteboard)}
              size="sm"
              variant={showWhiteboard ? 'secondary' : 'outline'}
              className='cursor-pointer hover:scale-105 transition-all duration-300'
            >
              <Brush className="w-4 h-4" />
            </Button>

            {/* Live Streaming Button - Dynamic */}
            {!isViewingStream && (
              <>
                <Button
                  onClick={isStreaming ? stopStream : () => setShowStreamPrompt(true)}
                  size="sm"
                  variant={isStreaming ? "destructive" : "default"}
                  className={cn(
                    "cursor-pointer hover:scale-105 transition-all duration-300",
                    !isStreaming && "bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 shadow-lg shadow-purple-500/25 text-white"
                  )}
                >
                  {isStreaming ? (
                    <>
                      <VideoOff className="w-4 h-4 mr-2" />
                      End Stream {viewers.length > 0 && `(${viewers.length})`}
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4 mr-2" />
                      Start Live Stream
                    </>
                  )}
                </Button>

                {/* Stream Chat Button - Only show when streaming */}
                {isStreaming && streamId && (
                  <Button
                    onClick={() => setShowStreamChat(!showStreamChat)}
                    size="sm"
                    variant={showStreamChat ? "secondary" : "default"}
                    className={cn(
                      "cursor-pointer hover:scale-105 transition-all duration-300",
                      !showStreamChat && "bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 shadow-lg shadow-purple-500/25 text-white"
                    )}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Chat {showStreamChat ? '(Hide)' : ''}
                  </Button>
                )}
              </>
            )}

            {isViewingStream && (
              <Button
                onClick={leaveStream}
                size="sm"
                variant="outline"
                className="cursor-pointer hover:scale-105 transition-all duration-300"
              >
                <VideoOff className="w-4 h-4 mr-2" />
                Leave Stream
              </Button>
            )}

            {/* Disable Collaboration Button */}
            <Button 
              onClick={() => setCollaborationEnabled(false)}
              size="sm"
              variant="destructive"
              className="cursor-pointer hover:scale-105 transition-all duration-300"
            >
              <X className="w-4 h-4 mr-2" />
              Disable
            </Button>
          </div>
        </div>
      )}

      {/* Enable Collaboration Button - Only show when collaboration is disabled */}
      {!collaborationEnabled && (
        <div className="relative z-10 h-12  from-card/80 via-card/50 to-transparent backdrop-blur-xl border-b border-border/20 flex items-center justify-between px-4 shadow-lg">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-xs text-muted-foreground">Collaboration Disabled</h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Whiteboard Button - Always visible */}
            <Button
              onClick={() => setShowWhiteboard(!showWhiteboard)}
              size="sm"
              variant={showWhiteboard ? 'secondary' : 'outline'}
              className='cursor-pointer hover:scale-105 transition-all duration-300'
            >
              <Brush className="w-4 h-4 mr-2" />
              {showWhiteboard ? 'Hide' : 'Show'} Whiteboard
            </Button>

            {/* Live Streaming Button - Always visible */}
            {!isViewingStream && (
              <>
                <Button
                  onClick={isStreaming ? stopStream : () => setShowStreamPrompt(true)}
                  size="sm"
                  variant={isStreaming ? "destructive" : "default"}
                  className={cn(
                    "cursor-pointer hover:scale-105 transition-all duration-300",
                    !isStreaming && "bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 shadow-lg shadow-purple-500/25 text-white"
                  )}
                >
                  {isStreaming ? (
                    <>
                      <VideoOff className="w-4 h-4 mr-2" />
                      End Stream {viewers.length > 0 && `(${viewers.length})`}
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4 mr-2" />
                      Start Live Stream
                    </>
                  )}
                </Button>

                {/* Stream Chat Button - Only show when streaming */}
                {isStreaming && streamId && (
                  <Button
                    onClick={() => setShowStreamChat(!showStreamChat)}
                    size="sm"
                    variant={showStreamChat ? "secondary" : "default"}
                    className={cn(
                      "cursor-pointer hover:scale-105 transition-all duration-300",
                      !showStreamChat && "bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 shadow-lg shadow-purple-500/25 text-white"
                    )}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Chat {showStreamChat ? '(Hide)' : ''}
                  </Button>
                )}
              </>
            )}

            {isViewingStream && (
              <Button
                onClick={leaveStream}
                size="sm"
                variant="outline"
                className="cursor-pointer hover:scale-105 transition-all duration-300"
              >
                <VideoOff className="w-4 h-4 mr-2" />
                Leave Stream
              </Button>
            )}

            <Button 
              onClick={() => setCollaborationEnabled(true)}
              size="sm"
              className="bg-gradient-to-r from-brand to-orange-300 hover:from-brand/90 hover:to-orange-300/90 shadow-lg shadow-brand/30 cursor-pointer hover:scale-105 transition-all duration-300"
            >
              <Users className="w-4 h-4 mr-2" />
              Enable Collaboration
            </Button>
          </div>
        </div>
      )}

      {/* Whiteboard - Always available, but only broadcasts when collaboration is enabled */}
      {showWhiteboard && (
        <CollaborativeWhiteboard
          initialPosition={{ x: 100, y: 150 }}
          initialSize={{ width: 600, height: 400 }}
          sendDataMessage={collaborationEnabled ? (msg) => {
            // Broadcast whiteboard updates through collaboration channel
            // The whiteboard component handles its own message format
            // This is a placeholder - in a full implementation, you'd need to
            // expose a broadcast function from useCollaboration or use Supabase directly
            console.log('Whiteboard message (would broadcast):', msg)
          } : undefined}
        />
      )}
      {/* Main Content Area */}
      <div className="relative z-10 flex-1 p-2 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* LEFT: Problem Description & history */}
          <ResizablePanel defaultSize={30} minSize={20} maxSize={60}>
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

          {/* RIGHT: Stream Chat OR AI Chatbot OR Collaboration Sidebar */}
          {isStreaming && streamId && showStreamChat ? (
            <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
              <StreamChat
                streamId={streamId}
                userId={session?.user?.id || 'anonymous'}
                userName={session?.user?.email?.split('@')[0] || 'Anonymous'}
                streamerId={isStreaming ? (session?.user?.id || undefined) : undefined}
                messages={streamChatMessages}
                onMessagesChange={setStreamChatMessages}
                sendMessage={sendStreamChatMessage}
                isConnected={isChatConnected}
                messagesEndRef={chatMessagesEndRef as React.RefObject<HTMLDivElement>}
              />
            </ResizablePanel>
          ) : collaborationEnabled && showCollabSidebar ? (
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

      {/* Live Stream Viewer - Floating video player */}
      {isViewingStream && remoteStream && (
        <div className="fixed bottom-4 right-4 w-96 h-64 bg-black rounded-lg overflow-hidden border-2 border-brand z-50 shadow-2xl">
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-2 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-medium text-white">
                  Live: {streamerName || 'Streamer'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={leaveStream}
                className="h-6 w-6 p-0 hover:bg-white/20"
              >
                <X className="w-3 h-3 text-white" />
              </Button>
            </div>
          </div>
          <video
            ref={(video) => {
              if (video && remoteStream) {
                video.srcObject = remoteStream
                video.play().catch(err => {
                  console.error('Error playing video:', err)
                })
              }
            }}
            autoPlay
            playsInline
            muted={false}
            className="w-full h-full object-contain"
            onLoadedMetadata={(e) => {
              const video = e.currentTarget
              video.play().catch(err => {
                console.error('Error playing video on metadata load:', err)
              })
            }}
          />
        </div>
      )}

    </div>
  )
}