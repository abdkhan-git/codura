"use client";

import { VideoCallUser } from "./hooks/use-video-call";
import { PrivateVideoCall } from "./private/private-video-call";
import { PublicVideoCall } from "./public/public-video-call";

interface VideoCallInterfaceProps {
  sessionId: string;
  publicSessionId?: string;
  user: VideoCallUser;
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
  if (publicSessionId || isPublicHost) {
    return (
      <PublicVideoCall
        sessionId={sessionId}
        publicSessionId={publicSessionId || sessionId}
        user={user}
        isHost={isHost}
        isPublicHost={isPublicHost}
        onLeave={onLeave}
      />
    );
  }

  return <PrivateVideoCall sessionId={sessionId} user={user} isHost={isHost} onLeave={onLeave} />;
}
