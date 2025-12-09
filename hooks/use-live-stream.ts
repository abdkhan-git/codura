import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface Viewer {
  id: string
  name: string
  peerConnection: RTCPeerConnection
}

export function useLiveStream(roomId: string, userId: string, userName: string, problemId?: number) {
  const supabase = createClient()
  const [isStreaming, setIsStreaming] = useState(false)
  const [viewers, setViewers] = useState<Viewer[]>([])
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const streamRef = useRef<MediaStream | null>(null)
  const streamIdRef = useRef<string | null>(null)
  const viewerCountIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]

  // Update viewer count in API
  const updateViewerCount = useCallback(async (count: number) => {
    if (!streamIdRef.current) return
    
    try {
      await fetch('/api/live-streams/viewer-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamId: streamIdRef.current,
          viewerCount: count,
        }),
      })
    } catch (error) {
      console.error('Error updating viewer count:', error)
    }
  }, [])

  // Start streaming
  const startStream = useCallback(async () => {
    try {
      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser' as any, // or 'window', 'monitor'
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: true, // Capture system audio if available
      })

      streamRef.current = stream
      setLocalStream(stream)
      setIsStreaming(true)

      // Notify API that stream has started
      if (problemId) {
        try {
          const response = await fetch('/api/live-streams/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              problemId,
              roomId,
            }),
          })
          if (response.ok) {
            const data = await response.json()
            streamIdRef.current = data.stream?.id || null
          }
        } catch (error) {
          console.error('Error notifying API of stream start:', error)
        }
      }

      // Setup signaling channel
      const channel = supabase.channel(`live-stream:${roomId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: userId },
        },
      })

      // Handle viewer joining
      channel.on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach((presence: any) => {
          if (presence.userId !== userId && !presence.isStreamer) {
            createPeerConnectionForViewer(presence.userId, presence.userName || 'Anonymous')
          }
        })
      })

      // Handle viewer leaving
      channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach((presence: any) => {
          const pc = peerConnectionsRef.current.get(presence.userId)
          if (pc) {
            pc.close()
            peerConnectionsRef.current.delete(presence.userId)
            setViewers(prev => {
              const newViewers = prev.filter(v => v.id !== presence.userId)
              // Update viewer count in API
              updateViewerCount(newViewers.length)
              return newViewers
            })
          }
        })
      })

      // Handle WebRTC signaling - viewer sends offer
      channel.on('broadcast', { event: 'viewer-offer' }, async ({ payload }) => {
        console.log('📥 Received viewer-offer from:', payload.viewerId, payload.viewerName)
        if (payload.streamerId !== userId) {
          console.log('⚠️ Offer not for me (streamerId mismatch)')
          return
        }

        const viewerId = payload.viewerId
        let pc = peerConnectionsRef.current.get(viewerId)

        // Skip if peer connection already exists for this viewer
        if (pc) {
          console.log('⚠️ Peer connection already exists for viewer, ignoring duplicate offer:', viewerId)
          return
        }

        console.log('📝 Creating new peer connection for viewer:', viewerId)
        pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

        // Add stream tracks
        if (streamRef.current) {
          const tracks = streamRef.current.getTracks()
          console.log('📹 Adding', tracks.length, 'tracks to peer connection:', tracks.map(t => t.kind))
          tracks.forEach(track => {
            pc!.addTrack(track, streamRef.current!)
          })
        } else {
          console.error('❌ No stream to add tracks from!')
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate && channelRef.current) {
            console.log('📤 Sending ICE candidate to viewer:', viewerId)
            channelRef.current.send({
              type: 'broadcast',
              event: 'streamer-ice',
              payload: {
                streamerId: userId,
                viewerId,
                candidate: event.candidate,
              },
            })
          } else if (!event.candidate) {
            console.log('✅ All ICE candidates sent to viewer:', viewerId)
          }
        }

        pc.oniceconnectionstatechange = () => {
          console.log('🧊 Streamer ICE connection state for viewer', viewerId, ':', pc!.iceConnectionState)
        }

        pc.onicegatheringstatechange = () => {
          console.log('🧊 Streamer ICE gathering state for viewer', viewerId, ':', pc!.iceGatheringState)
        }

        // Handle connection state
        pc.onconnectionstatechange = () => {
          console.log('🔄 Streamer connection state for viewer', viewerId, ':', pc!.connectionState)
          if (pc!.connectionState === 'failed' || pc!.connectionState === 'disconnected') {
            console.log('❌ Streamer connection failed/disconnected for viewer:', viewerId)
            pc!.close()
            peerConnectionsRef.current.delete(viewerId)
            setViewers(prev => {
              const newViewers = prev.filter(v => v.id !== viewerId)
              // Update viewer count in API
              updateViewerCount(newViewers.length)
              return newViewers
            })
          } else if (pc!.connectionState === 'connected') {
            console.log('✅ Streamer successfully connected to viewer:', viewerId)
          }
        }

        peerConnectionsRef.current.set(viewerId, pc)
        setViewers(prev => {
          const exists = prev.find(v => v.id === viewerId)
          if (!exists) {
            const newViewers = [...prev, { id: viewerId, name: payload.viewerName || 'Anonymous', peerConnection: pc! }]
            // Update viewer count in API
            updateViewerCount(newViewers.length)
            return newViewers
          }
          return prev
        })

        // Handle the offer
        if (payload.offer) {
          console.log('🔍 Peer connection state before offer:', {
            iceGatheringState: pc.iceGatheringState,
            iceConnectionState: pc.iceConnectionState,
            connectionState: pc.connectionState,
            signalingState: pc.signalingState
          })

          console.log('📝 Setting remote description (viewer offer)')
          await pc.setRemoteDescription(new RTCSessionDescription(payload.offer))
          console.log('📝 Creating answer')
          const answer = await pc.createAnswer()
          console.log('📝 Setting local description (answer)')
          await pc.setLocalDescription(answer)

          console.log('✅ Local description set, ICE gathering state:', pc.iceGatheringState)

          if (channelRef.current) {
            console.log('📤 Sending answer to viewer:', viewerId)
            channelRef.current.send({
              type: 'broadcast',
              event: 'streamer-answer',
              payload: {
                streamerId: userId,
                viewerId,
                answer,
              },
            })
          } else {
            console.error('❌ No channel to send answer')
          }
        } else {
          console.error('❌ No offer in payload')
        }
      })

      // Handle ICE candidates from viewers
      channel.on('broadcast', { event: 'viewer-ice' }, async ({ payload }) => {
        console.log('📥 Received ICE candidate from viewer:', payload.viewerId)
        if (payload.streamerId !== userId) {
          console.log('⚠️ ICE candidate not for me (streamerId mismatch)')
          return
        }

        const pc = peerConnectionsRef.current.get(payload.viewerId)
        if (pc && payload.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
            console.log('✅ Added ICE candidate from viewer:', payload.viewerId)
          } catch (error) {
            console.error('❌ Error adding ICE candidate from viewer:', error)
          }
        } else {
          if (!pc) {
            console.error('❌ No peer connection for viewer:', payload.viewerId)
          }
          if (!payload.candidate) {
            console.error('❌ No candidate in payload')
          }
        }
      })

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId,
            userName,
            isStreamer: true,
          })
        }
      })

      channelRef.current = channel

      // Handle stream ending (user stops sharing)
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        stopStream()
      })

      // Periodically update viewer count
      viewerCountIntervalRef.current = setInterval(() => {
        setViewers(current => {
          updateViewerCount(current.length)
          return current
        })
      }, 5000) // Update every 5 seconds

    } catch (error) {
      console.error('Error starting stream:', error)
      setIsStreaming(false)
      setLocalStream(null)
      throw error
    }
  }, [roomId, userId, userName, supabase, problemId, updateViewerCount])

  // Create peer connection for a new viewer (legacy - now handled in viewer-offer)
  const createPeerConnectionForViewer = useCallback(async (viewerId: string, viewerName: string) => {
    // This is now handled when viewer sends offer
    // Keeping for backwards compatibility but viewer-initiated is better
  }, [])

  // Stop streaming
  const stopStream = useCallback(async () => {
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close())
    peerConnectionsRef.current.clear()

    // Clear viewer count interval
    if (viewerCountIntervalRef.current) {
      clearInterval(viewerCountIntervalRef.current)
      viewerCountIntervalRef.current = null
    }

    // Unsubscribe from channel
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }

    // Notify API that stream has stopped
    if (streamIdRef.current) {
      try {
        await fetch('/api/live-streams/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      } catch (error) {
        console.error('Error notifying API of stream stop:', error)
      }
      streamIdRef.current = null
    }

    setLocalStream(null)
    setIsStreaming(false)
    setViewers([])
  }, [])

  useEffect(() => {
    return () => {
      stopStream()
    }
  }, [stopStream])

  return {
    isStreaming,
    viewers,
    localStream,
    startStream,
    stopStream,
  }
}

