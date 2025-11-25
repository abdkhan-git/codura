"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  Check,
  Loader2,
  Clock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ChatBox } from "../chat-box";
import { SessionNavbar } from "../session-navbar";
import { CollaborativeCodeEditor } from "../collaborative-code-editor";
import { CollaborativeWhiteboard } from "../collaborative-whiteboard";
import { PublicInterviewAdmission } from "../public-interview-admission";
import { usePublicInterview } from "@/contexts/public-interview-context";
import { useVideoCall, VideoCallUser } from "../hooks/use-video-call";

interface PublicVideoCallProps {
  sessionId: string;
  publicSessionId: string;
  user: VideoCallUser;
  isHost: boolean;
  onLeave: () => void;
  isPublicHost?: boolean;
}

export function PublicVideoCall({
  sessionId,
  publicSessionId,
  user,
  isHost,
  onLeave,
  isPublicHost = false,
}: PublicVideoCallProps) {
  const { activeSession, setActiveSession } = usePublicInterview();
  const [showChat, setShowChat] = useState(true);
  const [showCodeEditor, setShowCodeEditor] = useState(true);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const initialTimer = useMemo(() => {
    if (activeSession?.endTime) {
      const endTime = new Date(activeSession.endTime).getTime();
      const now = Date.now();
      const remainingMinutes = Math.ceil((endTime - now) / 60_000);
      let reminderMinutes = 15;
      if (remainingMinutes <= 20) {
        reminderMinutes = 5;
      } else if (remainingMinutes <= 45) {
        reminderMinutes = 10;
      }

      return { endTimeMs: endTime, reminderMinutes };
    }
    return undefined;
  }, [activeSession?.endTime]);

  const {
    localVideoRef,
    remoteVideoRef,
    codeEditorRef,
    whiteboardRef,
    localStream,
    remoteStream,
    videoEnabled,
    audioEnabled,
    screenSharing,
    connectionStatus,
    partnerName,
    iceConnectionState,
    signalingState,
    timerEndMs,
    timerReminderMinutes,
    timerRemainingMs,
    formatMs,
    applyTimerConfig,
    currentCode,
    currentLanguage,
    handleCodeChange,
    handleLanguageChange,
    sendDataMessage,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    startRecording,
    stopRecording,
    isRecording,
    cleanup,
    devicesReady,
    availableVideoDevices,
    availableAudioDevices,
    selectedVideoDevice,
    selectedAudioDevice,
    previewStream,
    setSelectedVideoDevice,
    setSelectedAudioDevice,
    startPreview,
    handleDevicesReady,
  } = useVideoCall({
    sessionId,
    publicSessionId,
    user,
    isHost,
    onLeave,
    isPublicHost,
  });

  useEffect(() => {
    if (initialTimer) {
      applyTimerConfig(initialTimer.endTimeMs, initialTimer.reminderMinutes, false);
    }
  }, [initialTimer, applyTimerConfig]);

  const handleLeave = () => {
    if (isRecording) {
      stopRecording();
    }
    if (confirm("Are you sure you want to leave the interview?")) {
      cleanup(true);
      onLeave();
    }
  };

  if (!devicesReady) {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-gradient-to-br from-zinc-900 to-zinc-800">
        <Card className="w-full max-w-2xl border-2 border-border/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <Video className="w-6 h-6 text-brand" />
              Setup Your Devices
            </CardTitle>
            <CardDescription>Test your camera and microphone before joining the interview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {timerEndMs && (
              <div className="flex items-center justify-center gap-4 px-4 py-3 rounded-lg bg-brand/10 border border-brand/20">
                <Clock className="w-5 h-5 text-brand" />
                <div>
                  <p className="text-sm font-medium">Session Time Remaining</p>
                  <p className="text-2xl font-bold text-brand">{formatMs(timerRemainingMs)}</p>
                </div>
              </div>
            )}

            <div className="relative aspect-video bg-zinc-900 rounded-lg overflow-hidden border-2 border-border/20">
              {previewStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <VideoOff className="w-16 h-16 text-zinc-600 mx-auto" />
                    <p className="text-zinc-400">Camera preview will appear here</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="video-device" className="flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Camera
                </Label>
                <select
                  id="video-device"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-border text-sm"
                  value={selectedVideoDevice}
                  onChange={(e) => {
                    setSelectedVideoDevice(e.target.value);
                    if (selectedAudioDevice) {
                      startPreview(e.target.value, selectedAudioDevice);
                    }
                  }}
                >
                  {availableVideoDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${availableVideoDevices.indexOf(device) + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="audio-device" className="flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  Microphone
                </Label>
                <select
                  id="audio-device"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-border text-sm"
                  value={selectedAudioDevice}
                  onChange={(e) => {
                    setSelectedAudioDevice(e.target.value);
                    if (selectedVideoDevice) {
                      startPreview(selectedVideoDevice, e.target.value);
                    }
                  }}
                >
                  {availableAudioDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${availableAudioDevices.indexOf(device) + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              onClick={handleDevicesReady}
              className="w-full bg-gradient-to-r from-brand to-blue-600 hover:from-brand/90 hover:to-blue-600/90"
              size="lg"
              disabled={!previewStream}
            >
              {previewStream ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Continue to Interview
                </>
              ) : (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Requesting Permissions...
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-gradient-to-br from-zinc-950 via-zinc-900 to-black">
      <SessionNavbar
        sessionId={sessionId}
        isHost={isHost}
        isRecording={isRecording}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onLeave={handleLeave}
      />

      <div className="flex-1 flex gap-4 mt-4 overflow-hidden">
        <div className={cn("relative", showCodeEditor || showChat ? "w-1/2" : "w-full")}>
          <Card className="h-full border-2 border-border/20 bg-zinc-900 relative overflow-hidden">
            {timerEndMs && (
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                <div className="px-3 py-2 rounded-lg bg-black/70 border border-white/10 text-white text-sm font-medium">
                  Timer: {formatMs(timerRemainingMs)}
                </div>
                {timerReminderMinutes && (
                  <div className="px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white/80 text-xs">
                    Reminders every {timerReminderMinutes} min
                  </div>
                )}
              </div>
            )}

            <div className="absolute inset-0">
              {remoteStream ? (
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  {isPublicHost ? (
                    <div className="w-full max-w-2xl max-h-full overflow-y-auto">
                      <PublicInterviewAdmission
                        sessionId={publicSessionId || sessionId}
                        onApprove={(_requestId, approvedSessionCode, timerConfig) => {
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

              {remoteStream && (
                <div className="absolute bottom-6 left-6 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <p className="text-white font-medium">{partnerName || "Interview Partner"}</p>
                </div>
              )}
            </div>

            <div className="absolute top-6 right-6 w-64 aspect-video rounded-lg overflow-hidden border-2 border-white/20 shadow-2xl bg-zinc-800">
              {videoEnabled && localStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                  <VideoOff className="w-8 h-8 text-zinc-400" />
                </div>
              )}

              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
                You
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant={videoEnabled ? "secondary" : "destructive"}
                  size="lg"
                  onClick={toggleVideo}
                  className="rounded-full w-14 h-14 p-0"
                  title={videoEnabled ? "Turn off camera" : "Turn on camera"}
                >
                  {videoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                </Button>

                <Button
                  variant={audioEnabled ? "secondary" : "destructive"}
                  size="lg"
                  onClick={toggleAudio}
                  className="rounded-full w-14 h-14 p-0"
                  title={audioEnabled ? "Mute microphone" : "Unmute microphone"}
                >
                  {audioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                </Button>

                <Button
                  variant={screenSharing ? "default" : "secondary"}
                  size="lg"
                  onClick={toggleScreenShare}
                  className="rounded-full w-14 h-14 p-0"
                  title={screenSharing ? "Stop sharing" : "Share screen"}
                >
                  {screenSharing ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
                </Button>

                <Button
                  variant={showCodeEditor ? "default" : "secondary"}
                  size="lg"
                  onClick={() => setShowCodeEditor(!showCodeEditor)}
                  className="rounded-full w-14 h-14 p-0"
                  title="Toggle code editor"
                >
                  <Code className="w-6 h-6" />
                </Button>

                <Button
                  variant={showWhiteboard ? "default" : "secondary"}
                  size="lg"
                  onClick={() => setShowWhiteboard(!showWhiteboard)}
                  className="rounded-full w-14 h-14 p-0"
                  title="Toggle whiteboard"
                >
                  <Palette className="w-6 h-6" />
                </Button>

                <Button
                  variant={showChat ? "default" : "secondary"}
                  size="lg"
                  onClick={() => setShowChat(!showChat)}
                  className="rounded-full w-14 h-14 p-0"
                  title="Toggle chat"
                >
                  <MessageSquare className="w-6 h-6" />
                </Button>

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

            {isRecording && (
              <div className="absolute top-6 left-6 flex items-center gap-2 bg-red-500/90 backdrop-blur-sm px-4 py-2 rounded-full">
                <Circle className="w-3 h-3 fill-white animate-pulse" />
                <span className="text-white text-sm font-medium">Recording</span>
              </div>
            )}

            {connectionStatus === "connecting" && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-yellow-500/90 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-white text-sm font-medium">Connecting...</span>
              </div>
            )}

            <div className="absolute bottom-24 right-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                className="text-white/60 hover:text-white text-xs"
              >
                Debug {showDebugInfo ? "▼" : "▶"}
              </Button>
            </div>

            {showDebugInfo && (
              <div className="absolute bottom-24 right-6 bg-black/80 backdrop-blur-sm p-4 rounded-lg text-white text-xs font-mono max-w-xs">
                <div className="space-y-1">
                  <div className="font-bold border-b border-white/20 pb-1 mb-2">WebRTC Debug Info</div>
                  <div>Role: {isHost ? "HOST" : "PARTICIPANT"}</div>
                  <div>User ID: {user.user_id?.substring(0, 8)}...</div>
                  <div className="border-t border-white/20 pt-1 mt-1">
                    <div>
                      Connection:{" "}
                      <span
                        className={cn(
                          "font-bold",
                          connectionStatus === "connected"
                            ? "text-green-400"
                            : connectionStatus === "connecting"
                              ? "text-yellow-400"
                              : "text-red-400"
                        )}
                      >
                        {connectionStatus}
                      </span>
                    </div>
                    <div>
                      ICE State:{" "}
                      <span
                        className={cn(
                          "font-bold",
                          iceConnectionState === "connected" || iceConnectionState === "completed"
                            ? "text-green-400"
                            : iceConnectionState === "checking"
                              ? "text-yellow-400"
                              : "text-gray-400"
                        )}
                      >
                        {iceConnectionState}
                      </span>
                    </div>
                    <div>
                      Signaling: <span className="font-bold text-blue-400">{signalingState}</span>
                    </div>
                  </div>
                  <div className="border-t border-white/20 pt-1 mt-1">
                    <div>Local Tracks: {localStream?.getTracks().length || 0}</div>
                    <div>Remote Tracks: {remoteStream?.getTracks().length || 0}</div>
                  </div>
                  <div className="text-[10px] text-white/60 mt-2">Check browser console for detailed logs</div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {(showCodeEditor || showChat) && (
          <div className="w-1/2 flex flex-col gap-4">
            {showCodeEditor && (
              <Card className={cn("border-2 border-border/20 overflow-hidden", showChat ? "h-[70%]" : "h-full")}>
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

            {showChat && (
              <div className={cn(showCodeEditor ? "h-[30%]" : "h-full")}>
                <ChatBox sessionId={sessionId} user={user} onClose={() => setShowChat(false)} />
              </div>
            )}
          </div>
        )}
      </div>

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
