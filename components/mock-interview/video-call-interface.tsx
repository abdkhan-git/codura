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
import { PublicInterviewAdmission } from "./public-interview-admission";
import { usePublicInterview } from "@/contexts/public-interview-context";

interface VideoCallInterfaceProps {
  sessionId: string;
  publicSessionId?: string;
  user: {
    name: string;
    email: string;
    avatar: string;
    user_id?: string;
  };
  isHost: boolean;
  isPublicHost?: boolean;
  onLeave: () => void;
}

export function VideoCallInterface({
  sessionId,
  publicSessionId,
  user,
  isHost,
  isPublicHost = false,
  onLeave,
}: VideoCallInterfaceProps) {
  const { activeSession, setActiveSession } = usePublicInterview();
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
  const [timerEndMs, setTimerEndMs] = useState<number | null>(null);
  const [timerReminderMinutes, setTimerReminderMinutes] = useState<number | null>(null);
  const [timerRemainingMs, setTimerRemainingMs] = useState<number>(0);
  const timerStartRef = useRef<number | null>(null);
  const lastReminderSlotRef = useRef<number>(0);

  // Code editor states
  const [currentCode, setCurrentCode] = useState("");
  const [currentLanguage, setCurrentLanguage] = useState("python");

  // Recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    isMountedRef.current = true;
    // Reset all connection state flags when component mounts/remounts
    offerSentRef.current = false;
    answerSentRef.current = false;
    offerReceivedRef.current = false;
    pendingIceCandidatesRef.current = [];
    partnerIdRef.current = null;
    partnerNameRef.current = null;
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

  const formatMs = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Countdown timer effect
  useEffect(() => {
    if (!timerEndMs) return;

    const tick = () => {
      const remaining = Math.max(0, timerEndMs - Date.now());
      setTimerRemainingMs(remaining);

      if (timerStartRef.current && timerReminderMinutes) {
        const totalDuration = timerEndMs - timerStartRef.current;
        const elapsed = totalDuration - remaining;
        const intervalMs = timerReminderMinutes * 60_000;
        const slot = Math.floor(elapsed / intervalMs);
        if (slot > lastReminderSlotRef.current && remaining > 0) {
          lastReminderSlotRef.current = slot;
          toast.info(`Time update: ${formatMs(remaining)} remaining`, {
            description: `Reminder every ${timerReminderMinutes} minutes`,
          });
        }
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [timerEndMs, timerReminderMinutes]);

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

      console.log(`[WebRTC] Received ${message.type} from ${message.from}`);
      const pc = peerConnectionRef.current;

      if (!pc) {
        console.warn(`[WebRTC] No peer connection available for ${message.type}`);
        return;
      }

      try {
        switch (message.type) {
          case "user-joined":
            if (!isHost && message.from && !partnerIdRef.current) {
              console.log(`[WebRTC] Host discovered: ${message.from}, attempting connection...`);
              partnerIdRef.current = message.from;
              if (message.data?.name) {
                updatePartnerName(message.data.name);
              }

              // Ensure peer connection exists for participant (handles rejoin case)
              if (!peerConnectionRef.current) {
                console.log("[WebRTC] Participant recreating peer connection for host");
                await setupPeerConnection(localStream!);
                // Reset flags for new connection
                offerReceivedRef.current = false;
                offerSentRef.current = false;
                answerSentRef.current = false;
                pendingIceCandidatesRef.current = [];
              }

              // Participant creates and sends offer to discovered host
              if (!offerSentRef.current) {
                console.log("[WebRTC] Participant creating initial offer to host");
                await createAndSendOffer(message.from);
              }
            } else if (isHost && message.from) {
              // Check if this is a new participant or the same one rejoining
              const isNewParticipant = !partnerIdRef.current || partnerIdRef.current !== message.from;

              if (isNewParticipant) {
                console.log(`[WebRTC] ${partnerIdRef.current ? 'New' : 'First'} participant discovered: ${message.from}`);
              } else {
                console.log(`[WebRTC] Same participant rejoining: ${message.from}`);
              }

              partnerIdRef.current = message.from;
              if (message.data?.name) {
                updatePartnerName(message.data.name);
              }

              // If this is a public host and peer connection was closed (participant left/rejoining)
              // Recreate it for the (re)joining participant
              if (isPublicHost && !peerConnectionRef.current) {
                console.log("[WebRTC] Public host recreating peer connection for (re)joining participant");
                await setupPeerConnection(localStream!);
                // Reset flags and pending candidates for new connection
                offerReceivedRef.current = false;
                offerSentRef.current = false;
                answerSentRef.current = false;
                pendingIceCandidatesRef.current = [];
              }
            }
            break;

          case "offer":
            if (message.data && message.from) {
              console.log(`[WebRTC] Received offer from ${message.from}`);
              partnerIdRef.current = message.from;
              if (message.data.name) {
                updatePartnerName(message.data.name);
              }

              // If peer connection was closed (e.g., previous participant left), recreate it
              if (!pc) {
                console.log("[WebRTC] Peer connection not found, reinitializing for new participant...");
                await setupPeerConnection(localStream!);
                const newPc = peerConnectionRef.current;
                if (!newPc) {
                  console.error("[WebRTC] Failed to recreate peer connection");
                  return;
                }
                // Reset flags and pending candidates for new connection
                offerReceivedRef.current = false;
                offerSentRef.current = false;
                answerSentRef.current = false;
                pendingIceCandidatesRef.current = [];
              }

              if (!offerReceivedRef.current) {
                offerReceivedRef.current = true;
                const currentPc = peerConnectionRef.current;
                if (!currentPc) return;
                await currentPc.setRemoteDescription(new RTCSessionDescription(message.data));

                // Apply any pending ICE candidates
                if (pendingIceCandidatesRef.current.length > 0) {
                  console.log(`[WebRTC] Applying ${pendingIceCandidatesRef.current.length} pending ICE candidates`);
                  for (const candidate of pendingIceCandidatesRef.current) {
                    try {
                      await currentPc.addIceCandidate(candidate);
                    } catch (e) {
                      console.error("[WebRTC] Error adding pending ICE candidate:", e);
                    }
                  }
                  pendingIceCandidatesRef.current = [];
                }

                if (!answerSentRef.current) {
                  const answer = await currentPc.createAnswer();
                  await currentPc.setLocalDescription(answer);
                  answerSentRef.current = true;
                  await sendSignalingMessage({
                    type: "answer",
                    data: answer,
                    to: message.from,
                  });
                }
              }
            }
            break;

          case "answer":
            if (message.data && !answerSentRef.current) {
              console.log("[WebRTC] Received answer, applying...");
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(message.data));

                // Apply any pending ICE candidates
                if (pendingIceCandidatesRef.current.length > 0) {
                  console.log(`[WebRTC] Applying ${pendingIceCandidatesRef.current.length} pending ICE candidates after answer`);
                  for (const candidate of pendingIceCandidatesRef.current) {
                    try {
                      await pc.addIceCandidate(candidate);
                    } catch (e) {
                      console.error("[WebRTC] Error adding pending ICE candidate:", e);
                    }
                  }
                  pendingIceCandidatesRef.current = [];
                }
              } catch (error) {
                console.error("[WebRTC] Error applying answer:", error);
              }
            }
            break;

          case "ice-candidate":
            if (message.data) {
              try {
                const candidate = new RTCIceCandidate(message.data);
                // If remote description is set, add candidate immediately
                if (pc.remoteDescription) {
                  await pc.addIceCandidate(candidate);
                  console.log("[WebRTC] Added ICE candidate");
                } else {
                  // Otherwise, queue it for later
                  console.log("[WebRTC] Queuing ICE candidate (no remote description yet)");
                  pendingIceCandidatesRef.current.push(candidate);
                }
              } catch (error) {
                console.error("[WebRTC] Error adding ICE candidate:", error);
              }
            }
            break;

          case "user-left":
            console.log("[WebRTC] Partner left");
            toast.info("Your partner has left the interview.");
            setRemoteStream(null);
            setConnectionStatus("disconnected");
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = null;
            }
            updatePartnerName(null);
            break;
        }
      } catch (error) {
        console.error(`[WebRTC] Error handling ${message.type}:`, error);
      }
    },
    [isHost, createAndSendOffer, sendSignalingMessage, updatePartnerName]
  );

  const fetchPendingRequests = useCallback(async () => {
    // Skip for public interviews - they use PublicInterviewAdmission component
    if (!isHost || isPublicHost) return;

    try {
      const response = await fetch(`/api/mock-interview/sessions/requests?sessionId=${encodeURIComponent(sessionId)}`);
      if (!response.ok) return;

      const data = await response.json();
      const pending = data.requests.filter((r: any) => r.status === "pending");

      const pendingWithUserData = await Promise.all(
        pending.map(async (request: any) => {
          const userResponse = await fetch(`/api/users/${request.requester_id}`);
          if (!userResponse.ok) return null;
          const userData = await userResponse.json();
          return {
            user_id: request.requester_id,
            name: userData.full_name || userData.username || "Unknown",
            avatar: userData.avatar_url || "",
          };
        })
      );

      setPendingUsers(pendingWithUserData.filter(Boolean) as PendingUser[]);
    } catch (error) {
      console.error("Error fetching admission requests:", error);
    }
  }, [isHost, isPublicHost, sessionId]);

  useEffect(() => {
    // Skip polling for public interviews - they use PublicInterviewAdmission component
    if (!isHost || isPublicHost) return;

    fetchPendingRequests();
    admissionPollRef.current = setInterval(fetchPendingRequests, 3000);

    return () => {
      if (admissionPollRef.current) {
        clearInterval(admissionPollRef.current);
        admissionPollRef.current = null;
      }
    };
  }, [isHost, isPublicHost, fetchPendingRequests]);

  const handlePendingApprove = useCallback((userId: string) => {
    setPendingUsers((prev) => prev.filter((user) => user.user_id !== userId));
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  const handlePendingDeny = useCallback((userId: string) => {
    setPendingUsers((prev) => prev.filter((user) => user.user_id !== userId));
  }, []);

  const setupDataChannel = (channel: RTCDataChannel) => {
    dataChannelRef.current = channel;
    console.log("[WebRTC] Data channel setup, ready state:", channel.readyState);

    channel.onopen = () => {
      console.log("[WebRTC] Data channel opened");
    };

    channel.onclose = () => {
      console.log("[WebRTC] Data channel closed");
    };

    channel.onerror = (error) => {
      console.error("Data channel error:", error);
    };

    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("[WebRTC] Data channel message received:", message.type);
        handleDataChannelMessage(message);
      } catch (error) {
        console.error("Error parsing data channel message:", error);
      }
    };
  };

  // Handle incoming data channel messages
  const handleDataChannelMessage = (message: any) => {
    console.log("[Data Channel] Received message:", message.type);

    switch (message.type) {
      case "code-change":
        setCurrentCode(message.code);
        if (codeEditorRef.current && codeEditorRef.current.applyRemoteChange) {
          codeEditorRef.current.applyRemoteChange(message.code, currentLanguage);
        }
        break;
      case "language-change":
        setCurrentLanguage(message.language);
        if (codeEditorRef.current && codeEditorRef.current.applyRemoteChange) {
          codeEditorRef.current.applyRemoteChange(currentCode, message.language);
        }
        break;
      case "code-output":
        console.log("[Data Channel] Applying remote output to editor");
        // Apply the output to the code editor
        if (codeEditorRef.current && codeEditorRef.current.applyRemoteOutput) {
          codeEditorRef.current.applyRemoteOutput(message.output);
        } else {
          console.warn("[Data Channel] Code editor ref not available or applyRemoteOutput method missing");
        }
        break;
      case "whiteboard-stroke":
        console.log("[Data Channel] Applying remote stroke to whiteboard");
        if (whiteboardRef.current && whiteboardRef.current.applyRemoteStroke) {
          whiteboardRef.current.applyRemoteStroke(message.strokeData);
        } else {
          console.warn("[Data Channel] Whiteboard ref not available or applyRemoteStroke method missing");
        }
        break;
      case "whiteboard-draw":
        // Legacy support for full image sync (not used in new version)
        if (whiteboardRef.current && whiteboardRef.current.applyRemoteDrawing) {
          whiteboardRef.current.applyRemoteDrawing(message.imageData);
        }
        break;
      case "whiteboard-clear":
        console.log("[Data Channel] Clearing remote whiteboard");
        if (whiteboardRef.current && whiteboardRef.current.clear) {
          whiteboardRef.current.clear({ broadcast: false });
        }
        break;
      case "whiteboard-settings":
        console.log("[Data Channel] Applying remote whiteboard settings");
        if (whiteboardRef.current && whiteboardRef.current.applyRemoteSettings) {
          whiteboardRef.current.applyRemoteSettings(message.settings);
        }
        break;
      case "timer-config": {
        if (typeof message.endTimeMs === "number") {
          applyTimerConfig(message.endTimeMs, message.reminderMinutes ?? null, false);
        }
        break;
      }
      default:
        console.warn("Unknown data channel message type:", message.type);
    }
  };

  // Send data via data channel
  const sendDataMessage = useCallback((message: any) => {
    console.log("[Data Channel] Attempting to send message:", message.type);

    if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
      try {
        dataChannelRef.current.send(JSON.stringify(message));
        console.log("[Data Channel] Message sent successfully:", message.type);
      } catch (error) {
        console.error("[Data Channel] Error sending message:", error);
      }
    } else {
      console.warn("[Data Channel] Cannot send - channel not open. State:", dataChannelRef.current?.readyState || "null");
    }
  }, []);

  const handleCodeChange = useCallback((code: string) => {
    setCurrentCode(code);
  }, []);

  const handleLanguageChange = useCallback((language: string) => {
    setCurrentLanguage(language);
  }, []);

  const applyTimerConfig = useCallback(
    (endTimeMs: number, reminderMinutes: number | null, broadcast = true) => {
      setTimerEndMs(endTimeMs);
      setTimerReminderMinutes(reminderMinutes ?? null);
      timerStartRef.current = Date.now();
      lastReminderSlotRef.current = 0;

      if (broadcast) {
        sendDataMessage({
          type: "timer-config",
          endTimeMs,
          reminderMinutes: reminderMinutes ?? null,
        });
      }
    },
    [sendDataMessage]
  );

  // Re-broadcast timer when channel opens or config changes
  useEffect(() => {
    if (!timerEndMs) return;
    if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
      sendDataMessage({
        type: "timer-config",
        endTimeMs: timerEndMs,
        reminderMinutes: timerReminderMinutes ?? null,
      });
    }
  }, [timerEndMs, timerReminderMinutes, sendDataMessage]);

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
        // This handles both initial joins and rejoins
        if (!isHost && !offerSentRef.current) {
          console.log("[WebRTC] Participant scheduling offer creation...");
          setTimeout(() => {
            if (!offerSentRef.current && isMountedRef.current) {
              console.log("[WebRTC] Participant creating initial offer");
              createAndSendOffer();
            }
          }, 500);
        }
      }

      // For public participants rejoining: mark session as unavailable again
      if (!isHost && publicSessionId) {
        try {
          await fetch('/api/mock-interview/public-sessions', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: publicSessionId,
              action: 'set_unavailable',
              participantId: user.user_id,
            }),
          });
          console.log("[WebRTC] Public participant marked session as unavailable");
        } catch (e) {
          console.error('[WebRTC] Failed to mark session unavailable:', e);
        }
      }

      // Host marks ready; participant finalizes attendance
      try {
        if (isHost) {
          console.log("[WebRTC] Host marking ready...");
          // Only for private hosts - mark session ready
          if (!isPublicHost) {
            await fetch('/api/mock-interview/sessions', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId, action: 'host_ready' }),
            });
          }

          // NOTE: Public hosts should NOT mark session unavailable when entering
          // Session stays available until a participant actually connects
        } else {
          // Public participants: skip availability toggle to avoid blocking reconnects
          if (!publicSessionId) {
            // Private participants mark attendance
            console.log("[WebRTC] Participant marking attendance...");
            await fetch('/api/mock-interview/sessions/attend', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId }),
            });
          }
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

        // For public hosts, don't exit - let them wait for next participant
        // The ICE state handler below will handle the cleanup
        if (!isHost || !isPublicHost) {
          toast.error("Connection lost");
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

        // For public hosts, participant left - stay in session and wait for next participant
        if (isPublicHost) {
          toast.info("Participant disconnected. Waiting for next participant...");
          // Clear remote stream but stay in the interface
          setRemoteStream(null);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
          // Close peer connection to prepare for next participant
          if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
          }
          partnerIdRef.current = null;
          partnerNameRef.current = null;
          updatePartnerName(null);
          // Mark session as available again
          if (publicSessionId) {
            fetch('/api/mock-interview/public-sessions', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: publicSessionId,
                action: 'set_available',
              }),
            }).catch((error) => console.error("Error marking session available:", error));
          }
          // DO NOT call cleanup() or onLeave() - host stays in session
        } else {
          // For regular hosts and all participants, disconnect completely
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
      cleanup(true); // Pass true to indicate this is an intentional leave
      onLeave();
    }
  };

  const cleanup = (isIntentionalLeave = false) => {
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

    // If this is a public participant leaving (not host), mark session as available again
    if (!isHost && publicSessionId) {
      fetch('/api/mock-interview/public-sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: publicSessionId,
          action: 'set_available',
        }),
      }).catch((error) => console.error("Error marking session available:", error));

      // Only revoke approval if this is an intentional leave (user clicked Leave button)
      // If it's a disconnect, keep approval so they can rejoin
      if (isIntentionalLeave) {
        fetch(`/api/mock-interview/public-sessions/requests?sessionId=${publicSessionId}`, {
          method: 'DELETE',
        }).catch((error) => console.error("Error revoking approval:", error));
      }
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
      {isHost && !isPublicHost && (
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
            {timerEndMs && (
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                <div className="px-3 py-2 rounded-lg bg-black/70 border border-white/10 text-white text-sm font-medium">
                  Main Timer: {formatMs(timerRemainingMs)}
                </div>
                {timerReminderMinutes && (
                  <div className="px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white/80 text-xs">
                    Reminders every {timerReminderMinutes} min
                  </div>
                )}
              </div>
            )}
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
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  {isPublicHost ? (
                    <div className="w-full max-w-2xl max-h-full overflow-y-auto">
                      <PublicInterviewAdmission
                        sessionId={publicSessionId || sessionId}
                        onApprove={(_requestId, approvedSessionCode, timerConfig) => {
                          console.log('Request approved, session code:', approvedSessionCode);
                          if (activeSession) {
                            setActiveSession({
                              ...activeSession,
                              sessionCode: approvedSessionCode,
                              hasPendingRequests: false,
                            });
                          }
                          if (timerConfig) {
                            const endTime = Date.now() + timerConfig.totalMinutes * 60_000;
                            applyTimerConfig(endTime, timerConfig.reminderMinutes);
                          }
                        }}
                      />
                    </div>
                  ) : (
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
                  )}
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
