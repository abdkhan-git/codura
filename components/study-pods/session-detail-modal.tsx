"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Clock,
  Users,
  BookOpen,
  Code2,
  MessageSquare,
  Lightbulb,
  Play,
  CheckCircle2,
  XCircle,
  Radio,
  Loader2,
  ExternalLink,
  LogIn,
  LogOut,
  Trophy,
  Timer,
  Edit3,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface SessionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  podId: string;
  userRole?: 'owner' | 'moderator' | 'member';
  isHost?: boolean;
  onRefresh?: () => void;
}

const SESSION_TYPE_CONFIG: Record<string, any> = {
  study: {
    icon: BookOpen,
    label: 'Study',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  problem_solving: {
    icon: Code2,
    label: 'Problem Solving',
    text: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  mock_interview: {
    icon: Users,
    label: 'Mock Interview',
    text: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  discussion: {
    icon: MessageSquare,
    label: 'Discussion',
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
  review: {
    icon: Lightbulb,
    label: 'Review',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
};

const STATUS_CONFIG: Record<string, any> = {
  scheduled: {
    label: 'Scheduled',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    icon: Calendar,
  },
  in_progress: {
    label: 'Live',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    icon: Radio,
  },
  completed: {
    label: 'Completed',
    color: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-400 bg-red-500/10 border-red-500/30',
    icon: XCircle,
  },
};

export function SessionDetailModal({
  isOpen,
  onClose,
  sessionId,
  podId,
  userRole,
  isHost,
  onRefresh,
}: SessionDetailModalProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchSessionDetails();
    }
  }, [isOpen, sessionId]);

  const fetchSessionDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/study-pods/${podId}/sessions/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
        setNotes(data.session.notes || "");
      } else {
        toast.error("Failed to load session details");
        onClose();
      }
    } catch (error) {
      console.error("Error fetching session:", error);
      toast.error("Failed to load session details");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/study-pods/sessions/${sessionId}/join`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success("✅ Attendance marked!");
        await fetchSessionDetails();
        onRefresh?.();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to mark attendance");
      }
    } catch (error) {
      console.error("Error joining session:", error);
      toast.error("Failed to mark attendance");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveSession = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/study-pods/sessions/${sessionId}/leave`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`✅ Session ended! Duration: ${data.duration_minutes} minutes`);
        await fetchSessionDetails();
        onRefresh?.();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to leave session");
      }
    } catch (error) {
      console.error("Error leaving session:", error);
      toast.error("Failed to leave session");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartSession = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/study-pods/sessions/${sessionId}/start`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success("🚀 Session started!");
        await fetchSessionDetails();
        onRefresh?.();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to start session");
      }
    } catch (error) {
      console.error("Error starting session:", error);
      toast.error("Failed to start session");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteSession = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/study-pods/sessions/${sessionId}/complete`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success("✅ Session completed!");
        await fetchSessionDetails();
        onRefresh?.();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to complete session");
      }
    } catch (error) {
      console.error("Error completing session:", error);
      toast.error("Failed to complete session");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/study-pods/${podId}/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      if (response.ok) {
        toast.success("Notes saved!");
        setEditingNotes(false);
        await fetchSessionDetails();
      } else {
        toast.error("Failed to save notes");
      }
    } catch (error) {
      console.error("Error saving notes:", error);
      toast.error("Failed to save notes");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !session) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Loading Session Details</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const typeConfig = SESSION_TYPE_CONFIG[session.session_type] || SESSION_TYPE_CONFIG.study;
  const statusConfig = STATUS_CONFIG[session.status] || STATUS_CONFIG.scheduled;
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;

  const scheduledDate = new Date(session.scheduled_at);
  const isLive = session.status === 'in_progress';
  const canManage = userRole === 'owner' || userRole === 'moderator' || isHost;

  const userAttendance = session.attendance?.find((a: any) => a.user_id === session.user_id);
  const isAttending = session.user_attending;
  const hasLeft = userAttendance?.left_at;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "sm:max-w-[900px] max-h-[90vh] border-2 overflow-hidden",
        theme === 'light'
          ? "bg-white border-emerald-500/20"
          : "bg-zinc-950 border-emerald-500/20"
      )}>
        {/* Background effects */}
        {theme !== 'light' && (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.08),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(6,182,212,0.08),transparent_50%)]" />
          </>
        )}

        <DialogHeader className="relative">
          <div className="flex items-start gap-4">
            <div className={cn(
              "p-3 rounded-xl border flex-shrink-0",
              theme === 'light'
                ? "bg-gradient-to-br from-emerald-50 to-cyan-50 border-emerald-200"
                : `bg-gradient-to-br ${typeConfig.bg} border-emerald-500/30`
            )}>
              <TypeIcon className={cn("w-7 h-7", typeConfig.text)} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className={cn(
                "text-2xl mb-2",
                theme === 'light' ? "text-gray-900" : "text-white"
              )}>
                {session.title}
              </DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn("text-xs", typeConfig.bg, typeConfig.text)}>
                  <TypeIcon className="w-3 h-3 mr-1" />
                  {typeConfig.label}
                </Badge>
                <Badge variant="outline" className={cn("text-xs gap-1", statusConfig.color)}>
                  <StatusIcon className="w-3 h-3" />
                  {statusConfig.label}
                </Badge>
                {isLive && (
                  <Badge className="text-xs animate-pulse bg-emerald-500">
                    <Radio className="w-3 h-3 mr-1" />
                    LIVE NOW
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="relative space-y-6 max-h-[calc(90vh-250px)] overflow-y-auto pr-2">
          {/* Date & Time Info */}
          <Card className={cn(
            "p-4 border",
            theme === 'light' ? "bg-gray-50/50 border-gray-200" : "bg-white/5 border-white/10"
          )}>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Calendar className={cn("w-5 h-5", theme === 'light' ? "text-gray-500" : "text-white/50")} />
                <div>
                  <p className={cn("text-xs", theme === 'light' ? "text-gray-500" : "text-white/50")}>
                    Date
                  </p>
                  <p className={cn("text-sm font-medium", theme === 'light' ? "text-gray-900" : "text-white")}>
                    {scheduledDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className={cn("w-5 h-5", theme === 'light' ? "text-gray-500" : "text-white/50")} />
                <div>
                  <p className={cn("text-xs", theme === 'light' ? "text-gray-500" : "text-white/50")}>
                    Time
                  </p>
                  <p className={cn("text-sm font-medium", theme === 'light' ? "text-gray-900" : "text-white")}>
                    {scheduledDate.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                    {session.duration_minutes && ` (${session.duration_minutes} min)`}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Description */}
          {session.description && (
            <div>
              <h4 className={cn("text-sm font-semibold mb-2", theme === 'light' ? "text-gray-700" : "text-white/80")}>
                Description
              </h4>
              <p className={cn("text-sm", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                {session.description}
              </p>
            </div>
          )}

          {/* Host */}
          <div>
            <h4 className={cn("text-sm font-semibold mb-3", theme === 'light' ? "text-gray-700" : "text-white/80")}>
              Host
            </h4>
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={session.host?.avatar_url} alt={session.host?.full_name} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
                  {session.host?.full_name?.charAt(0) || 'H'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className={cn("text-sm font-medium", theme === 'light' ? "text-gray-900" : "text-white")}>
                  {session.host?.full_name}
                </p>
                <p className={cn("text-xs", theme === 'light' ? "text-gray-500" : "text-white/50")}>
                  @{session.host?.username}
                </p>
              </div>
            </div>
          </div>

          {/* Problems */}
          {session.problems && session.problems.length > 0 && (
            <div>
              <h4 className={cn("text-sm font-semibold mb-3", theme === 'light' ? "text-gray-700" : "text-white/80")}>
                Problems to Cover ({session.problems.length})
              </h4>
              <div className="space-y-2">
                {session.problems.map((problem: any) => (
                  <Link
                    key={problem.id}
                    href={`/problems/${problem.title_slug}`}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-all",
                      theme === 'light'
                        ? "bg-white border-gray-200 hover:border-emerald-300"
                        : "bg-white/5 border-white/10 hover:border-emerald-500/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Code2 className="w-4 h-4 text-emerald-500" />
                      <span className={cn("text-sm font-medium", theme === 'light' ? "text-gray-900" : "text-white")}>
                        {problem.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {problem.difficulty}
                      </Badge>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Attendance */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className={cn("text-sm font-semibold", theme === 'light' ? "text-gray-700" : "text-white/80")}>
                Attendance ({session.attendance_count || 0})
              </h4>
              {session.attendance && session.attendance.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Timer className="w-3.5 h-3.5" />
                  Avg: {Math.round(session.attendance.reduce((sum: number, a: any) => sum + (a.duration_minutes || 0), 0) / session.attendance.length)} min
                </div>
              )}
            </div>

            {session.attendance && session.attendance.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {session.attendance.map((attendance: any) => (
                  <div
                    key={attendance.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      theme === 'light' ? "bg-white border-gray-200" : "bg-white/5 border-white/10"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={attendance.user?.avatar_url} alt={attendance.user?.full_name} />
                        <AvatarFallback className="text-xs">
                          {attendance.user?.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className={cn("text-sm font-medium", theme === 'light' ? "text-gray-900" : "text-white")}>
                          {attendance.user?.full_name}
                        </p>
                        <p className={cn("text-xs", theme === 'light' ? "text-gray-500" : "text-white/50")}>
                          {attendance.left_at ? (
                            <>
                              <Clock className="w-3 h-3 inline mr-1" />
                              {attendance.duration_minutes} minutes
                            </>
                          ) : (
                            <span className="text-emerald-500">
                              <Radio className="w-3 h-3 inline mr-1" />
                              Currently attending
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {attendance.participation_score && (
                      <Badge variant="outline" className="gap-1">
                        <Trophy className="w-3 h-3" />
                        {attendance.participation_score}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className={cn("text-sm text-center py-8", theme === 'light' ? "text-gray-500" : "text-white/50")}>
                No one has joined yet
              </p>
            )}
          </div>

          {/* Session Notes */}
          {(canManage || session.notes) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className={cn("text-sm font-semibold", theme === 'light' ? "text-gray-700" : "text-white/80")}>
                  Session Notes
                </h4>
                {canManage && !editingNotes && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingNotes(true)}
                    className="h-7 text-xs"
                  >
                    <Edit3 className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-2">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add session notes, key takeaways, or resources..."
                    rows={4}
                    className={cn(
                      "border resize-none",
                      theme === 'light'
                        ? "bg-white border-gray-200"
                        : "bg-white/5 border-white/10"
                    )}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={actionLoading}
                      className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingNotes(false);
                        setNotes(session.notes || "");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className={cn("text-sm whitespace-pre-wrap", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                  {session.notes || "No notes yet"}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="relative flex gap-3 pt-4 border-t border-white/10">
          {canManage && session.status === 'scheduled' && (
            <Button
              onClick={handleStartSession}
              disabled={actionLoading}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Session
            </Button>
          )}

          {canManage && session.status === 'in_progress' && (
            <Button
              onClick={handleCompleteSession}
              disabled={actionLoading}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Complete Session
            </Button>
          )}

          {session.status !== 'cancelled' && session.status !== 'completed' && (
            <>
              {isAttending && !hasLeft ? (
                <Button
                  onClick={handleLeaveSession}
                  disabled={actionLoading}
                  variant="outline"
                  className="flex-1"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4 mr-2" />
                  )}
                  Leave Session
                </Button>
              ) : (
                <Button
                  onClick={handleJoinSession}
                  disabled={actionLoading}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4 mr-2" />
                  )}
                  {hasLeft ? 'Rejoin Session' : 'Join Session'}
                </Button>
              )}
            </>
          )}

          <Button
            onClick={onClose}
            variant="outline"
            className={cn(
              theme === 'light'
                ? "border-gray-300 hover:bg-gray-50"
                : "border-white/10 hover:bg-white/5"
            )}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
