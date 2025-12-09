"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { SimpleSignaling, SignalingMessage } from "@/lib/simple-signaling";
import { PendingUser } from "../admission-modal";

export interface VideoCallUser {
  name: string;
  email: string;
  avatar: string;
  user_id?: string;
}

export interface TimerBootstrapConfig {
  endTimeMs: number;
  reminderMinutes: number | null;
}

export interface UseVideoCallConfig {
  sessionId: string;
  publicSessionId?: string;
  user: VideoCallUser;
  isHost: boolean;
  isPublicHost?: boolean;
  onLeave: () => void;
  initialTimerConfig?: TimerBootstrapConfig;
  disableInterviewAPIs?: boolean;
}

export function useVideoCall({
  sessionId,
  publicSessionId,
  user,
  isHost,
  isPublicHost = false,
  onLeave,
  initialTimerConfig,
  disableInterviewAPIs = false,
}: UseVideoCallConfig) {
  // refs
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerStartRef = useRef<number | null>(null);
  const lastReminderSlotRef = useRef<number>(0);
  const isInitialMount = useRef(true);

  // media states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  // connection states
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [iceConnectionState, setIceConnectionState] = useState<string>("new");
  const [signalingState, setSignalingState] = useState<string>("stable");

  // device states
  const [devicesReady, setDevicesReady] = useState(false);
  const [availableVideoDevices, setAvailableVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [availableAudioDevices, setAvailableAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

  // timer state
  const [timerEndMs, setTimerEndMs] = useState<number | null>(null);
  const [timerReminderMinutes, setTimerReminderMinutes] = useState<number | null>(null);
  const [timerRemainingMs, setTimerRemainingMs] = useState<number>(0);

  // code states
  const [currentCode, setCurrentCode] = useState("");
  const [currentLanguage, setCurrentLanguage] = useState("python");

  // recording
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      offerSentRef.current = false;
      answerSentRef.current = false;
      offerReceivedRef.current = false;
      pendingIceCandidatesRef.current = [];
      partnerIdRef.current = null;
      partnerNameRef.current = null;

      if (initialTimerConfig) {
        applyTimerConfig(initialTimerConfig.endTimeMs, initialTimerConfig.reminderMinutes, false);
      }

      if (publicSessionId) {
        enumerateDevices();
      } else {
        initializeCall();
      }
    }

    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;

      remoteVideoRef.current.onloadedmetadata = () => {
        remoteVideoRef.current?.play().catch((e) => console.error("[WebRTC] Error playing remote video:", e));
      };

      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!localStream || !localVideoRef.current) return;

    const videoEl = localVideoRef.current;
    videoEl.srcObject = localStream;

    const ensurePlay = () => {
      videoEl.play().catch((e) => console.warn("[WebRTC] Unable to play local video:", e));
    };

    if (videoEl.readyState >= 1) {
      ensurePlay();
    } else {
      videoEl.onloadedmetadata = ensurePlay;
    }

    return () => {
      videoEl.onloadedmetadata = null;
      videoEl.srcObject = null;
    };
  }, [localStream, devicesReady]);

  const formatMs = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

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
        return;
      }

      const targetId = message.to ?? partnerIdRef.current ?? undefined;

      try {
        await signalingRef.current.send({
          ...message,
          to: targetId,
        });
      } catch (error) {
        setTimeout(async () => {
          try {
            await signalingRef.current?.send({
              ...message,
              to: targetId,
            });
          } catch (retryError) {
            console.error("[WebRTC] Retry failed for", message.type, retryError);
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

  useEffect(() => {
    if (localStream && !peerConnectionRef.current && sessionId && sessionId.trim() !== "" && user.user_id) {
      const completeInit = async () => {
        try {
          await setupPeerConnection(localStream);

          const signaling = new SimpleSignaling(sessionId, user.user_id!);
          signalingRef.current = signaling;
          signaling.onMessage(handleSignalingMessage);

          const connected = await signaling.connect({
            name: user.name,
            role: isHost ? "host" : "participant",
          });

          if (connected) {
            setConnectionStatus("connecting");
          }
        } catch (error) {
          console.error("[WebRTC] Error completing initialization:", error);
        }
      };
      completeInit();
    }
  }, [sessionId, localStream, user.user_id]);

  const reconnect = useCallback(async () => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (signalingRef.current) {
      await signalingRef.current.disconnect().catch((error: any) => console.error("Error disconnecting signaling during reconnect:", error));
      signalingRef.current = null;
    }

    setRemoteStream(null);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    offerSentRef.current = false;
    answerSentRef.current = false;
    offerReceivedRef.current = false;
    pendingIceCandidatesRef.current = [];
    partnerIdRef.current = null;
    updatePartnerName(null);
    setConnectionStatus("connecting");

    setTimeout(() => {
      if (isMountedRef.current) {
        initializeCall();
      }
    }, 500);
  }, [updatePartnerName]);

  useEffect(() => {
    if (connectionStatus === "disconnected" && isMountedRef.current) {
      if (publicSessionId && !isInitialMount.current) {
        const reconnectTimeout = setTimeout(() => {
          if (isMountedRef.current && connectionStatus === "disconnected") {
            reconnect();
          }
        }, 2000);

        return () => clearTimeout(reconnectTimeout);
      }
    }
  }, [connectionStatus, publicSessionId, reconnect]);

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

      const pc = peerConnectionRef.current;

      if (!pc) {
        return;
      }

      try {
        switch (message.type) {
          case "user-joined":
            if (!isHost && message.from && !partnerIdRef.current) {
              partnerIdRef.current = message.from;
              if (message.data?.name) {
                updatePartnerName(message.data.name);
              }

              if (!peerConnectionRef.current) {
                await setupPeerConnection(localStream!);
                offerReceivedRef.current = false;
                offerSentRef.current = false;
                answerSentRef.current = false;
                pendingIceCandidatesRef.current = [];
              }

              if (!offerSentRef.current) {
                await createAndSendOffer(message.from);
              }
            } else if (isHost && message.from) {
              const isNewParticipant = !partnerIdRef.current || partnerIdRef.current !== message.from;

              partnerIdRef.current = message.from;
              if (message.data?.name) {
                updatePartnerName(message.data.name);
              }

              if (isPublicHost && !peerConnectionRef.current) {
                await setupPeerConnection(localStream!);
                offerReceivedRef.current = false;
                offerSentRef.current = false;
                answerSentRef.current = false;
                pendingIceCandidatesRef.current = [];
              }
            }
            break;

          case "offer":
            if (message.data && message.from) {
              partnerIdRef.current = message.from;
              if (message.data.name) {
                updatePartnerName(message.data.name);
              }

              if (!pc) {
                await setupPeerConnection(localStream!);
                const newPc = peerConnectionRef.current;
                if (!newPc) {
                  return;
                }
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

                if (pendingIceCandidatesRef.current.length > 0) {
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
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(message.data));

                if (pendingIceCandidatesRef.current.length > 0) {
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
                if (pc.remoteDescription) {
                  await pc.addIceCandidate(candidate);
                } else {
                  pendingIceCandidatesRef.current.push(candidate);
                }
              } catch (error) {
                console.error("[WebRTC] Error adding ICE candidate:", error);
              }
            }
            break;

          case "user-left":
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
    [isHost, createAndSendOffer, sendSignalingMessage, updatePartnerName, localStream, isPublicHost]
  );

  const fetchPendingRequests = useCallback(async () => {
    if (disableInterviewAPIs) return;
    if (!isHost || isPublicHost) return;

    try {
      const response = await fetch(`/api/mock-interview/sessions/admission?sessionId=${encodeURIComponent(sessionId)}`);
      if (!response.ok) return;

      const data = await response.json();
      const pending = data.pendingRequests || [];

      const normalized: PendingUser[] = pending.map((user: any) => ({
        user_id: user.user_id,
        full_name: user.full_name || user.username || "Unknown",
        username: user.username || "",
        avatar_url: user.avatar_url || "",
      }));

      setPendingUsers(normalized);
    } catch (error) {
      console.error("Error fetching admission requests:", error);
    }
  }, [disableInterviewAPIs, isHost, isPublicHost, sessionId]);

  useEffect(() => {
    if (disableInterviewAPIs) return;
    if (!isHost || isPublicHost) return;

    fetchPendingRequests();
    admissionPollRef.current = setInterval(fetchPendingRequests, 3000);

    return () => {
      if (admissionPollRef.current) {
        clearInterval(admissionPollRef.current);
        admissionPollRef.current = null;
      }
    };
  }, [disableInterviewAPIs, isHost, isPublicHost, fetchPendingRequests]);

  const handlePendingApprove = useCallback((userId: string) => {
    setPendingUsers((prev) => prev.filter((user) => user.user_id !== userId));
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  const handlePendingDeny = useCallback((userId: string) => {
    setPendingUsers((prev) => prev.filter((user) => user.user_id !== userId));
  }, []);

  const setupDataChannel = (channel: RTCDataChannel) => {
    dataChannelRef.current = channel;

    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleDataChannelMessage(message);
      } catch (error) {
        console.error("Error parsing data channel message:", error);
      }
    };
  };

  const handleDataChannelMessage = (message: any) => {
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
        if (codeEditorRef.current && codeEditorRef.current.applyRemoteOutput) {
          codeEditorRef.current.applyRemoteOutput(message.output);
        }
        break;
      case "whiteboard-stroke":
        if (whiteboardRef.current && whiteboardRef.current.applyRemoteStroke) {
          whiteboardRef.current.applyRemoteStroke(message.strokeData);
        }
        break;
      case "whiteboard-draw":
        if (whiteboardRef.current && whiteboardRef.current.applyRemoteDrawing) {
          whiteboardRef.current.applyRemoteDrawing(message.imageData);
        }
        break;
      case "whiteboard-clear":
        if (whiteboardRef.current && whiteboardRef.current.clear) {
          whiteboardRef.current.clear({ broadcast: false });
        }
        break;
      case "whiteboard-settings":
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

  const sendDataMessage = useCallback((message: any) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
      try {
        dataChannelRef.current.send(JSON.stringify(message));
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

  const enumerateDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === "videoinput");
      const audioDevices = devices.filter(d => d.kind === "audioinput");

      setAvailableVideoDevices(videoDevices);
      setAvailableAudioDevices(audioDevices);

      if (videoDevices.length > 0 && !selectedVideoDevice) {
        setSelectedVideoDevice(videoDevices[0].deviceId);
      }
      if (audioDevices.length > 0 && !selectedAudioDevice) {
        setSelectedAudioDevice(audioDevices[0].deviceId);
      }

      if (videoDevices.length > 0 && audioDevices.length > 0) {
        startPreview(videoDevices[0].deviceId, audioDevices[0].deviceId);
      }
    } catch (error) {
      console.error("[Device Setup] Error enumerating devices:", error);
      toast.error("Failed to access media devices");
    }
  };

  const startPreview = async (videoDeviceId: string, audioDeviceId: string) => {
    try {
      if (previewStream) {
        previewStream.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          deviceId: audioDeviceId ? { exact: audioDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setPreviewStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.onloadedmetadata = () => {
          localVideoRef.current?.play().catch(e => {
            console.error("[Device Setup] Error playing preview:", e);
          });
        };
      }
    } catch (error) {
      console.error("[Device Setup] Error starting preview:", error);
      toast.error("Failed to access camera/microphone");
    }
  };

  const handleDevicesReady = async () => {
    if (!previewStream) {
      toast.error("Please allow camera and microphone access");
      return;
    }

    setDevicesReady(true);
    setLocalStream(previewStream);
    await initializeCall();
  };

  const initializeCall = async () => {
    if (!user.user_id) {
      toast.error("Unable to start call. Please refresh and try again.");
      return;
    }

    try {
      let stream = localStream;

      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
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
          localVideoRef.current.onloadedmetadata = () => {
            localVideoRef.current?.play().catch(e => {
              console.error("[WebRTC] Error playing local video:", e);
            });
          };
        }
      }

      if (!sessionId || sessionId.trim() === "") {
        return;
      }

      await setupPeerConnection(stream);

      const signaling = new SimpleSignaling(sessionId, user.user_id, sessionId.startsWith('study-pod-') ? 'study-pod-session' : 'mock-interview');
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
        if (!isHost && !offerSentRef.current) {
          setTimeout(() => {
            if (!offerSentRef.current && isMountedRef.current) {
              createAndSendOffer();
            }
          }, 500);
        }
      }

      if (!disableInterviewAPIs && !isHost && publicSessionId) {
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
        } catch (e) {
          console.error('[WebRTC] Failed to mark session unavailable:', e);
        }
      }

      if (!disableInterviewAPIs) {
        try {
          if (isHost) {
            if (!isPublicHost) {
              await fetch('/api/mock-interview/sessions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, action: 'host_ready' }),
              });
            }
          } else {
            if (!publicSessionId) {
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
      }

      toast.success("Camera and microphone connected");
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
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    };

    const pc = new RTCPeerConnection(configuration);
    peerConnectionRef.current = pc;

    const tracks = stream.getTracks();
    tracks.forEach((track) => {
      pc.addTrack(track, stream);
    });

    if (!isHost) {
      const dataChannel = pc.createDataChannel("code-sync");
      setupDataChannel(dataChannel);
    } else {
      pc.ondatachannel = (event) => {
        setupDataChannel(event.channel);
      };
    }

    pc.ontrack = (event) => {
      if (event.streams && event.streams.length > 0) {
        const [remoteMediaStream] = event.streams;
        setRemoteStream(remoteMediaStream);

        const attachStream = () => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteMediaStream;

            remoteVideoRef.current.onloadedmetadata = () => {
              remoteVideoRef.current?.play()
                .then(() => {
                  setConnectionStatus("connected");
                  toast.success("Partner connected!");
                })
                .catch(e => {
                  console.error("[WebRTC] Error playing remote video:", e);
                  toast.error("Video playback issue - check browser permissions");
                });
            };

            remoteVideoRef.current.play().catch(() => {});
          } else {
            setTimeout(attachStream, 100);
          }
        };

        setTimeout(attachStream, 0);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage({
          type: "ice-candidate",
          data: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setConnectionStatus("connected");
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        setConnectionStatus("disconnected");

        if (!isHost || !isPublicHost) {
          toast.error("Connection lost");
          cleanup();
          onLeave();
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      setIceConnectionState(state);
      if (state === "disconnected" || state === "failed") {
        setConnectionStatus("disconnected");

        if (isPublicHost) {
          toast.info("Participant disconnected. Waiting for next participant...");
          setRemoteStream(null);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
          if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
          }
          partnerIdRef.current = null;
          partnerNameRef.current = null;
          updatePartnerName(null);
          if (!disableInterviewAPIs && publicSessionId) {
            fetch('/api/mock-interview/public-sessions', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: publicSessionId,
                action: 'set_available',
              }),
            }).catch((error) => console.error("Error marking session available:", error));
          }
        } else {
          toast.error("You were disconnected.");
          if (!disableInterviewAPIs && isHost) {
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

    pc.onicegatheringstatechange = () => {};
    pc.onsignalingstatechange = () => {
      const state = pc.signalingState;
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

    if (!disableInterviewAPIs && !isHost && publicSessionId) {
      fetch('/api/mock-interview/public-sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: publicSessionId,
          action: 'set_available',
        }),
      }).catch((error) => console.error("Error marking session available:", error));

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

  return {
    // refs
    localVideoRef,
    remoteVideoRef,
    codeEditorRef,
    whiteboardRef,
    // media
    localStream,
    remoteStream,
    videoEnabled,
    audioEnabled,
    screenSharing,
    // connection
    connectionStatus,
    partnerName,
    iceConnectionState,
    signalingState,
    // device
    devicesReady,
    availableVideoDevices,
    availableAudioDevices,
    selectedVideoDevice,
    selectedAudioDevice,
    previewStream,
    setSelectedVideoDevice,
    setSelectedAudioDevice,
    enumerateDevices,
    startPreview,
    handleDevicesReady,
    // timer
    timerEndMs,
    timerReminderMinutes,
    timerRemainingMs,
    formatMs,
    applyTimerConfig,
    // code + channel
    currentCode,
    currentLanguage,
    handleCodeChange,
    handleLanguageChange,
    sendDataMessage,
    // admissions
    pendingUsers,
    handlePendingApprove,
    handlePendingDeny,
    // media actions
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    startRecording,
    stopRecording,
    isRecording,
    // misc
    setConnectionStatus,
    cleanup,
  };
}
