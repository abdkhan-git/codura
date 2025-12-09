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
  const presenceCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)

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
      console.log('✅ Received track from streamer:', event.track.kind, event.track.id)
      console.log('Stream info:', event.streams.length, 'streams')
      const [stream] = event.streams
      if (stream) {
        console.log('Stream tracks:', stream.getTracks().map(t => ({ kind: t.kind, id: t.id, enabled: t.enabled })))
        setRemoteStream(stream)
        setIsConnected(true)
      } else {
        console.error('❌ No stream in track event')
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        console.log('📤 Sending ICE candidate to streamer')
        channelRef.current.send({
          type: 'broadcast',
          event: 'viewer-ice',
          payload: {
            streamerId: streamerUserId,
            viewerId: userId,
            candidate: event.candidate,
          },
        })
      } else if (!event.candidate) {
        console.log('✅ All ICE candidates sent')
      }
    }

    pc.onconnectionstatechange = () => {
      console.log('🔄 Connection state changed:', pc.connectionState)
      if (pc.connectionState === 'connected') {
        console.log('✅ WebRTC connection established successfully')
        setIsConnected(true)
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        console.log('❌ Connection failed or disconnected:', pc.connectionState)
        setIsConnected(false)
        if (pc.connectionState === 'failed') {
          console.error('🔴 Connection failed - cleaning up')
          setRemoteStream(null)
          peerConnectionRef.current = null
        }
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state:', pc.iceConnectionState)
    }

    pc.onicegatheringstatechange = () => {
      console.log('🧊 ICE gathering state:', pc.iceGatheringState)
    }

    peerConnectionRef.current = pc

    console.log('🔍 Peer connection initial state:', {
      iceGatheringState: pc.iceGatheringState,
      iceConnectionState: pc.iceConnectionState,
      connectionState: pc.connectionState,
      signalingState: pc.signalingState
    })

    // Add transceivers to receive media (required for ICE gathering to start)
    pc.addTransceiver('video', { direction: 'recvonly' })
    pc.addTransceiver('audio', { direction: 'recvonly' })
    console.log('📹 Added transceivers for receiving video and audio')

    // Send offer to streamer
    pc.createOffer().then(offer => {
      console.log('📝 Created offer, setting local description')
      return pc.setLocalDescription(offer)
    }).then(() => {
      console.log('✅ Local description set, ICE gathering state:', pc.iceGatheringState)
      if (channelRef.current && pc.localDescription) {
        console.log('📤 Sending offer to streamer:', streamerUserId)
        channelRef.current.send({
          type: 'broadcast',
          event: 'viewer-offer',
          payload: {
            streamerId: streamerUserId,
            viewerId: userId,
            viewerName: userName,
            offer: pc.localDescription,
          },
        })
      } else {
        console.error('❌ Cannot send offer - no channel or local description')
      }
    }).catch(error => {
      console.error('❌ Error creating/sending offer:', error)
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
      console.log('Presence sync event fired - current state:', JSON.stringify(state, null, 2))
      
      // Presence state is an object where keys are userIds and values are arrays
      const allPresences = Object.values(state).flat() as any[]
      console.log('All presences after flattening:', allPresences.map(p => ({ 
        userId: p.userId, 
        userName: p.userName, 
        isStreamer: p.isStreamer,
        isViewer: p.isViewer 
      })))
      
      const streamer = allPresences.find((p: any) => {
        const isStreamer = p.isStreamer === true
        const isNotMe = p.userId !== userId
        console.log(`Checking presence: userId=${p.userId}, isStreamer=${p.isStreamer}, isNotMe=${isNotMe}`)
        return isStreamer && isNotMe
      })
      
      if (streamer && !peerConnectionRef.current) {
        console.log('✅ Found streamer on sync:', streamer.userId, streamer.userName)
        setStreamerId(streamer.userId)
        setStreamerName(streamer.userName || 'Anonymous')
        createPeerConnection(streamer.userId)
      } else if (!streamer) {
        console.log('❌ No streamer found in presence state yet')
      } else if (peerConnectionRef.current) {
        console.log('⚠️ Peer connection already exists, skipping...')
      }
    })

    // Handle new streamer joining
    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      console.log('Presence join event - new presences:', newPresences)
      const streamer = (newPresences as any[]).find((p: any) => {
        const isStreamer = p.isStreamer === true
        const isNotMe = p.userId !== userId
        return isStreamer && isNotMe
      })
      if (streamer && !peerConnectionRef.current) {
        console.log('✅ Streamer joined event:', streamer.userId, streamer.userName)
        setStreamerId(streamer.userId)
        setStreamerName(streamer.userName || 'Anonymous')
        createPeerConnection(streamer.userId)
      } else if (streamer && peerConnectionRef.current) {
        console.log('⚠️ Streamer joined but peer connection already exists')
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
      console.log('📥 Received streamer-answer event, payload viewerId:', payload.viewerId, 'my userId:', userId)
      if (payload.viewerId === userId && payload.answer && peerConnectionRef.current) {
        try {
          console.log('✅ Setting remote description from streamer answer')
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(payload.answer)
          )
          console.log('✅ Remote description set successfully')
        } catch (error) {
          console.error('❌ Error setting remote description:', error)
        }
      } else {
        if (payload.viewerId !== userId) {
          console.log('⚠️ Answer not for me (viewerId mismatch)')
        }
        if (!payload.answer) {
          console.error('❌ No answer in payload')
        }
        if (!peerConnectionRef.current) {
          console.error('❌ No peer connection exists')
        }
      }
    })

    // Handle ICE candidates from streamer
    channel.on('broadcast', { event: 'streamer-ice' }, async ({ payload }) => {
      console.log('📥 Received ICE candidate from streamer')
      if (payload.viewerId === userId && payload.candidate && peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(payload.candidate)
          )
          console.log('✅ Added ICE candidate from streamer')
        } catch (error) {
          console.error('❌ Error adding ICE candidate:', error)
        }
      } else {
        if (payload.viewerId !== userId) {
          console.log('⚠️ ICE candidate not for me')
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
        
        // Manually check for streamer after subscribing (in case streamer was already present)
        const checkForStreamer = () => {
          if (peerConnectionRef.current) return // Already connected

          const state = channel.presenceState()
          console.log('🔍 Manual check - Full presence state:', JSON.stringify(state, null, 2))
          const allPresences = Object.values(state).flat() as any[]
          console.log('🔍 Manual check - All presences:', allPresences.map(p => ({
            userId: p.userId,
            userName: p.userName,
            isStreamer: p.isStreamer,
            isViewer: p.isViewer
          })))
          const streamer = allPresences.find((p: any) => p.isStreamer === true && p.userId !== userId)

          if (streamer) {
            console.log('✅ Found streamer in manual check:', streamer.userId, streamer.userName)
            setStreamerId(streamer.userId)
            setStreamerName(streamer.userName || 'Anonymous')
            createPeerConnection(streamer.userId)
            // Clear interval once streamer is found
            if (presenceCheckIntervalRef.current) {
              clearInterval(presenceCheckIntervalRef.current)
              presenceCheckIntervalRef.current = null
            }
          } else {
            console.log('❌ No streamer found in manual check')
          }
        }

        // Check immediately after a short delay
        setTimeout(checkForStreamer, 500)

        // Also set up periodic checks (every 1 second) as fallback - more frequent than before
        presenceCheckIntervalRef.current = setInterval(checkForStreamer, 1000)
      }
    })

    channelRef.current = channel
  }, [roomId, userId, userName, supabase, createPeerConnection])

  const leaveStream = useCallback(() => {
    console.log('Leaving stream...')
    if (presenceCheckIntervalRef.current) {
      clearInterval(presenceCheckIntervalRef.current)
      presenceCheckIntervalRef.current = null
    }
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

