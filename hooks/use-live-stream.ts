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
        if (payload.streamerId !== userId) return
        
        const viewerId = payload.viewerId
        let pc = peerConnectionsRef.current.get(viewerId)
        
        if (!pc) {
          pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
          
          // Add stream tracks
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
              pc!.addTrack(track, streamRef.current!)
            })
          }

          // Handle ICE candidates
          pc.onicecandidate = (event) => {
            if (event.candidate && channelRef.current) {
              channelRef.current.send({
                type: 'broadcast',
                event: 'streamer-ice',
                payload: {
                  streamerId: userId,
                  viewerId,
                  candidate: event.candidate,
                },
              })
            }
          }

          // Handle connection state
          pc.onconnectionstatechange = () => {
            if (pc!.connectionState === 'failed' || pc!.connectionState === 'disconnected') {
              pc!.close()
              peerConnectionsRef.current.delete(viewerId)
              setViewers(prev => {
                const newViewers = prev.filter(v => v.id !== viewerId)
                // Update viewer count in API
                updateViewerCount(newViewers.length)
                return newViewers
              })
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
        }

        // Handle the offer
        if (payload.offer) {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.offer))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          
          if (channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'streamer-answer',
              payload: {
                streamerId: userId,
                viewerId,
                answer,
              },
            })
          }
        }
      })

      // Handle ICE candidates from viewers
      channel.on('broadcast', { event: 'viewer-ice' }, async ({ payload }) => {
        if (payload.streamerId !== userId) return
        
        const pc = peerConnectionsRef.current.get(payload.viewerId)
        if (pc && payload.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
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

