"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  Check,
  X,
  Copy,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AudioTestPlayback } from "./audio-test-playback";

interface WaitingRoomProps {
  sessionRole: "host" | "join";
  sessionId: string | null;
  user: {
    name: string;
    email: string;
    avatar: string;
    user_id?: string;
  };
  onDevicesReady: () => void;
  onJoinSession: (sessionId: string) => void;
  onCancel: () => void;
}

export function WaitingRoom({
  sessionRole,
  sessionId,
  user,
  onDevicesReady,
  onJoinSession,
  onCancel,
}: WaitingRoomProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const approvalPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Device states
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  // Device selection
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");

  // Test states
  const [videoTest, setVideoTest] = useState<"pending" | "success" | "failed">("pending");
  const [audioTest, setAudioTest] = useState<"pending" | "success" | "failed">("pending");
  const [microphoneLevel, setMicrophoneLevel] = useState<number>(0);

  // Join session
  const [joinSessionId, setJoinSessionId] = useState("");
  const [copied, setCopied] = useState(false);
  const [pendingSessionCode, setPendingSessionCode] = useState<string | null>(null);
  const [hostSessionStatus, setHostSessionStatus] = useState<"idle" | "creating" | "ready" | "error">("idle");
  const [joinStatus, setJoinStatus] = useState<"idle" | "joining" | "pending" | "approved" | "denied">("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Initialize media devices
  useEffect(() => {
    enumerateDevices();
    return () => {
      if (approvalPollRef.current) {
        clearInterval(approvalPollRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Start media stream when devices are selected
  useEffect(() => {
    if (selectedVideoDevice && selectedAudioDevice) {
      startMediaStream();
    }
  }, [selectedVideoDevice, selectedAudioDevice, videoEnabled, audioEnabled]);

  // Monitor microphone level
  useEffect(() => {
    if (stream && audioEnabled) {
      const cleanup = monitorAudioLevel();
      return () => {
        if (cleanup) cleanup();
      };
    }
    return;
  }, [stream, audioEnabled]);

  const hostInitRef = useRef(false);
  useEffect(() => {
    if (sessionRole === "host" && sessionId && !hostInitRef.current) {
      hostInitRef.current = true;
      ensureHostSession(sessionId);
    }
  }, [sessionRole, sessionId]);

  const stopApprovalPolling = () => {
    if (approvalPollRef.current) {
      clearInterval(approvalPollRef.current);
      approvalPollRef.current = null;
    }
  };

  const startApprovalPolling = (sessionCode: string) => {
    stopApprovalPolling();
    approvalPollRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/mock-interview/sessions/admission?sessionId=${encodeURIComponent(sessionCode)}`);
        if (!response.ok) return;

        const data = await response.json();

        // Host path ignored here; this polling is for joiners only
        const status = data?.viewerStatus as ("pending" | "approved" | "none" | undefined);
        const hostReady = !!data?.hostReady;
        if (status === "approved" && hostReady) {
          stopApprovalPolling();
          setJoinStatus("approved");
          setStatusMessage("Host admitted you. Joining the interview...");
          toast.success("Host admitted you! Joining session...");
          onJoinSession(sessionCode);
          return;
        }

        if (status === "pending" || (status === "approved" && !hostReady)) {
          setJoinStatus("pending");
          setStatusMessage(hostReady ? "Host is preparing the session..." : "Waiting for host approval...");
          return;
        }

        // If server says none (not pending, not approved), treat as denied only after we previously requested join
        if (status === "none") {
          stopApprovalPolling();
          setJoinStatus("denied");
          setStatusMessage("Host denied your request to join.");
          toast.error("Host denied your request to join this session.");
        }
      } catch (error) {
        console.error("Error polling session status:", error);
      }
    }, 3000);
  };

  const ensureHostSession = async (sessionCode: string) => {
    if (!sessionCode || hostSessionStatus === "creating" || hostSessionStatus === "ready") {
      return;
    }

    setHostSessionStatus("creating");
    setStatusMessage("Preparing your interview room...");

    try {
      // 1) Try to find an existing session first
      const getRes = await fetch(`/api/mock-interview/sessions?sessionId=${encodeURIComponent(sessionCode)}`);
      if (getRes.ok) {
        const data = await getRes.json();
        if (data?.session) {
          setHostSessionStatus("ready");
          setStatusMessage("Session ready! Share the session ID with your partner.");
          return;
        }
      }

      // 2) Create if it doesn't exist
      const response = await fetch("/api/mock-interview/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionCode }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Failed to create session");
      }

      setHostSessionStatus("ready");
      setStatusMessage("Session ready! Share the session ID with your partner.");
      toast.success("Session created successfully.");
    } catch (error: any) {
      console.error("Error creating/fetching session:", error);
      setHostSessionStatus("error");
      setStatusMessage(error?.message || "Unable to create session. Please try again.");
      toast.error(error?.message || "Failed to create session.");
    }
  };

  const requestJoin = async (sessionCode: string) => {
    if (joinStatus === "joining" || joinStatus === "pending") {
      return;
    }

    if (!user.user_id) {
      toast.error("Unable to verify your account. Please re-authenticate.");
      return;
    }

    try {
      setJoinStatus("joining");
      setStatusMessage("Requesting to join session...");
      setPendingSessionCode(sessionCode);
      stopApprovalPolling();

      const response = await fetch("/api/mock-interview/sessions/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to join session");
      }

      if (data.status === "pending") {
        setJoinStatus("pending");
        setStatusMessage("Waiting for host approval...");
        toast.info("Request sent. Waiting for host approval.");
        startApprovalPolling(sessionCode);
      } else {
        setJoinStatus("approved");
        setStatusMessage(null);
        toast.success("Joining session...");
        stopApprovalPolling();
        onJoinSession(sessionCode);
      }
    } catch (error: any) {
      console.error("Error joining session:", error);
      setJoinStatus("idle");
      setStatusMessage(error?.message || "Failed to join session.");
      toast.error(error?.message || "Failed to join session.");
    }
  };

  const enumerateDevices = async () => {
    try {
      // First request permissions and get initial stream
      const initialStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // Set the initial stream immediately so camera shows
      setStream(initialStream);
      streamRef.current = initialStream;

      if (videoRef.current) {
        videoRef.current.srcObject = initialStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }

      // Now enumerate devices to get labels
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(device => device.kind === "videoinput");
      const audioInputs = devices.filter(device => device.kind === "audioinput");

      setVideoDevices(videoInputs);
      setAudioDevices(audioInputs);

      if (videoInputs.length > 0) setSelectedVideoDevice(videoInputs[0].deviceId);
      if (audioInputs.length > 0) setSelectedAudioDevice(audioInputs[0].deviceId);

      // Mark tests as successful
      setVideoTest("success");
      setAudioTest("success");

      toast.success("Camera and microphone connected!");
    } catch (error) {
      console.error("Error enumerating devices:", error);
      toast.error("Please allow camera and microphone access to continue");
      setVideoTest("failed");
      setAudioTest("failed");
    }
  };

  const startMediaStream = async () => {
    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: videoEnabled ? {
          deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        } : false,
        audio: audioEnabled ? {
          deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } : false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Wait for video to load
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }

      if (videoEnabled) {
        setVideoTest("success");
      }

      if (audioEnabled) {
        setAudioTest("success");
      }
    } catch (error: any) {
      console.error("Error accessing media devices:", error);
      if (error.name === 'NotAllowedError') {
        toast.error("Camera/microphone access denied. Please allow permissions.");
      } else if (error.name === 'NotFoundError') {
        toast.error("No camera or microphone found on this device.");
      } else {
        toast.error("Failed to access camera or microphone: " + error.message);
      }
      setVideoTest("failed");
      setAudioTest("failed");
    }
  };

  const monitorAudioLevel = () => {
    if (!stream) return;

    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      microphone.connect(analyser);
      analyser.fftSize = 256;

      let animationId: number;
      const checkLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setMicrophoneLevel(Math.min(100, (average / 255) * 200));
        animationId = requestAnimationFrame(checkLevel);
      };

      checkLevel();

      // Cleanup function
      return () => {
        if (animationId) cancelAnimationFrame(animationId);
        microphone.disconnect();
        audioContext.close();
      };
    } catch (error) {
      console.error("Error monitoring audio level:", error);
    }
  };

  const toggleVideo = () => {
    const newVideoState = !videoEnabled;
    setVideoEnabled(newVideoState);

    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = newVideoState;
      });

      if (newVideoState) {
        setVideoTest("success");
      }
    }
  };

  const toggleAudio = () => {
    const newAudioState = !audioEnabled;
    setAudioEnabled(newAudioState);

    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = newAudioState;
      });

      if (newAudioState) {
        setAudioTest("success");
      }
    }
  };

  const copySessionId = () => {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId);
      setCopied(true);
      toast.success("Session ID copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const testSpeaker = () => {
    // Create an AudioContext and play a test tone
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Set frequency to a pleasant tone (440 Hz = A note)
    oscillator.frequency.value = 440;
    oscillator.type = 'sine';

    // Start at full volume, fade out
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    // Play for 0.5 seconds
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);

    toast.success("Playing test sound - can you hear it?");
  };

  const handleJoin = async () => {
    if (sessionRole === "join") {
      if (!joinSessionId.trim()) {
        toast.error("Please enter a session ID");
        return;
      }

      const sessionCode = joinSessionId.trim();
      await requestJoin(sessionCode);
    } else {
      if (!sessionId) {
        toast.error("Missing session ID. Please go back and try again.");
        return;
      }

      if (hostSessionStatus === "error" || hostSessionStatus === "idle") {
        ensureHostSession(sessionId);
        toast.info("Setting up your session. Please wait a moment...");
        return;
      }

      if (hostSessionStatus === "creating") {
        toast.info("Still preparing your session. Hang tight!");
        return;
      }

      onDevicesReady();
    }
  };

  // Fallback: if we somehow became approved but didn't transition yet
  useEffect(() => {
    if (sessionRole === "join" && joinStatus === "approved" && pendingSessionCode) {
      onJoinSession(pendingSessionCode);
    }
  }, [sessionRole, joinStatus, pendingSessionCode, onJoinSession]);

  const isReady = videoTest === "success" || audioTest === "success";
  const hostButtonLabel =
    hostSessionStatus === "error"
      ? "Retry Setup"
      : hostSessionStatus === "creating"
      ? "Preparing..."
      : "Enter Interview";
  const participantButtonLabel =
    joinStatus === "pending"
      ? "Waiting for Host..."
      : joinStatus === "joining"
      ? "Requesting..."
      : "Join Interview";
  const buttonLabel = sessionRole === "host" ? hostButtonLabel : participantButtonLabel;
  const isProcessing =
    (sessionRole === "host" && hostSessionStatus === "creating") ||
    (sessionRole === "join" && (joinStatus === "joining" || joinStatus === "pending"));
  const isButtonDisabled =
    !isReady ||
    (sessionRole === "join" && (!joinSessionId.trim() || joinStatus === "joining" || joinStatus === "pending")) ||
    (sessionRole === "host" && hostSessionStatus === "creating");
  const statusTone: "info" | "success" | "error" = (() => {
    if (!statusMessage) return "info";
    if (sessionRole === "join") {
      if (joinStatus === "denied") return "error";
      if (joinStatus === "approved") return "success";
      return "info";
    }
    if (hostSessionStatus === "error") return "error";
    if (hostSessionStatus === "ready") return "success";
    return "info";
  })();
  const statusIcon = (() => {
    if (!statusMessage) return null;
    if (statusTone === "success") {
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    }
    if (statusTone === "error") {
      return <X className="w-4 h-4 text-red-500" />;
    }
    if (isProcessing) {
      return <Loader2 className="w-4 h-4 text-brand animate-spin" />;
    }
    return <AlertCircle className="w-4 h-4 text-brand" />;
  })();

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back Button */}
      <Button variant="ghost" className="mb-6 gap-2" onClick={onCancel}>
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">
          {sessionRole === "host" ? "Setup Your Interview Room" : "Join Interview Room"}
        </h1>
        <p className="text-muted-foreground">
          Test your devices before starting the interview
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Video Preview */}
        <div className="lg:col-span-2">
          <Card className="border-2 border-border/20 bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5 text-brand" />
                Video Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Video Display */}
              <div className="relative aspect-video bg-zinc-900 rounded-lg overflow-hidden">
                {videoEnabled && videoTest === "success" ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-3">
                      {videoEnabled ? (
                        <>
                          <VideoOff className="w-16 h-16 text-muted-foreground mx-auto" />
                          <p className="text-muted-foreground">Camera is loading...</p>
                        </>
                      ) : (
                        <>
                          <VideoOff className="w-16 h-16 text-muted-foreground mx-auto" />
                          <p className="text-muted-foreground">Camera is off</p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* User overlay */}
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-lg">
                  <p className="text-white text-sm font-medium">{user.name}</p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant={videoEnabled ? "default" : "destructive"}
                  size="lg"
                  onClick={toggleVideo}
                  className="gap-2"
                >
                  {videoEnabled ? (
                    <>
                      <Video className="w-5 h-5" />
                      Camera On
                    </>
                  ) : (
                    <>
                      <VideoOff className="w-5 h-5" />
                      Camera Off
                    </>
                  )}
                </Button>

                <Button
                  variant={audioEnabled ? "default" : "destructive"}
                  size="lg"
                  onClick={toggleAudio}
                  className="gap-2"
                >
                  {audioEnabled ? (
                    <>
                      <Mic className="w-5 h-5" />
                      Mic On
                    </>
                  ) : (
                    <>
                      <MicOff className="w-5 h-5" />
                      Mic Off
                    </>
                  )}
                </Button>

                <Button
                  variant="default"
                  size="lg"
                  onClick={testSpeaker}
                  className="gap-2"
                >
                  <Volume2 className="w-5 h-5" />
                  Test Speaker
                </Button>
              </div>

              {/* Microphone Level Indicator */}
              {audioEnabled && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Microphone Level</Label>
                    <span className="text-xs text-muted-foreground">
                      {microphoneLevel > 5 ? "🎤 Working!" : "Speak to test"}
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-100 ${
                        microphoneLevel > 5
                          ? 'bg-gradient-to-r from-green-500 to-green-600'
                          : 'bg-gradient-to-r from-gray-400 to-gray-500'
                      }`}
                      style={{ width: `${microphoneLevel}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {microphoneLevel > 50
                      ? "Perfect! Your microphone is working great 🎉"
                      : microphoneLevel > 5
                      ? "Good! Keep speaking to see levels"
                      : "Speak louder to test your microphone"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Settings & Status */}
        <div className="space-y-6">
          {/* Device Settings */}
          <Card className="border-border/20 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Device Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Camera Selection */}
              <div className="space-y-2">
                <Label htmlFor="camera">Camera</Label>
                <select
                  id="camera"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  value={selectedVideoDevice}
                  onChange={(e) => setSelectedVideoDevice(e.target.value)}
                >
                  {videoDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Microphone Selection */}
              <div className="space-y-2">
                <Label htmlFor="microphone">Microphone</Label>
                <select
                  id="microphone"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  value={selectedAudioDevice}
                  onChange={(e) => setSelectedAudioDevice(e.target.value)}
                >
                  {audioDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Device Tests */}
          <Card className="border-border/20 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Device Check</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Camera</span>
                </div>
                {videoTest === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : videoTest === "failed" ? (
                  <X className="w-5 h-5 text-red-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Microphone</span>
                </div>
                {audioTest === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : audioTest === "failed" ? (
                  <X className="w-5 h-5 text-red-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Audio Test - Record and Play Back */}
          <AudioTestPlayback />

          {/* Session Info for Hosts */}
          {sessionRole === "host" && sessionId && (
            <Card className="border-2 border-brand/20 bg-gradient-to-br from-brand/5 to-transparent">
              <CardHeader>
                <CardTitle className="text-lg">Share Session ID</CardTitle>
                <CardDescription>Send this ID to your interview partner</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-background rounded-lg border border-border font-mono text-sm break-all">
                  {sessionId}
                </div>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={copySessionId}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Session ID
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Join Session Input */}
          {sessionRole === "join" && (
            <Card className="border-2 border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
              <CardHeader>
                <CardTitle className="text-lg">Enter Session ID</CardTitle>
                <CardDescription>Get the ID from your interview partner</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Enter session ID..."
                  value={joinSessionId}
                  onChange={(e) => {
                    setJoinSessionId(e.target.value);
                    if (joinStatus === "denied") {
                      setJoinStatus("idle");
                      setStatusMessage(null);
                    }
                  }}
                  disabled={joinStatus === "pending" || joinStatus === "joining"}
                  className="font-mono"
                />
              </CardContent>
            </Card>
          )}

          {/* Ready Button */}
          <Button
            size="lg"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand to-blue-600 hover:from-brand/90 hover:to-blue-600/90"
            onClick={handleJoin}
            disabled={isButtonDisabled}
          >
            {isProcessing && <Loader2 className="w-5 h-5 animate-spin" />}
            {buttonLabel}
          </Button>

          {statusMessage && (
            <div
              className={cn(
                "mt-4 flex items-center gap-2 text-sm rounded-lg border px-3 py-2",
                statusTone === "error"
                  ? "border-red-500/40 bg-red-500/10 text-red-200"
                  : statusTone === "success"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : "border-brand/40 bg-brand/10 text-foreground"
              )}
            >
              {statusIcon}
              <span className="flex-1">
                {statusMessage}
                {sessionRole === "join" && pendingSessionCode && joinStatus === "pending" && (
                  <span className="block text-xs text-foreground/70">
                    Session ID: <span className="font-mono">{pendingSessionCode}</span>
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
