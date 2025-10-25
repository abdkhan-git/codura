"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  Monitor,
  MonitorOff,
  Circle,
  MessageSquare,
  Code,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChatBox } from "./chat-box";
import { SessionNavbar } from "./session-navbar";
import { SimpleSignaling, SignalingMessage } from "@/lib/simple-signaling";
import { AdmissionModal, PendingUser } from "./admission-modal";
import { CollaborativeCodeEditor } from "./collaborative-code-editor";
import { CollaborativeWhiteboard } from "./collaborative-whiteboard";

interface VideoCallInterfaceProps {
  sessionId: string;
  user: {
    name: string;
    email: string;
    avatar: string;
    user_id?: string;
  };
  isHost: boolean;
  onLeave: () => void;
}

export function VideoCallInterface({
  sessionId,
  user,
  isHost,
  onLeave,
}: VideoCallInterfaceProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalingRef = useRef<SimpleSignaling | null>(null);
  const partnerIdRef = useRef<string | null>(null);
  const partnerNameRef = useRef<string | null>(null);
  const offerSentRef = useRef(false);
  const answerSentRef = useRef(false);
  const offerReceivedRef = useRef(false);
  const admissionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const codeEditorRef = useRef<any>(null);
  const whiteboardRef = useRef<any>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidate[]>([]);

  // Media states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  // UI states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showCodeEditor, setShowCodeEditor] = useState(true);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [iceConnectionState, setIceConnectionState] = useState<string>("new");
  const [signalingState, setSignalingState] = useState<string>("stable");

  // Code editor states
  const [currentCode, setCurrentCode] = useState("");
  const [currentLanguage, setCurrentLanguage] = useState("python");

  // Recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    isMountedRef.current = true;
    initializeCall();
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, []);

  // Effect to attach remote stream to video element when it becomes available
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      console.log("[WebRTC] Attaching remote stream to video element via useEffect");
      remoteVideoRef.current.srcObject = remoteStream;

      remoteVideoRef.current.onloadedmetadata = () => {
        console.log("[WebRTC] Remote video metadata loaded (via useEffect)");
        remoteVideoRef.current?.play()
          .then(() => {
            console.log("[WebRTC] Remote video playing successfully (via useEffect)!");
          })
          .catch(e => {
            console.error("[WebRTC] Error playing remote video (via useEffect):", e);
          });
      };

      // Try immediate play
      remoteVideoRef.current.play().catch(() => {
        console.log("[WebRTC] Immediate play failed, waiting for metadata (via useEffect)");
      });
    }
  }, [remoteStream]);

  const sendSignalingMessage = useCallback(
    async (message: Partial<SignalingMessage>) => {
      if (!signalingRef.current) {
        console.warn("[WebRTC] Signaling channel not ready");
        return;
      }

      const targetId = message.to ?? partnerIdRef.current ?? undefined;
      console.log(`[WebRTC] Sending ${message.type} to ${targetId || 'broadcast'}`);

      try {
        await signalingRef.current.send({
          ...message,
          to: targetId,
        });
        console.log(`[WebRTC] Successfully sent ${message.type}`);
      } catch (error) {
        console.error(`[WebRTC] Failed to send signaling message (${message.type}):`, error);
        // Retry once after a short delay
        setTimeout(async () => {
          try {
            console.log(`[WebRTC] Retrying ${message.type}...`);
            await signalingRef.current?.send({
              ...message,
              to: targetId,
            });
            console.log(`[WebRTC] Retry successful for ${message.type}`);
          } catch (retryError) {
            console.error(`[WebRTC] Retry failed for ${message.type}:`, retryError);
          }
        }, 1000);
      }
    },
    []
  );

  const updatePartnerName = useCallback((name: string | null) => {
    partnerNameRef.current = name;
    setPartnerName(name);
  }, []);

  const createAndSendOffer = useCallback(
    async (targetId?: string) => {
      const pc = peerConnectionRef.current;
      if (!pc || offerSentRef.current) {
        return;
      }

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        offerSentRef.current = true;
        await sendSignalingMessage({
          type: "offer",
          data: offer,
          to: targetId ?? partnerIdRef.current ?? undefined,
        });
      } catch (error) {
        console.error("Error creating offer:", error);
        toast.error("Failed to start connection with partner.");
      }
    },
    [sendSignalingMessage]
  );

  const handleSignalingMessage = useCallback(
    async (message: SignalingMessage) => {
      if (!isMountedRef.current) return;
      const currentUserId = user.user_id;
      if (!currentUserId) return;
      if (message.from === currentUserId) return;

      console.log(`[WebRTC] Received signaling message from ${message.from}:`, message.type);

      switch (message.type) {
        case "user-joined": {
          console.log(`[WebRTC] User joined:`, message.from, message.data);
          partnerIdRef.current = message.from;
          offerSentRef.current = false;
          const remoteName = message.data?.name as string | undefined;
          if (remoteName) {
            updatePartnerName(remoteName);
          } else if (!partnerNameRef.current) {
            updatePartnerName("Interview Partner");
          }
          setConnectionStatus("connecting");
          if (isHost) {
            // Acknowledge presence; send direct and broadcast to maximize delivery
            console.log(`[WebRTC] Host acknowledging participant join`);
            await sendSignalingMessage({ type: "user-joined", data: { name: user.name }, to: message.from });
            await sendSignalingMessage({ type: "user-joined", data: { name: user.name } });
          }
          if (!isHost && !offerSentRef.current) {
            console.log(`[WebRTC] Participant creating offer to host`);
            await createAndSendOffer(message.from);
          }
          break;
        }
        case "offer": {
          if (!isHost) {
            console.log(`[WebRTC] Non-host ignoring offer`);
            return;
          }
          const pc = peerConnectionRef.current;
          if (!pc || !message.data) {
            console.warn(`[WebRTC] No peer connection or data for offer`);
            return;
          }

          // Check if we already processed an offer
          if (offerReceivedRef.current) {
            console.warn("[WebRTC] Already processed an offer, ignoring duplicate");
            return;
          }

          // Check signaling state
          if (pc.signalingState !== "stable" && pc.signalingState !== "have-local-offer") {
            console.warn(`[WebRTC] Ignoring offer in signaling state: ${pc.signalingState}`);
            return;
          }

          partnerIdRef.current = message.from;

          if (pc.currentRemoteDescription) {
            console.warn("[WebRTC] Remote description already set, ignoring duplicate offer.");
            return;
          }

          try {
            console.log(`[WebRTC] Host processing offer from ${message.from}`);
            offerReceivedRef.current = true;

            const description: RTCSessionDescriptionInit = message.data;
            await pc.setRemoteDescription(new RTCSessionDescription(description));
            console.log(`[WebRTC] Remote description set, creating answer`);

            // Process any pending ICE candidates now that remote description is set
            if (pendingIceCandidatesRef.current.length > 0) {
              console.log(`[WebRTC] Adding ${pendingIceCandidatesRef.current.length} pending ICE candidates`);
              for (const candidate of pendingIceCandidatesRef.current) {
                try {
                  await pc.addIceCandidate(candidate);
                } catch (err) {
                  console.error("[WebRTC] Error adding pending ICE candidate:", err);
                }
              }
              pendingIceCandidatesRef.current = [];
            }

            // Only create answer if we haven't already
            if (!answerSentRef.current) {
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              answerSentRef.current = true;
              console.log(`[WebRTC] Sending answer to ${message.from}`);
              await sendSignalingMessage({
                type: "answer",
                data: answer,
                to: message.from,
              });
            } else {
              console.log(`[WebRTC] Answer already sent, skipping`);
            }
          } catch (error) {
            console.error("[WebRTC] Error handling offer:", error);
            // Reset flags on error
            offerReceivedRef.current = false;
            answerSentRef.current = false;
          }
          break;
        }
        case "answer": {
          if (isHost) {
            console.log(`[WebRTC] Host ignoring answer`);
            return;
          }
          const pc = peerConnectionRef.current;
          if (!pc || !message.data) {
            console.warn(`[WebRTC] No peer connection or data for answer`);
            return;
          }

          try {
            console.log(`[WebRTC] Participant processing answer from ${message.from}`);
            const description: RTCSessionDescriptionInit = message.data;
            await pc.setRemoteDescription(new RTCSessionDescription(description));
            console.log(`[WebRTC] Remote description set from answer`);

            // Process any pending ICE candidates now that remote description is set
            if (pendingIceCandidatesRef.current.length > 0) {
              console.log(`[WebRTC] Adding ${pendingIceCandidatesRef.current.length} pending ICE candidates`);
              for (const candidate of pendingIceCandidatesRef.current) {
                try {
                  await pc.addIceCandidate(candidate);
                } catch (err) {
                  console.error("[WebRTC] Error adding pending ICE candidate:", err);
                }
              }
              pendingIceCandidatesRef.current = [];
            }
          } catch (error) {
            console.error("[WebRTC] Error applying answer:", error);
          }
          break;
        }
        case "ice-candidate": {
          const pc = peerConnectionRef.current;
          if (!pc || !message.data) {
            console.warn(`[WebRTC] No peer connection or data for ICE candidate`);
            return;
          }

          try {
            const candidate = new RTCIceCandidate(message.data);

            // If we don't have a remote description yet, queue the candidate
            if (!pc.currentRemoteDescription) {
              console.log(`[WebRTC] Queuing ICE candidate (no remote description yet)`);
              pendingIceCandidatesRef.current.push(candidate);
            } else {
              console.log(`[WebRTC] Adding ICE candidate immediately`);
              await pc.addIceCandidate(candidate);
            }
          } catch (error) {
            console.error("[WebRTC] Error adding ICE candidate:", error);
          }
          break;
        }
        case "user-left": {
          console.log(`[WebRTC] User left:`, message.from);
          partnerIdRef.current = null;
          partnerNameRef.current = null;
          offerSentRef.current = false;
          answerSentRef.current = false;
          offerReceivedRef.current = false;
          pendingIceCandidatesRef.current = [];
          updatePartnerName(null);
          setRemoteStream(null);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
          setConnectionStatus("disconnected");
          toast.error("Your interview partner has left the session.");
          break;
        }
        default:
          break;
      }
    },
    [createAndSendOffer, isHost, sendSignalingMessage, updatePartnerName, user.name, user.user_id]
  );

  const fetchPendingRequests = useCallback(async () => {
    if (!isHost) return;

    try {
      const response = await fetch(`/api/mock-interview/sessions/admission?sessionId=${sessionId}`);
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      const pending = Array.isArray(data.pendingRequests) ? data.pendingRequests : [];
      if (isMountedRef.current) {
        setPendingUsers(pending);
      }
    } catch (error) {
      console.error("Error fetching admission requests:", error);
    }
  }, [isHost, sessionId]);

  useEffect(() => {
    if (!isHost) return;

    fetchPendingRequests();
    admissionPollRef.current = setInterval(fetchPendingRequests, 3000);

    return () => {
      if (admissionPollRef.current) {
        clearInterval(admissionPollRef.current);
        admissionPollRef.current = null;
      }
    };
  }, [isHost, fetchPendingRequests]);

  const handlePendingApprove = useCallback((userId: string) => {
    setPendingUsers((prev) => prev.filter((user) => user.user_id !== userId));
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  const handlePendingDeny = useCallback((userId: string) => {
    setPendingUsers((prev) => prev.filter((user) => user.user_id !== userId));
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  // Setup data channel for code synchronization
  const setupDataChannel = (dataChannel: RTCDataChannel) => {
    dataChannelRef.current = dataChannel;

    dataChannel.onopen = () => {
      console.log("Data channel opened");
      toast.success("Code editor synchronized!");
    };

    dataChannel.onclose = () => {
      console.log("Data channel closed");
    };

    dataChannel.onerror = (error) => {
      console.error("Data channel error:", error);
    };

    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleDataChannelMessage(message);
      } catch (error) {
        console.error("Error parsing data channel message:", error);
      }
    };
  };

  // Handle incoming data channel messages
  const handleDataChannelMessage = (message: any) => {
    switch (message.type) {
      case "code-change":
        setCurrentCode(message.code);
        if (message.language) {
          setCurrentLanguage(message.language);
        }
        // Apply the change to the editor
        if (codeEditorRef.current && codeEditorRef.current.applyRemoteChange) {
          codeEditorRef.current.applyRemoteChange(message.code, message.language);
        }
        break;
      case "language-change":
        setCurrentLanguage(message.language);
        if (codeEditorRef.current && codeEditorRef.current.applyRemoteChange) {
          codeEditorRef.current.applyRemoteChange(currentCode, message.language);
        }
        break;
      case "whiteboard-draw":
        if (whiteboardRef.current && whiteboardRef.current.applyRemoteDrawing) {
          whiteboardRef.current.applyRemoteDrawing(message.imageData);
        }
        break;
      case "whiteboard-clear":
        if (whiteboardRef.current && whiteboardRef.current.clear) {
          whiteboardRef.current.clear();
        }
        break;
      default:
        console.log("Unknown data channel message type:", message.type);
    }
  };

  // Send data via data channel
  const sendDataMessage = useCallback((message: any) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
      try {
        dataChannelRef.current.send(JSON.stringify(message));
      } catch (error) {
        console.error("Error sending data channel message:", error);
      }
    }
  }, []);

  // Handle code changes from editor
  const handleCodeChange = useCallback((code: string, language: string) => {
    setCurrentCode(code);
    setCurrentLanguage(language);
  }, []);

  // Handle language changes from editor
  const handleLanguageChange = useCallback((language: string) => {
    setCurrentLanguage(language);
  }, []);

  const initializeCall = async () => {
    if (!user.user_id) {
      toast.error("Unable to start call. Please refresh and try again.");
      return;
    }

    console.log(`[WebRTC] Initializing call as ${isHost ? 'HOST' : 'PARTICIPANT'}, userId: ${user.user_id}`);

    try {
      // Get local media stream with better quality settings
      console.log("[WebRTC] Requesting user media...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      console.log(`[WebRTC] Got local stream with ${stream.getTracks().length} tracks:`,
        stream.getTracks().map(t => `${t.kind}:${t.id}`));

      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        // Ensure video plays
        localVideoRef.current.onloadedmetadata = () => {
          console.log("[WebRTC] Local video metadata loaded");
          localVideoRef.current?.play().catch(e => {
            console.error("[WebRTC] Error playing local video:", e);
          });
        };
      }

      // Initialize WebRTC peer connection
      console.log("[WebRTC] Setting up peer connection...");
      await setupPeerConnection(stream);

      // Initialize signaling
      console.log("[WebRTC] Connecting to signaling server...");
      const signaling = new SimpleSignaling(sessionId, user.user_id);
      signalingRef.current = signaling;
      signaling.onMessage(handleSignalingMessage);

      const connected = await signaling.connect({
        name: user.name,
        role: isHost ? "host" : "participant",
      });

      if (!connected) {
        console.error("[WebRTC] Failed to connect to signaling server");
        toast.error("Failed to connect to the interview room. Please refresh.");
      } else {
        console.log("[WebRTC] Successfully connected to signaling server");
        setConnectionStatus("connecting");
        // Proactively create an offer on the joiner side after connecting
        if (!isHost && !offerSentRef.current) {
          console.log("[WebRTC] Participant scheduling offer creation...");
          setTimeout(() => {
            if (!offerSentRef.current) {
              console.log("[WebRTC] Participant creating initial offer");
              createAndSendOffer();
            }
          }, 500);
        }
      }

      // Host marks ready; participant finalizes attendance
      try {
        if (isHost) {
          console.log("[WebRTC] Host marking ready...");
          await fetch('/api/mock-interview/sessions', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, action: 'host_ready' }),
          });
        } else {
          console.log("[WebRTC] Participant marking attendance...");
          await fetch('/api/mock-interview/sessions/attend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });
        }
      } catch (e) {
        console.error('[WebRTC] Failed to mark readiness/attendance:', e);
      }

      toast.success("Camera and microphone connected");
      console.log("[WebRTC] Initialization complete");
    } catch (error: any) {
      console.error("[WebRTC] Error initializing call:", error);
      if (error.name === 'NotAllowedError') {
        toast.error("Camera/microphone access denied. Please allow permissions.");
      } else if (error.name === 'NotFoundError') {
        toast.error("No camera or microphone found.");
      } else {
        toast.error("Failed to access camera or microphone");
      }
    }
  };

  const setupPeerConnection = async (stream: MediaStream) => {
    // This is a simplified WebRTC setup
    // In production, you'd use a signaling server (WebSocket/Socket.io)
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    };

    const pc = new RTCPeerConnection(configuration);
    peerConnectionRef.current = pc;

    console.log("[WebRTC] Peer connection created");

    // Add local stream to peer connection
    const tracks = stream.getTracks();
    console.log(`[WebRTC] Adding ${tracks.length} local tracks to peer connection:`, tracks.map(t => t.kind));
    tracks.forEach((track) => {
      const sender = pc.addTrack(track, stream);
      console.log(`[WebRTC] Added ${track.kind} track, sender:`, sender);
    });

    // Setup data channel for code synchronization
    if (!isHost) {
      // Non-host creates the data channel
      console.log("[WebRTC] Participant creating data channel");
      const dataChannel = pc.createDataChannel("code-sync");
      setupDataChannel(dataChannel);
    } else {
      // Host listens for incoming data channel
      console.log("[WebRTC] Host waiting for data channel");
      pc.ondatachannel = (event) => {
        console.log("[WebRTC] Host received data channel");
        setupDataChannel(event.channel);
      };
    }

    // Handle remote stream - CRITICAL FIX
    pc.ontrack = (event) => {
      console.log(`[WebRTC] *** RECEIVED REMOTE TRACK *** kind: ${event.track.kind}, id: ${event.track.id}`);
      console.log(`[WebRTC] Event streams:`, event.streams);
      console.log(`[WebRTC] Track ready state:`, event.track.readyState);
      console.log(`[WebRTC] Track enabled:`, event.track.enabled);

      if (event.streams && event.streams.length > 0) {
        const [remoteMediaStream] = event.streams;
        console.log(`[WebRTC] Remote stream has ${remoteMediaStream.getTracks().length} tracks:`,
          remoteMediaStream.getTracks().map(t => `${t.kind}:${t.id}`));

        // Set the remote stream state first
        setRemoteStream(remoteMediaStream);

        // Wait for React to render the video element, then attach the stream
        const attachStream = () => {
          if (remoteVideoRef.current) {
            console.log(`[WebRTC] Setting remote video srcObject`);
            remoteVideoRef.current.srcObject = remoteMediaStream;

            // Ensure remote video plays
            remoteVideoRef.current.onloadedmetadata = () => {
              console.log(`[WebRTC] Remote video metadata loaded, attempting play`);
              remoteVideoRef.current?.play()
                .then(() => {
                  console.log(`[WebRTC] Remote video playing successfully!`);
                  setConnectionStatus("connected");
                  toast.success("Partner connected!");
                })
                .catch(e => {
                  console.error("[WebRTC] Error playing remote video:", e);
                  toast.error("Video playback issue - check browser permissions");
                });
            };

            // Also try to play immediately
            remoteVideoRef.current.play().catch(e => {
              console.warn("[WebRTC] Immediate play failed (will retry on loadedmetadata):", e);
            });
          } else {
            console.warn("[WebRTC] remoteVideoRef.current is null, will retry...");
            // Retry after React renders
            setTimeout(attachStream, 100);
          }
        };

        // Use setTimeout to allow React to render the video element
        setTimeout(attachStream, 0);
      } else {
        console.warn("[WebRTC] Received track but no streams attached!");
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`[WebRTC] Generated ICE candidate:`, event.candidate.candidate);
        sendSignalingMessage({
          type: "ice-candidate",
          data: event.candidate,
        });
      } else {
        console.log(`[WebRTC] ICE gathering complete`);
      }
    };

    // Handle connection state
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state changed to: ${pc.connectionState}`);
      if (pc.connectionState === "connected") {
        setConnectionStatus("connected");
        console.log(`[WebRTC] *** PEER CONNECTION ESTABLISHED ***`);
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        setConnectionStatus("disconnected");
        console.error(`[WebRTC] Connection ${pc.connectionState}`);
        toast.error("Connection lost");
        if (!isHost) {
          cleanup();
          onLeave();
        }
      }
    };

    // Extra safety: watch ICE connection state as well
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log(`[WebRTC] ICE connection state changed to: ${state}`);
      setIceConnectionState(state);
      if (state === "connected" || state === "completed") {
        console.log(`[WebRTC] ICE connection successful!`);
      } else if (state === "disconnected" || state === "failed") {
        setConnectionStatus("disconnected");
        console.error(`[WebRTC] ICE connection ${state}`);
        toast.error("You were disconnected.");
        if (isHost) {
          fetch('/api/mock-interview/sessions', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, action: 'end' }),
          }).catch(() => {});
        }
        cleanup();
        onLeave();
      }
    };

    // Monitor ICE gathering state
    pc.onicegatheringstatechange = () => {
      console.log(`[WebRTC] ICE gathering state: ${pc.iceGatheringState}`);
    };

    // Monitor signaling state
    pc.onsignalingstatechange = () => {
      const state = pc.signalingState;
      console.log(`[WebRTC] Signaling state: ${state}`);
      setSignalingState(state);
    };
  };

  const toggleVideo = () => {
    if (localStream) {
      const newState = !videoEnabled;
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = newState;
      });
      setVideoEnabled(newState);
      toast.success(newState ? "Camera enabled" : "Camera disabled");
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const newState = !audioEnabled;
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = newState;
      });
      setAudioEnabled(newState);
      toast.success(newState ? "Microphone enabled" : "Microphone muted");
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!screenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });

        // Replace video track
        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = peerConnectionRef.current
          ?.getSenders()
          .find((s) => s.track?.kind === "video");

        if (sender) {
          sender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        setScreenSharing(true);
        toast.success("Screen sharing started");
      } else {
        // Switch back to camera
        if (localStream) {
          const cameraTrack = localStream.getVideoTracks()[0];
          const sender = peerConnectionRef.current
            ?.getSenders()
            .find((s) => s.track?.kind === "video");

          if (sender) {
            sender.replaceTrack(cameraTrack);
          }
        }

        setScreenSharing(false);
        toast.success("Screen sharing stopped");
      }
    } catch (error) {
      console.error("Error toggling screen share:", error);
      toast.error("Failed to share screen");
    }
  };

  const startRecording = () => {
    try {
      if (!localStream) return;

      const options = { mimeType: "video/webm" };
      const mediaRecorder = new MediaRecorder(localStream, options);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `interview-${sessionId}-${Date.now()}.webm`;
        a.click();
        recordedChunksRef.current = [];
        toast.success("Recording saved!");
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording started");
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Failed to start recording");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleLeave = () => {
    if (isRecording) {
      stopRecording();
    }
    if (confirm("Are you sure you want to leave the interview?")) {
      cleanup();
      onLeave();
    }
  };

  const cleanup = () => {
    isMountedRef.current = false;
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    setLocalStream(null);
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (admissionPollRef.current) {
      clearInterval(admissionPollRef.current);
      admissionPollRef.current = null;
    }
    if (signalingRef.current) {
      signalingRef.current
        .disconnect()
        .catch((error: any) => console.error("Error disconnecting signaling:", error));
      signalingRef.current = null;
    }
    partnerIdRef.current = null;
    partnerNameRef.current = null;
    offerSentRef.current = false;
    answerSentRef.current = false;
    offerReceivedRef.current = false;
    pendingIceCandidatesRef.current = [];
    updatePartnerName(null);
    setRemoteStream(null);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setConnectionStatus("disconnected");
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      {isHost && (
        <AdmissionModal
          open={pendingUsers.length > 0}
          pendingUsers={pendingUsers}
          sessionId={sessionId}
          onApprove={handlePendingApprove}
          onDeny={handlePendingDeny}
        />
      )}

      {/* Session Navbar */}
      <SessionNavbar
        sessionId={sessionId}
        isHost={isHost}
        isRecording={isRecording}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onLeave={handleLeave}
      />

      {/* Main Content */}
      <div className="flex-1 flex gap-4 mt-4 overflow-hidden">
        {/* Video Area - Always on left with consistent width */}
        <div className={cn(
          "relative",
          showCodeEditor || showChat ? "w-1/2" : "w-full"
        )}>
          <Card className="h-full border-2 border-border/20 bg-zinc-900 relative overflow-hidden">
            {/* Remote Video (Partner) - Large View */}
            <div className="absolute inset-0">
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand to-blue-600 flex items-center justify-center mx-auto">
                      <Video className="w-12 h-12 text-white" />
                    </div>
                    <div>
                      <p className="text-white text-lg font-medium">Waiting for partner...</p>
                      <p className="text-zinc-400 text-sm mt-1">
                        {connectionStatus === "connecting" ? "Connecting..." : "No one has joined yet"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Partner Name Overlay */}
              {remoteStream && (
                <div className="absolute bottom-6 left-6 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <p className="text-white font-medium">{partnerName || "Interview Partner"}</p>
                </div>
              )}
            </div>

            {/* Local Video (Self) - Small View */}
            <div className="absolute top-6 right-6 w-64 aspect-video rounded-lg overflow-hidden border-2 border-white/20 shadow-2xl bg-zinc-800">
              {videoEnabled && localStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                  <VideoOff className="w-8 h-8 text-zinc-400" />
                </div>
              )}

              {/* Self Name Overlay */}
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
                You
              </div>
            </div>

            {/* Controls Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-center gap-3">
                {/* Video Toggle */}
                <Button
                  variant={videoEnabled ? "secondary" : "destructive"}
                  size="lg"
                  onClick={toggleVideo}
                  className="rounded-full w-14 h-14 p-0"
                  title={videoEnabled ? "Turn off camera" : "Turn on camera"}
                >
                  {videoEnabled ? (
                    <Video className="w-6 h-6" />
                  ) : (
                    <VideoOff className="w-6 h-6" />
                  )}
                </Button>

                {/* Audio Toggle */}
                <Button
                  variant={audioEnabled ? "secondary" : "destructive"}
                  size="lg"
                  onClick={toggleAudio}
                  className="rounded-full w-14 h-14 p-0"
                  title={audioEnabled ? "Mute microphone" : "Unmute microphone"}
                >
                  {audioEnabled ? (
                    <Mic className="w-6 h-6" />
                  ) : (
                    <MicOff className="w-6 h-6" />
                  )}
                </Button>

                {/* Screen Share */}
                <Button
                  variant={screenSharing ? "default" : "secondary"}
                  size="lg"
                  onClick={toggleScreenShare}
                  className="rounded-full w-14 h-14 p-0"
                  title={screenSharing ? "Stop sharing" : "Share screen"}
                >
                  {screenSharing ? (
                    <MonitorOff className="w-6 h-6" />
                  ) : (
                    <Monitor className="w-6 h-6" />
                  )}
                </Button>

                {/* Code Editor Toggle */}
                <Button
                  variant={showCodeEditor ? "default" : "secondary"}
                  size="lg"
                  onClick={() => setShowCodeEditor(!showCodeEditor)}
                  className="rounded-full w-14 h-14 p-0"
                  title="Toggle code editor"
                >
                  <Code className="w-6 h-6" />
                </Button>

                {/* Whiteboard Toggle */}
                <Button
                  variant={showWhiteboard ? "default" : "secondary"}
                  size="lg"
                  onClick={() => setShowWhiteboard(!showWhiteboard)}
                  className="rounded-full w-14 h-14 p-0"
                  title="Toggle whiteboard"
                >
                  <Palette className="w-6 h-6" />
                </Button>

                {/* Chat Toggle */}
                <Button
                  variant={showChat ? "default" : "secondary"}
                  size="lg"
                  onClick={() => setShowChat(!showChat)}
                  className="rounded-full w-14 h-14 p-0"
                  title="Toggle chat"
                >
                  <MessageSquare className="w-6 h-6" />
                </Button>

                {/* End Call */}
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={handleLeave}
                  className="rounded-full w-14 h-14 p-0 bg-red-500 hover:bg-red-600"
                  title="Leave interview"
                >
                  <Phone className="w-6 h-6 rotate-[135deg]" />
                </Button>
              </div>
            </div>

            {/* Recording Indicator */}
            {isRecording && (
              <div className="absolute top-6 left-6 flex items-center gap-2 bg-red-500/90 backdrop-blur-sm px-4 py-2 rounded-full">
                <Circle className="w-3 h-3 fill-white animate-pulse" />
                <span className="text-white text-sm font-medium">Recording</span>
              </div>
            )}

            {/* Connection Status */}
            {connectionStatus === "connecting" && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-yellow-500/90 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-white text-sm font-medium">Connecting...</span>
              </div>
            )}

            {/* Debug Info Toggle - Press 'D' key */}
            <div className="absolute bottom-24 right-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                className="text-white/60 hover:text-white text-xs"
              >
                Debug {showDebugInfo ? '▼' : '▶'}
              </Button>
            </div>

            {/* Debug Info Panel */}
            {showDebugInfo && (
              <div className="absolute bottom-24 right-6 bg-black/80 backdrop-blur-sm p-4 rounded-lg text-white text-xs font-mono max-w-xs">
                <div className="space-y-1">
                  <div className="font-bold border-b border-white/20 pb-1 mb-2">WebRTC Debug Info</div>
                  <div>Role: {isHost ? 'HOST' : 'PARTICIPANT'}</div>
                  <div>User ID: {user.user_id?.substring(0, 8)}...</div>
                  <div>Partner ID: {partnerIdRef.current?.substring(0, 8) || 'None'}</div>
                  <div className="border-t border-white/20 pt-1 mt-1">
                    <div>Connection: <span className={cn(
                      "font-bold",
                      connectionStatus === "connected" ? "text-green-400" :
                      connectionStatus === "connecting" ? "text-yellow-400" : "text-red-400"
                    )}>{connectionStatus}</span></div>
                    <div>ICE State: <span className={cn(
                      "font-bold",
                      iceConnectionState === "connected" || iceConnectionState === "completed" ? "text-green-400" :
                      iceConnectionState === "checking" ? "text-yellow-400" : "text-gray-400"
                    )}>{iceConnectionState}</span></div>
                    <div>Signaling: <span className="font-bold text-blue-400">{signalingState}</span></div>
                  </div>
                  <div className="border-t border-white/20 pt-1 mt-1">
                    <div>Local Tracks: {localStream?.getTracks().length || 0}</div>
                    <div>Remote Tracks: {remoteStream?.getTracks().length || 0}</div>
                  </div>
                  <div className="text-[10px] text-white/60 mt-2">
                    Check browser console for detailed logs
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Side - Code Editor and/or Chat */}
        {(showCodeEditor || showChat) && (
          <div className="w-1/2 flex flex-col gap-4">
            {/* Code Editor Panel - Takes 70% height when chat is also shown */}
            {showCodeEditor && (
              <Card className={cn(
                "border-2 border-border/20 overflow-hidden",
                showChat ? "h-[70%]" : "h-full"
              )}>
                <CollaborativeCodeEditor
                  ref={codeEditorRef}
                  onCodeChange={handleCodeChange}
                  onLanguageChange={handleLanguageChange}
                  sendDataMessage={sendDataMessage}
                  initialCode={currentCode}
                  initialLanguage={currentLanguage}
                />
              </Card>
            )}

            {/* Chat Panel - Takes 30% height when editor is also shown, 100% otherwise */}
            {showChat && (
              <div className={cn(
                showCodeEditor ? "h-[30%]" : "h-full"
              )}>
                <ChatBox
                  sessionId={sessionId}
                  user={user}
                  onClose={() => setShowChat(false)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Whiteboard */}
      {showWhiteboard && (
        <CollaborativeWhiteboard
          ref={whiteboardRef}
          sendDataMessage={sendDataMessage}
          initialPosition={{ x: 150, y: 150 }}
          initialSize={{ width: 600, height: 400 }}
        />
      )}
    </div>
  );
}
