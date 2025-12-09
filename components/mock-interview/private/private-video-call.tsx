"use client";

import React, { useState } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  MessageSquare,
  Code,
  Palette,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatBox } from "../chat-box";
import { SessionNavbar } from "../session-navbar";
import { AdmissionModal, PendingUser } from "../admission-modal";
import { CollaborativeCodeEditor } from "../collaborative-code-editor";
import { CollaborativeWhiteboard } from "../collaborative-whiteboard";
import { useVideoCall, VideoCallUser } from "../hooks/use-video-call";

interface PrivateVideoCallProps {
  sessionId: string;
  user: VideoCallUser;
  isHost: boolean;
  onLeave: () => void;
}

export function PrivateVideoCall({ sessionId, user, isHost, onLeave }: PrivateVideoCallProps) {
  const [showChat, setShowChat] = useState(true);
  const [showCodeEditor, setShowCodeEditor] = useState(true);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

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
    remoteWhiteboardOpen,
    timerEndMs,
    timerReminderMinutes,
    timerRemainingMs,
    formatMs,
    currentCode,
    currentLanguage,
    handleCodeChange,
    handleLanguageChange,
    sendDataMessage,
    pendingUsers,
    handlePendingApprove,
    handlePendingDeny,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    startRecording,
    stopRecording,
    isRecording,
    cleanup,
  } = useVideoCall({
    sessionId,
    user,
    isHost,
    onLeave,
  });

  const handleLeave = () => {
    if (confirm("Are you sure you want to leave the interview?")) {
      cleanup(true);
      onLeave();
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      {isHost && (
        <AdmissionModal
          open={pendingUsers.length > 0}
          pendingUsers={pendingUsers as PendingUser[]}
          sessionId={sessionId}
          onApprove={handlePendingApprove}
          onDeny={handlePendingDeny}
        />
      )}

      <SessionNavbar
        sessionId={sessionId}
        isHost={isHost}
        onLeave={handleLeave}
        timerEndMs={timerEndMs}
        timerRemainingMs={timerRemainingMs}
        formatMs={formatMs}
        pendingUsers={pendingUsers}
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
          remoteWhiteboardOpen={remoteWhiteboardOpen}
        />
      )}
    </div>
  );
}
