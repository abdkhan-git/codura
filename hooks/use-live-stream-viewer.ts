import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useLiveStreamViewer(roomId: string, userId: string, userName: string) {
  const supabase = createClient()
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [streamerId, setStreamerId] = useState<string | null>(null)
  const [streamerName, setStreamerName] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const hasJoinedRef = useRef(false)

  const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]

  const joinStream = useCallback(async () => {
    if (hasJoinedRef.current) return
    
    const channel = supabase.channel(`live-stream:${roomId}`)

    // Find streamer when presence syncs
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const streamer = Object.values(state)
        .flat()
        .find((p: any) => p.isStreamer)
      
      if (streamer && streamer.userId !== userId) {
        setStreamerId(streamer.userId)
        setStreamerName(streamer.userName || 'Anonymous')
        if (!peerConnectionRef.current) {
          createPeerConnection(streamer.userId)
        }
      }
    })

    // Handle new streamer joining
    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      const streamer = newPresences.find((p: any) => p.isStreamer && p.userId !== userId)
      if (streamer && !peerConnectionRef.current) {
        setStreamerId(streamer.userId)
        setStreamerName(streamer.userName || 'Anonymous')
        createPeerConnection(streamer.userId)
      }
    })

    // Handle streamer leaving
    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      const streamerLeft = leftPresences.find((p: any) => p.isStreamer && p.userId === streamerId)
      if (streamerLeft) {
        leaveStream()
      }
    })

    // Handle answer from streamer
    channel.on('broadcast', { event: 'streamer-answer' }, async ({ payload }) => {
      if (payload.viewerId === userId && payload.answer && peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(payload.answer)
          )
        } catch (error) {
          console.error('Error setting remote description:', error)
        }
      }
    })

    // Handle ICE candidates from streamer
    channel.on('broadcast', { event: 'streamer-ice' }, async ({ payload }) => {
      if (payload.viewerId === userId && payload.candidate && peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(payload.candidate)
          )
        } catch (error) {
          console.error('Error adding ICE candidate:', error)
        }
      }
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId,
          userName,
          isViewer: true,
        })
        hasJoinedRef.current = true
      }
    })

    channelRef.current = channel
  }, [roomId, userId, userName, supabase, streamerId])

  const createPeerConnection = useCallback((streamerUserId: string) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    pc.ontrack = (event) => {
      const [stream] = event.streams
      setRemoteStream(stream)
      setIsConnected(true)
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'viewer-ice',
          payload: {
            streamerId: streamerUserId,
            viewerId: userId,
            candidate: event.candidate,
          },
        })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setIsConnected(true)
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setIsConnected(false)
        setRemoteStream(null)
      }
    }

    peerConnectionRef.current = pc

    // Send offer to streamer
    pc.createOffer().then(offer => {
      pc.setLocalDescription(offer)
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'viewer-offer',
          payload: {
            streamerId: streamerUserId,
            viewerId: userId,
            viewerName: userName,
            offer,
          },
        })
      }
    }).catch(error => {
      console.error('Error creating offer:', error)
    })
  }, [userId, userName])

  const leaveStream = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
    setRemoteStream(null)
    setIsConnected(false)
    setStreamerId(null)
    setStreamerName(null)
    hasJoinedRef.current = false
  }, [])

  useEffect(() => {
    return () => {
      leaveStream()
    }
  }, [leaveStream])

  return {
    remoteStream,
    isConnected,
    streamerId,
    streamerName,
    joinStream,
    leaveStream,
  }
}

