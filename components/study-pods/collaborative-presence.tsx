"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Users } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Participant {
  id: string;
  user_id: string;
  cursor_color: string;
  is_active: boolean;
  user: {
    user_id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

interface CollaborativePresenceProps {
  participants: Participant[];
  currentUserId: string;
  className?: string;
}

export function CollaborativePresence({
  participants,
  currentUserId,
  className,
}: CollaborativePresenceProps) {
  const { theme } = useTheme();

  // Filter active participants only
  const activeParticipants = participants.filter((p) => p.is_active);
  const otherParticipants = activeParticipants.filter(
    (p) => p.user_id !== currentUserId
  );
  const currentUser = activeParticipants.find((p) => p.user_id === currentUserId);

  // Show max 5 avatars, then "+X" for the rest
  const displayLimit = 5;
  const visibleParticipants = otherParticipants.slice(0, displayLimit);
  const hiddenCount = Math.max(0, otherParticipants.length - displayLimit);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Active Participant Count */}
      <div
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full",
          theme === "light"
            ? "bg-emerald-50 text-emerald-700"
            : "bg-emerald-500/10 text-emerald-400"
        )}
      >
        <Users className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{activeParticipants.length}</span>
      </div>

      {/* Participant Avatars */}
      <TooltipProvider>
        <div className="flex items-center -space-x-2">
          {/* Current User First */}
          {currentUser && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar
                    className={cn(
                      "w-8 h-8 border-2 ring-2 transition-all hover:scale-110",
                      theme === "light"
                        ? "border-white ring-emerald-500/50"
                        : "border-zinc-900 ring-emerald-500/50"
                    )}
                    style={{
                      borderColor: currentUser.cursor_color || "#10B981",
                    }}
                  >
                    <AvatarImage
                      src={currentUser.user.avatar_url}
                      alt={currentUser.user.full_name}
                    />
                    <AvatarFallback
                      className="text-xs font-medium text-white"
                      style={{
                        backgroundColor: currentUser.cursor_color || "#10B981",
                      }}
                    >
                      {currentUser.user.full_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                    style={{
                      backgroundColor: "#10B981",
                      borderColor:
                        theme === "light" ? "white" : "rgb(24, 24, 27)",
                    }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs font-medium">
                  {currentUser.user.full_name} (You)
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Other Participants */}
          {visibleParticipants.map((participant) => (
            <Tooltip key={participant.id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar
                    className={cn(
                      "w-8 h-8 border-2 ring-2 transition-all hover:scale-110",
                      theme === "light"
                        ? "border-white ring-gray-200"
                        : "border-zinc-900 ring-white/10"
                    )}
                    style={{
                      borderColor: participant.cursor_color || "#6B7280",
                    }}
                  >
                    <AvatarImage
                      src={participant.user.avatar_url}
                      alt={participant.user.full_name}
                    />
                    <AvatarFallback
                      className="text-xs font-medium text-white"
                      style={{
                        backgroundColor: participant.cursor_color || "#6B7280",
                      }}
                    >
                      {participant.user.full_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                    style={{
                      backgroundColor: participant.cursor_color || "#6B7280",
                      borderColor:
                        theme === "light" ? "white" : "rgb(24, 24, 27)",
                    }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs font-medium">
                  {participant.user.full_name}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}

          {/* +X More Indicator */}
          {hiddenCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2",
                    theme === "light"
                      ? "bg-gray-100 text-gray-700 border-white"
                      : "bg-zinc-800 text-white border-zinc-900"
                  )}
                >
                  +{hiddenCount}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs font-medium">
                  {hiddenCount} more participant{hiddenCount > 1 ? "s" : ""}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}
