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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChatBox } from "./chat-box";
import { SessionNavbar } from "./session-navbar";
import { SimpleSignaling, SignalingMessage } from "@/lib/simple-signaling";
import { AdmissionModal, PendingUser } from "./admission-modal";

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
  const admissionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  // Media states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  // UI states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);

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

  const sendSignalingMessage = useCallback(
    async (message: Partial<SignalingMessage>) => {
      if (!signalingRef.current) {
        console.warn("Signaling channel not ready");
        return;
      }

      try {
        await signalingRef.current.send({
          ...message,
          to: message.to ?? partnerIdRef.current ?? undefined,
        });
      } catch (error) {
        console.error("Failed to send signaling message:", error);
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

      switch (message.type) {
        case "user-joined": {
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
            await sendSignalingMessage({
              type: "user-joined",
              data: { name: user.name },
              to: message.from,
            });
          }
          if (!isHost && !offerSentRef.current) {
            await createAndSendOffer(message.from);
          }
          break;
        }
        case "offer": {
          if (!isHost) return;
          const pc = peerConnectionRef.current;
          if (!pc || !message.data) return;
          partnerIdRef.current = message.from;

          if (pc.currentRemoteDescription) {
            console.warn("Remote description already set, ignoring duplicate offer.");
            return;
          }

          try {
            const description: RTCSessionDescriptionInit = message.data;
            await pc.setRemoteDescription(new RTCSessionDescription(description));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignalingMessage({
              type: "answer",
              data: answer,
              to: message.from,
            });
          } catch (error) {
            console.error("Error handling offer:", error);
          }
          break;
        }
        case "answer": {
          if (isHost) return;
          const pc = peerConnectionRef.current;
          if (!pc || !message.data) return;

          try {
            const description: RTCSessionDescriptionInit = message.data;
            await pc.setRemoteDescription(new RTCSessionDescription(description));
          } catch (error) {
            console.error("Error applying answer:", error);
          }
          break;
        }
        case "ice-candidate": {
          const pc = peerConnectionRef.current;
          if (!pc || !message.data) return;
          try {
            await pc.addIceCandidate(new RTCIceCandidate(message.data));
          } catch (error) {
            console.error("Error adding ICE candidate:", error);
          }
          break;
        }
        case "user-left": {
          partnerIdRef.current = null;
          partnerNameRef.current = null;
          offerSentRef.current = false;
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

  const initializeCall = async () => {
    if (!user.user_id) {
      toast.error("Unable to start call. Please refresh and try again.");
      return;
    }

    try {
      // Get local media stream with better quality settings
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

      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        // Ensure video plays
        localVideoRef.current.onloadedmetadata = () => {
          localVideoRef.current?.play().catch(e => {
            console.error("Error playing local video:", e);
          });
        };
      }

      // Initialize WebRTC peer connection
      await setupPeerConnection(stream);

      // Initialize signaling
      const signaling = new SimpleSignaling(sessionId, user.user_id);
      signalingRef.current = signaling;
      signaling.onMessage(handleSignalingMessage);

      const connected = await signaling.connect({
        name: user.name,
        role: isHost ? "host" : "participant",
      });

      if (!connected) {
        toast.error("Failed to connect to the interview room. Please refresh.");
      } else {
        setConnectionStatus("connecting");
      }

      toast.success("Camera and microphone connected");
    } catch (error: any) {
      console.error("Error initializing call:", error);
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

    // Add local stream to peer connection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);
      const [remoteMediaStream] = event.streams;
      setRemoteStream(remoteMediaStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteMediaStream;
        // Ensure remote video plays
        remoteVideoRef.current.onloadedmetadata = () => {
          remoteVideoRef.current?.play().catch(e => {
            console.error("Error playing remote video:", e);
          });
        };
      }
      setConnectionStatus("connected");
      toast.success("Partner connected!");
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage({
          type: "ice-candidate",
          data: event.candidate,
        });
      }
    };

    // Handle connection state
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setConnectionStatus("connected");
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        setConnectionStatus("disconnected");
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
      console.log("ICE state:", state);
      if ((state === "disconnected" || state === "failed") && !isHost) {
        setConnectionStatus("disconnected");
        toast.error("You were disconnected. Re-enter the session ID to rejoin.");
        cleanup();
        onLeave();
      }
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
      <div className="flex-1 flex gap-4 mt-4">
        {/* Video Area */}
        <div className={cn("flex-1 relative", showChat ? "lg:w-2/3" : "w-full")}>
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

                {/* Chat Toggle */}
                <Button
                  variant="secondary"
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
          </Card>
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className="w-full lg:w-1/3">
            <ChatBox
              sessionId={sessionId}
              user={user}
              onClose={() => setShowChat(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
