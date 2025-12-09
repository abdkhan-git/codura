import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface ChatMessage {
  id: string
  userId: string
  userName: string
  userColor?: string
  text: string
  timestamp: Date
}

export function useStreamChat(
  streamId: string, 
  userId: string, 
  userName: string,
  externalMessages?: ChatMessage[],
  onMessagesChange?: (messages: ChatMessage[]) => void
) {
  const supabase = createClient()
  const [messages, setMessages] = useState<ChatMessage[]>(externalMessages || [])
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const userColor = useRef(`hsl(${Math.random() * 360}, 70%, 60%)`)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isUsingExternalState = !!onMessagesChange

  // Sync with external messages if provided
  useEffect(() => {
    if (externalMessages && isUsingExternalState) {
      setMessages(externalMessages)
    }
  }, [externalMessages, isUsingExternalState])

  // Helper to update messages (either local state or external)
  const updateMessages = useCallback((updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    if (isUsingExternalState && onMessagesChange) {
      // Use external state management
      if (typeof updater === 'function') {
        const current = externalMessages || messages
        onMessagesChange(updater(current))
      } else {
        onMessagesChange(updater)
      }
    } else {
      // Use local state
      setMessages(updater)
    }
  }, [externalMessages, messages, onMessagesChange, isUsingExternalState])

  useEffect(() => {
    if (!streamId || !userId) return

    const channel = supabase.channel(`live-stream-chat:${streamId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: userId },
      },
    })

    // Listen for chat messages
    channel.on('broadcast', { event: 'chat-message' }, ({ payload }) => {
      if (payload.userId !== userId && payload.message) {
        // Ensure timestamp is a Date object
        const message: ChatMessage = {
          ...payload.message,
          timestamp: payload.message.timestamp instanceof Date 
            ? payload.message.timestamp 
            : new Date(payload.message.timestamp)
        }
        updateMessages((prev) => [...prev, message])
      }
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true)
        await channel.track({
          userId,
          userName,
        })
      } else {
        setIsConnected(false)
      }
    })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
      setIsConnected(false)
    }
  }, [streamId, userId, userName, supabase, updateMessages])

  // Auto-scroll to bottom when new messages arrive
  const displayMessages = isUsingExternalState && externalMessages ? externalMessages : messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages])

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || !channelRef.current) return

      const message: ChatMessage = {
        id: `${userId}-${Date.now()}`,
        userId,
        userName,
        userColor: userColor.current,
        text: text.trim(),
        timestamp: new Date(),
      }

      // Add message immediately (using external state if provided)
      updateMessages((prev) => [...prev, message])

      // Broadcast to others
      channelRef.current.send({
        type: 'broadcast',
        event: 'chat-message',
        payload: {
          userId,
          message,
        },
      })
    },
    [userId, userName, updateMessages]
  )


  return {
    messages: displayMessages,
    isConnected,
    sendMessage,
    messagesEndRef,
    userColor: userColor.current,
  }
}

