"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  Trophy,
  Users,
  Clock,
  Target,
  Zap,
  Flame,
  Calendar,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow, format, isPast, isFuture } from "date-fns";
import { toast } from "sonner";

interface ChallengeCardProps {
  challenge: {
    id: string;
    title: string;
    description: string;
    challenge_type: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    status: string;
    total_problems: number;
    current_participants: number;
    max_participants: number | null;
    created_at: string;
  };
  participation?: {
    status: string;
    total_points: number;
    problems_solved: number;
    current_rank: number | null;
  };
  onJoin?: () => void;
  onViewDetails?: () => void;
  className?: string;
}

const CHALLENGE_TYPE_CONFIG: Record<string, any> = {
  daily: {
    label: 'Daily',
    color: 'from-emerald-500 to-teal-500',
    icon: Calendar,
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-500',
  },
  weekly: {
    label: 'Weekly',
    color: 'from-blue-500 to-cyan-500',
    icon: Calendar,
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-500',
  },
  custom: {
    label: 'Custom',
    color: 'from-purple-500 to-pink-500',
    icon: Target,
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-500',
  },
  head_to_head: {
    label: 'Head-to-Head',
    color: 'from-red-500 to-orange-500',
    icon: Flame,
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-500',
  },
};

export function ChallengeCard({
  challenge,
  participation,
  onJoin,
  onViewDetails,
  className,
}: ChallengeCardProps) {
  const { theme } = useTheme();
  const [joining, setJoining] = useState(false);

  const typeConfig = CHALLENGE_TYPE_CONFIG[challenge.challenge_type] || CHALLENGE_TYPE_CONFIG.daily;
  const TypeIcon = typeConfig.icon;

  const startDate = new Date(challenge.start_time);
  const endDate = new Date(challenge.end_time);
  const now = new Date();

  const isUpcoming = isFuture(startDate);
  const isActive = now >= startDate && now <= endDate;
  const isCompleted = isPast(endDate);

  const progressPercentage = participation
    ? (participation.problems_solved / challenge.total_problems) * 100
    : 0;

  const getStatusBadge = () => {
    if (isCompleted) {
      return (
        <Badge className="gap-1 bg-gray-500/20 text-gray-500 border-gray-500/30">
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </Badge>
      );
    }
    if (isActive) {
      return (
        <Badge className="gap-1 bg-emerald-500 hover:bg-emerald-600">
          <Zap className="w-3 h-3 animate-pulse" />
          ACTIVE
        </Badge>
      );
    }
    if (isUpcoming) {
      return (
        <Badge className="gap-1 bg-blue-500/20 text-blue-400 border-blue-500/30">
          <Clock className="w-3 h-3" />
          Upcoming
        </Badge>
      );
    }
  };

  const getTimeDisplay = () => {
    if (isActive) {
      return `Ends ${formatDistanceToNow(endDate, { addSuffix: true })}`;
    }
    if (isUpcoming) {
      return `Starts ${formatDistanceToNow(startDate, { addSuffix: true })}`;
    }
    if (isCompleted) {
      return `Ended ${format(endDate, 'MMM d, h:mm a')}`;
    }
  };

  const handleJoin = async () => {
    if (!onJoin) return;

    setJoining(true);
    try {
      await onJoin();
    } catch (error) {
      console.error('Error joining challenge:', error);
    } finally {
      setJoining(false);
    }
  };

  const isParticipating = !!participation;
  const isFull = challenge.max_participants && challenge.current_participants >= challenge.max_participants;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all hover:scale-[1.02] cursor-pointer border-2",
        theme === 'light'
          ? "bg-white border-gray-200 hover:border-emerald-300"
          : "bg-zinc-900/50 border-white/10 hover:border-emerald-500/50",
        isActive && "ring-2 ring-emerald-500/30",
        className
      )}
      onClick={onViewDetails}
    >
      {/* Gradient Header */}
      <div className={cn(
        "h-2 bg-gradient-to-r",
        typeConfig.color
      )} />

      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn(
                "p-1.5 rounded-lg",
                typeConfig.bgColor
              )}>
                <TypeIcon className={cn("w-4 h-4", typeConfig.textColor)} />
              </div>
              <Badge variant="outline" className={cn(
                "text-xs",
                theme === 'light' ? "bg-gray-50" : "bg-white/5"
              )}>
                {typeConfig.label}
              </Badge>
              {getStatusBadge()}
            </div>

            <h3 className={cn(
              "font-semibold text-lg leading-tight mb-1",
              theme === 'light' ? "text-gray-900" : "text-white"
            )}>
              {challenge.title}
            </h3>

            {challenge.description && (
              <p className={cn(
                "text-sm line-clamp-2",
                theme === 'light' ? "text-gray-600" : "text-white/60"
              )}>
                {challenge.description}
              </p>
            )}
          </div>

          {/* Trophy Icon */}
          <div className={cn(
            "p-3 rounded-xl border",
            theme === 'light'
              ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200"
              : "bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30"
          )}>
            <Trophy className="w-6 h-6 text-amber-500" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className={cn(
            "p-3 rounded-lg border",
            theme === 'light' ? "bg-gray-50 border-gray-200" : "bg-white/5 border-white/10"
          )}>
            <div className="flex items-center gap-2 mb-1">
              <Target className={cn("w-3.5 h-3.5", theme === 'light' ? "text-gray-500" : "text-white/50")} />
              <span className={cn("text-xs", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                Problems
              </span>
            </div>
            <p className={cn("text-lg font-semibold", theme === 'light' ? "text-gray-900" : "text-white")}>
              {challenge.total_problems}
            </p>
          </div>

          <div className={cn(
            "p-3 rounded-lg border",
            theme === 'light' ? "bg-gray-50 border-gray-200" : "bg-white/5 border-white/10"
          )}>
            <div className="flex items-center gap-2 mb-1">
              <Users className={cn("w-3.5 h-3.5", theme === 'light' ? "text-gray-500" : "text-white/50")} />
              <span className={cn("text-xs", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                Participants
              </span>
            </div>
            <p className={cn("text-lg font-semibold", theme === 'light' ? "text-gray-900" : "text-white")}>
              {challenge.current_participants}
              {challenge.max_participants && (
                <span className={cn("text-sm font-normal", theme === 'light' ? "text-gray-500" : "text-white/50")}>
                  /{challenge.max_participants}
                </span>
              )}
            </p>
          </div>

          <div className={cn(
            "p-3 rounded-lg border",
            theme === 'light' ? "bg-gray-50 border-gray-200" : "bg-white/5 border-white/10"
          )}>
            <div className="flex items-center gap-2 mb-1">
              <Clock className={cn("w-3.5 h-3.5", theme === 'light' ? "text-gray-500" : "text-white/50")} />
              <span className={cn("text-xs", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                Duration
              </span>
            </div>
            <p className={cn("text-lg font-semibold", theme === 'light' ? "text-gray-900" : "text-white")}>
              {challenge.duration_minutes >= 60
                ? `${Math.floor(challenge.duration_minutes / 60)}h`
                : `${challenge.duration_minutes}m`}
            </p>
          </div>
        </div>

        {/* Participation Progress */}
        {isParticipating && participation && (
          <div className={cn(
            "p-4 rounded-lg border space-y-3",
            theme === 'light'
              ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200"
              : "bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/30"
          )}>
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-sm font-medium", theme === 'light' ? "text-gray-900" : "text-white")}>
                  Your Progress
                </p>
                <p className={cn("text-xs", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                  {participation.problems_solved} of {challenge.total_problems} problems solved
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-500">
                  {participation.total_points}
                </p>
                <p className={cn("text-xs", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                  points
                </p>
              </div>
            </div>

            <Progress value={progressPercentage} className="h-2" />

            {participation.current_rank && (
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className={cn("text-sm font-medium", theme === 'light' ? "text-gray-700" : "text-white/80")}>
                  Rank #{participation.current_rank}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Time Info */}
        <div className={cn(
          "flex items-center gap-2 text-sm",
          theme === 'light' ? "text-gray-600" : "text-white/60"
        )}>
          <Clock className="w-4 h-4" />
          {getTimeDisplay()}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {!isParticipating && !isCompleted && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleJoin();
              }}
              disabled={joining || isFull || !isActive}
              className="flex-1 gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
            >
              {joining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Joining...
                </>
              ) : isFull ? (
                'Full'
              ) : !isActive ? (
                isUpcoming ? 'Not Started' : 'Ended'
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Join Challenge
                </>
              )}
            </Button>
          )}

          <Button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails?.();
            }}
            variant="outline"
            className={cn(
              "flex-1",
              !isParticipating && !isCompleted && "flex-initial"
            )}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
