"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  Calendar,
  Clock,
  Users,
  BookOpen,
  Code2,
  MessageSquare,
  Lightbulb,
  Play,
  Edit3,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Radio,
  MoreVertical,
  Eye,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SessionCardProps {
  session: any; // Will type properly in production
  podId: string;
  userRole?: 'owner' | 'moderator' | 'member';
  isHost?: boolean;
  onViewDetails?: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
  onStart?: () => void;
  onJoin?: () => void;
  className?: string;
}

const SESSION_TYPE_CONFIG = {
  study: {
    icon: BookOpen,
    label: 'Study',
    gradient: 'from-emerald-500/20 to-green-500/20',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  problem_solving: {
    icon: Code2,
    label: 'Problem Solving',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  mock_interview: {
    icon: Users,
    label: 'Mock Interview',
    gradient: 'from-purple-500/20 to-violet-500/20',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  discussion: {
    icon: MessageSquare,
    label: 'Discussion',
    gradient: 'from-cyan-500/20 to-teal-500/20',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
  review: {
    icon: Lightbulb,
    label: 'Review',
    gradient: 'from-amber-500/20 to-yellow-500/20',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
};

const STATUS_CONFIG = {
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

export function SessionCard({
  session,
  podId,
  userRole,
  isHost,
  onViewDetails,
  onEdit,
  onCancel,
  onStart,
  onJoin,
  className,
}: SessionCardProps) {
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(false);

  const typeConfig = SESSION_TYPE_CONFIG[session.session_type as keyof typeof SESSION_TYPE_CONFIG] || SESSION_TYPE_CONFIG.study;
  const statusConfig = STATUS_CONFIG[session.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.scheduled;
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;

  const scheduledDate = new Date(session.scheduled_at);
  const now = new Date();
  const isPast = scheduledDate < now && session.status !== 'in_progress';
  const isUpcoming = scheduledDate > now && session.status === 'scheduled';
  const isLive = session.status === 'in_progress';

  // Time until session
  const timeUntil = isUpcoming ? formatDistanceToNow(scheduledDate, { addSuffix: true }) : null;

  // Format date and time
  const formattedDate = scheduledDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = scheduledDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const canManage = userRole === 'owner' || userRole === 'moderator' || isHost;

  const handleAction = async (action: () => void) => {
    setLoading(true);
    try {
      await action();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border backdrop-blur-lg transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl",
        theme === 'light'
          ? "bg-white/70 border-gray-200/50 hover:border-emerald-300/60 hover:bg-white/90"
          : "bg-zinc-900/40 border-white/10 hover:border-emerald-500/30 hover:bg-zinc-900/60",
        isLive && "ring-2 ring-emerald-500/50 animate-pulse-slow shadow-emerald-500/20",
        className
      )}
      onClick={() => onViewDetails?.()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Gradient */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300",
        typeConfig.gradient,
        isHovered && "opacity-100"
      )} />

      {/* Live Indicator */}
      {isLive && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-500 animate-shimmer" />
      )}

      <div className="relative p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Type Icon */}
            <div className={cn(
              "p-2.5 rounded-xl border flex-shrink-0",
              theme === 'light'
                ? `bg-gradient-to-br ${typeConfig.gradient.replace('/20', '/30')} ${typeConfig.border}`
                : `bg-gradient-to-br ${typeConfig.gradient} ${typeConfig.border}`
            )}>
              <TypeIcon className={cn("w-5 h-5", typeConfig.text)} />
            </div>

            {/* Title & Type */}
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "font-semibold text-lg leading-tight mb-1 truncate",
                theme === 'light' ? "text-gray-900" : "text-white"
              )}>
                {session.title}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn("text-xs", typeConfig.bg, typeConfig.border, typeConfig.text)}
                >
                  {typeConfig.label}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn("text-xs gap-1", statusConfig.color)}
                >
                  <StatusIcon className="w-3 h-3" />
                  {statusConfig.label}
                </Badge>
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          {canManage && session.status !== 'cancelled' && session.status !== 'completed' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "h-8 w-8 p-0",
                    theme === 'light' ? "hover:bg-gray-100" : "hover:bg-white/10"
                  )}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => handleAction(onEdit)}>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit Session
                  </DropdownMenuItem>
                )}
                {onStart && session.status === 'scheduled' && (
                  <DropdownMenuItem onClick={() => handleAction(onStart)}>
                    <Play className="w-4 h-4 mr-2" />
                    Start Session
                  </DropdownMenuItem>
                )}
                {onCancel && (
                  <DropdownMenuItem
                    onClick={() => handleAction(onCancel)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Cancel Session
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Description */}
        {session.description && (
          <p className={cn(
            "text-sm line-clamp-2",
            theme === 'light' ? "text-gray-600" : "text-white/60"
          )}>
            {session.description}
          </p>
        )}

        {/* Date & Time */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className={cn(
              "w-4 h-4",
              theme === 'light' ? "text-gray-500" : "text-white/50"
            )} />
            <span className={cn(
              "text-sm font-medium",
              theme === 'light' ? "text-gray-700" : "text-white/80"
            )}>
              {formattedDate}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className={cn(
              "w-4 h-4",
              theme === 'light' ? "text-gray-500" : "text-white/50"
            )} />
            <span className={cn(
              "text-sm font-medium",
              theme === 'light' ? "text-gray-700" : "text-white/80"
            )}>
              {formattedTime}
            </span>
          </div>
          {session.duration_minutes && (
            <span className={cn(
              "text-xs",
              theme === 'light' ? "text-gray-500" : "text-white/50"
            )}>
              ({session.duration_minutes}min)
            </span>
          )}
        </div>

        {/* Time Until (for upcoming sessions) */}
        {timeUntil && isUpcoming && (
          <div className={cn(
            "text-sm font-medium",
            theme === 'light' ? "text-emerald-600" : "text-emerald-400"
          )}>
            Starts {timeUntil}
          </div>
        )}

        {/* Host & Attendance */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            <Avatar className="w-7 h-7">
              <AvatarImage src={session.host?.avatar_url} alt={session.host?.full_name} />
              <AvatarFallback className="text-xs bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
                {session.host?.full_name?.charAt(0) || 'H'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className={cn(
                "text-xs font-medium",
                theme === 'light' ? "text-gray-700" : "text-white/80"
              )}>
                {session.host?.full_name || 'Host'}
              </p>
              <p className={cn(
                "text-xs",
                theme === 'light' ? "text-gray-500" : "text-white/50"
              )}>
                Host
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Users className={cn(
              "w-4 h-4",
              theme === 'light' ? "text-gray-500" : "text-white/50"
            )} />
            <span className={cn(
              "text-sm font-medium",
              theme === 'light' ? "text-gray-700" : "text-white/80"
            )}>
              {session.attendance_count || 0} attending
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              className={cn(
                "flex-1",
                theme === 'light'
                  ? "border-gray-300 hover:bg-gray-50"
                  : "border-white/10 hover:bg-white/5"
              )}
            >
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>
          )}

          {onJoin && session.status !== 'cancelled' && session.status !== 'completed' && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleAction(onJoin);
              }}
              disabled={loading}
              className={cn(
                "flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white border-0",
                isLive && "animate-pulse-glow"
              )}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <>
                  {isLive ? (
                    <>
                      <Radio className="w-4 h-4 mr-2" />
                      Join Live
                    </>
                  ) : session.user_attending ? (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Enter Session
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Mark Attendance
                    </>
                  )}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
