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

  const createPeerConnection = useCallback((streamerUserId: string) => {
    // Don't create if already exists for this streamer
    if (peerConnectionRef.current) {
      console.log('Peer connection already exists, skipping...')
      return
    }

    console.log('Creating peer connection for streamer:', streamerUserId)
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    pc.ontrack = (event) => {
      console.log('Received track from streamer')
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
      console.log('Connection state:', pc.connectionState)
      if (pc.connectionState === 'connected') {
        setIsConnected(true)
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setIsConnected(false)
        if (pc.connectionState === 'failed') {
          setRemoteStream(null)
          peerConnectionRef.current = null
        }
      }
    }

    peerConnectionRef.current = pc

    // Send offer to streamer
    pc.createOffer().then(offer => {
      pc.setLocalDescription(offer)
      if (channelRef.current) {
        console.log('Sending offer to streamer')
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
      pc.close()
      peerConnectionRef.current = null
    })
  }, [userId, userName])

  const joinStream = useCallback(async () => {
    if (hasJoinedRef.current || !roomId || !userId) return
    
    hasJoinedRef.current = true
    const channel = supabase.channel(`live-stream:${roomId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: userId },
      },
    })

    // Find streamer when presence syncs
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      console.log('Presence sync - current state:', state)
      const allPresences = Object.values(state).flat() as any[]
      console.log('All presences:', allPresences)
      const streamer = allPresences.find((p: any) => p.isStreamer && p.userId !== userId)
      
      if (streamer && !peerConnectionRef.current) {
        console.log('Found streamer on sync:', streamer.userId, streamer.userName)
        setStreamerId(streamer.userId)
        setStreamerName(streamer.userName || 'Anonymous')
        createPeerConnection(streamer.userId)
      } else if (!streamer) {
        console.log('No streamer found in presence state yet')
      } else if (peerConnectionRef.current) {
        console.log('Peer connection already exists, skipping...')
      }
    })

    // Handle new streamer joining
    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      const streamer = (newPresences as any[]).find((p: any) => p.isStreamer && p.userId !== userId)
      if (streamer && !peerConnectionRef.current) {
        console.log('Streamer joined:', streamer.userId)
        setStreamerId(streamer.userId)
        setStreamerName(streamer.userName || 'Anonymous')
        createPeerConnection(streamer.userId)
      }
    })

    // Handle streamer leaving
    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      const streamerLeft = (leftPresences as any[]).find((p: any) => p.isStreamer)
      if (streamerLeft) {
        console.log('Streamer left, cleaning up...')
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
        console.log('Viewer subscribed to channel, tracking presence...')
        await channel.track({
          userId,
          userName,
          isViewer: true,
        })
        console.log('Viewer presence tracked')
      }
    })

    channelRef.current = channel
  }, [roomId, userId, userName, supabase, createPeerConnection])

  const leaveStream = useCallback(() => {
    console.log('Leaving stream...')
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

