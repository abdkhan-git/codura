"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  Video,
  Calendar,
  Users,
  Play,
  Plus,
  Code2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { SessionCard } from "./session-card";
import { CreateSessionModal } from "./create-session-modal";
import { SessionDetailModal } from "./session-detail-modal";

interface LiveSessionsSectionProps {
  podId: string;
  pod: any;
  sessions: any[];
  sessionsLoading: boolean;
  onRefresh: () => void;
  user: any;
}

export function LiveSessionsSection({
  podId,
  pod,
  sessions,
  sessionsLoading,
  onRefresh,
  user,
}: LiveSessionsSectionProps) {
  const { theme } = useTheme();
  const [filter, setFilter] = useState<"all" | "upcoming" | "live" | "past">("upcoming");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [localSessions, setLocalSessions] = useState<any[]>(sessions);

  const isAdmin = pod?.user_role === "owner" || pod?.user_role === "moderator";

  // Update local sessions when prop changes
  useEffect(() => {
    setLocalSessions(sessions);
  }, [sessions]);

  // Helper to safely parse dates
  const isValidDate = (dateString: any): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  // Filter sessions - exclude stale "in_progress" sessions (older than 24 hours)
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Helper to check if a session is actually live (not stale)
  const isActuallyLive = (session: any): boolean => {
    if (session.status !== "in_progress") return false;
    if (!isValidDate(session.scheduled_at)) return false;
    const scheduledTime = new Date(session.scheduled_at);
    // Only consider "live" if scheduled within last 24 hours
    return scheduledTime > twentyFourHoursAgo;
  };

  const filteredSessions = localSessions.filter((session) => {
    if (!isValidDate(session.scheduled_at)) {
      // Include sessions without valid dates in "all" view only
      return filter === "all";
    }

    const scheduledTime = new Date(session.scheduled_at);
    const endTime = session.ended_at && isValidDate(session.ended_at) ? new Date(session.ended_at) : null;

    if (filter === "live") {
      // Only show actually live sessions (not stale ones)
      return isActuallyLive(session);
    }
    if (filter === "upcoming") {
      return scheduledTime > now && session.status !== "completed" && session.status !== "cancelled" && session.status !== "in_progress";
    }
    if (filter === "past") {
      // Include stale "in_progress" sessions as past
      const isStale = session.status === "in_progress" && !isActuallyLive(session);
      return session.status === "completed" || (endTime && endTime < now) || isStale;
    }
    return true;
  });

  // Get live sessions count - only count actually live sessions
  const liveSessionsCount = localSessions.filter(s => isActuallyLive(s)).length;

  const handleJoinSession = async (sessionId: string, isLiveSession: boolean) => {
    try {
      // If it's a live session or user wants to join, mark attendance first
      if (isLiveSession || confirm('Would you like to mark your attendance for this session?')) {
        const response = await fetch(`/api/study-pods/sessions/${sessionId}/join`, {
          method: 'POST',
        });

        if (!response.ok) {
          const data = await response.json();
          // If already joined, that's fine - just navigate
          if (!data.error?.includes('already joined')) {
            toast.error(data.error || 'Failed to mark attendance');
            return;
          }
        } else {
          toast.success('✅ Attendance marked!');

          // Update local session attendance count immediately
          setLocalSessions(prev => prev.map(s =>
            s.id === sessionId
              ? { ...s, attendance_count: (s.attendance_count || 0) + 1, user_attending: true }
              : s
          ));

          // Refresh sessions to get server data
          setTimeout(() => onRefresh(), 500);
        }
      }

      // Navigate to the collaborative session page
      window.location.href = `/study-pods/${podId}/session/${sessionId}`;
    } catch (error) {
      console.error('Error joining session:', error);
      toast.error('Failed to join session');
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Section - Live Now */}
      {liveSessionsCount > 0 && (
        <Card className={cn(
          "border-2 overflow-hidden",
          "bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-cyan-500/10",
          theme === "light"
            ? "border-green-200"
            : "border-green-500/30"
        )}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={cn(
                    "p-4 rounded-xl",
                    theme === "light" ? "bg-green-100" : "bg-green-500/20"
                  )}>
                    <Video className="w-8 h-8 text-green-500" />
                  </div>
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
                  </span>
                </div>
                <div>
                  <h2 className={cn(
                    "text-xl font-bold",
                    theme === "light" ? "text-gray-900" : "text-white"
                  )}>
                    {liveSessionsCount} Live Session{liveSessionsCount > 1 ? "s" : ""} Now
                  </h2>
                  <p className={cn(
                    "text-sm",
                    theme === "light" ? "text-gray-600" : "text-white/60"
                  )}>
                    Your pod members are collaborating right now
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setFilter("live")}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                <Play className="w-4 h-4 mr-2" />
                Join Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header with Filters and Create Button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[
            { id: "live" as const, label: "Live", count: liveSessionsCount },
            { id: "upcoming" as const, label: "Upcoming" },
            { id: "all" as const, label: "All" },
            { id: "past" as const, label: "Past" },
          ].map((item) => (
            <Button
              key={item.id}
              variant={filter === item.id ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(item.id)}
              className={cn(
                filter === item.id && "bg-gradient-to-r from-emerald-500 to-cyan-500"
              )}
            >
              {item.label}
              {item.count !== undefined && item.count > 0 && (
                <Badge className="ml-2 bg-green-500 text-white text-xs px-1.5">
                  {item.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {isAdmin && (
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule Session
          </Button>
        )}
      </div>

      {/* Quick Start Section for Admins */}
      {isAdmin && (
        <Card className={cn(
          "border-2 border-dashed",
          theme === "light"
            ? "bg-gray-50/50 border-gray-300"
            : "bg-white/5 border-white/20"
        )}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-lg",
                  theme === "light" ? "bg-emerald-100" : "bg-emerald-500/20"
                )}>
                  <Code2 className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className={cn(
                    "font-semibold",
                    theme === "light" ? "text-gray-900" : "text-white"
                  )}>
                    Start an Instant Session
                  </h3>
                  <p className={cn(
                    "text-sm",
                    theme === "light" ? "text-gray-600" : "text-white/60"
                  )}>
                    Jump into a collaborative coding room with video and screen sharing
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  // Create an instant session and join
                  setShowCreateModal(true);
                }}
                variant="outline"
                className={cn(
                  "border-emerald-500/50 hover:bg-emerald-500/10",
                  theme === "light" ? "text-emerald-700" : "text-emerald-400"
                )}
              >
                <Play className="w-4 h-4 mr-2" />
                Start Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions List */}
      {sessionsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : filteredSessions.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {filteredSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              podId={podId}
              userRole={pod?.user_role}
              isHost={session.host_user_id === user?.id}
              onViewDetails={() => {
                setSelectedSessionId(session.id);
                setShowDetailModal(true);
              }}
              onJoin={async () => {
                await handleJoinSession(session.id, isActuallyLive(session));
              }}
            />
          ))}
        </div>
      ) : (
        <Card className={cn(
          "border-2",
          theme === "light" ? "bg-white border-gray-200" : "bg-zinc-900/50 border-white/5"
        )}>
          <CardContent className="py-12 text-center">
            <Calendar className={cn(
              "w-12 h-12 mx-auto mb-4",
              theme === "light" ? "text-gray-400" : "text-white/30"
            )} />
            <h3 className={cn(
              "text-lg font-medium mb-2",
              theme === "light" ? "text-gray-900" : "text-white"
            )}>
              {filter === "live"
                ? "No live sessions right now"
                : filter === "upcoming"
                ? "No upcoming sessions"
                : filter === "past"
                ? "No past sessions"
                : "No sessions yet"}
            </h3>
            <p className={cn(
              "text-sm mb-4",
              theme === "light" ? "text-gray-600" : "text-white/60"
            )}>
              {isAdmin
                ? "Schedule a session to collaborate with your pod members"
                : "Check back later for scheduled sessions"}
            </p>
            {isAdmin && (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-emerald-500 to-cyan-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Schedule Session
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Feature Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={cn(
          "border-2",
          theme === "light" ? "bg-white border-gray-200" : "bg-zinc-900/50 border-white/5"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                theme === "light" ? "bg-blue-50" : "bg-blue-500/10"
              )}>
                <Video className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className={cn(
                  "font-medium text-sm",
                  theme === "light" ? "text-gray-900" : "text-white"
                )}>
                  Video Calls
                </h4>
                <p className={cn(
                  "text-xs",
                  theme === "light" ? "text-gray-500" : "text-white/50"
                )}>
                  Face-to-face collaboration
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-2",
          theme === "light" ? "bg-white border-gray-200" : "bg-zinc-900/50 border-white/5"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                theme === "light" ? "bg-purple-50" : "bg-purple-500/10"
              )}>
                <Code2 className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h4 className={cn(
                  "font-medium text-sm",
                  theme === "light" ? "text-gray-900" : "text-white"
                )}>
                  Live Code Editor
                </h4>
                <p className={cn(
                  "text-xs",
                  theme === "light" ? "text-gray-500" : "text-white/50"
                )}>
                  Real-time collaborative coding
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-2",
          theme === "light" ? "bg-white border-gray-200" : "bg-zinc-900/50 border-white/5"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                theme === "light" ? "bg-amber-50" : "bg-amber-500/10"
              )}>
                <Users className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h4 className={cn(
                  "font-medium text-sm",
                  theme === "light" ? "text-gray-900" : "text-white"
                )}>
                  Multi-Person
                </h4>
                <p className={cn(
                  "text-xs",
                  theme === "light" ? "text-gray-500" : "text-white/50"
                )}>
                  Collaborate with your whole pod
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <CreateSessionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        podId={podId}
        onSuccess={() => {
          onRefresh();
          setShowCreateModal(false);
        }}
      />

      {selectedSessionId && (
        <SessionDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedSessionId(null);
          }}
          sessionId={selectedSessionId}
          podId={podId}
          userRole={pod?.user_role}
          isHost={sessions.find(s => s.id === selectedSessionId)?.host_user_id === user?.id}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}