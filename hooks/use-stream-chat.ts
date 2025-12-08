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

export function useStreamChat(streamId: string, userId: string, userName: string) {
  const supabase = createClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const userColor = useRef(`hsl(${Math.random() * 360}, 70%, 60%)`)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
      if (payload.userId !== userId) {
        setMessages((prev) => [...prev, payload.message])
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
  }, [streamId, userId, userName, supabase])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

      // Add message locally immediately
      setMessages((prev) => [...prev, message])

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
    [userId, userName]
  )

  return {
    messages,
    isConnected,
    sendMessage,
    messagesEndRef,
    userColor: userColor.current,
  }
}

