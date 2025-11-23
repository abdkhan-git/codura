"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  Trophy,
  Medal,
  Award,
  Zap,
  Target,
  TrendingUp,
  Crown,
  Loader2,
} from "lucide-react";

interface LeaderboardEntry {
  id: string;
  user_id: string;
  current_rank: number | null;
  total_points: number;
  problems_solved: number;
  problems_attempted: number;
  speed_bonus_earned: number;
  efficiency_bonus_earned: number;
  status: string;
  user: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
}

interface LiveLeaderboardProps {
  challengeId: string;
  totalProblems: number;
  currentUserId?: string;
  refreshInterval?: number;
  className?: string;
}

export function LiveLeaderboard({
  challengeId,
  totalProblems,
  currentUserId,
  refreshInterval = 10000, // 10 seconds
  className,
}: LiveLeaderboardProps) {
  const { theme } = useTheme();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, refreshInterval);
    return () => clearInterval(interval);
  }, [challengeId, refreshInterval]);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`/api/study-pods/challenges/${challengeId}/leaderboard`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank: number | null) => {
    if (!rank) return null;

    if (rank === 1) {
      return (
        <div className="relative">
          <Crown className="w-6 h-6 text-amber-400 animate-pulse" />
          <div className="absolute inset-0 bg-amber-400/20 blur-lg rounded-full" />
        </div>
      );
    }
    if (rank === 2) {
      return <Medal className="w-6 h-6 text-gray-400" />;
    }
    if (rank === 3) {
      return <Medal className="w-6 h-6 text-orange-600" />;
    }

    return (
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
        theme === 'light' ? "bg-gray-200 text-gray-700" : "bg-white/10 text-white/80"
      )}>
        {rank}
      </div>
    );
  };

  const getRankColors = (rank: number | null) => {
    if (!rank) return '';

    if (rank === 1) {
      return theme === 'light'
        ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300'
        : 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-500/50';
    }
    if (rank === 2) {
      return theme === 'light'
        ? 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300'
        : 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 border-gray-500/50';
    }
    if (rank === 3) {
      return theme === 'light'
        ? 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-300'
        : 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/50';
    }

    return '';
  };

  if (loading) {
    return (
      <Card className={cn(
        "border-2",
        theme === 'light' ? "bg-white border-gray-200" : "bg-zinc-900/50 border-white/10",
        className
      )}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Live Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "border-2 overflow-hidden",
      theme === 'light' ? "bg-white border-gray-200" : "bg-zinc-900/50 border-white/10",
      className
    )}>
      {/* Background gradient */}
      {theme !== 'light' && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.05),transparent_50%)] pointer-events-none" />
      )}

      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <CardTitle className={cn(
            "flex items-center gap-2",
            theme === 'light' ? "text-gray-900" : "text-white"
          )}>
            <Trophy className="w-5 h-5 text-amber-500" />
            Live Leaderboard
          </CardTitle>
          <Badge variant="outline" className="gap-1 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            Live
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-3">
        {leaderboard.length === 0 ? (
          <div className={cn(
            "text-center py-8",
            theme === 'light' ? "text-gray-600" : "text-white/60"
          )}>
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No participants yet</p>
          </div>
        ) : (
          <>
            {leaderboard.map((entry, index) => {
              const isCurrentUser = entry.user_id === currentUserId;
              const progressPercentage = (entry.problems_solved / totalProblems) * 100;

              return (
                <div
                  key={entry.id}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all",
                    getRankColors(entry.current_rank),
                    theme === 'light'
                      ? "bg-white border-gray-200"
                      : "bg-white/5 border-white/10",
                    isCurrentUser && "ring-2 ring-emerald-500/50",
                    entry.current_rank && entry.current_rank <= 3 && "shadow-lg"
                  )}
                >
                  {/* User Info */}
                  <div className="flex items-center gap-4 mb-3">
                    {/* Rank Badge */}
                    <div className="flex-shrink-0">
                      {getRankBadge(entry.current_rank)}
                    </div>

                    {/* Avatar & Name */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="w-10 h-10 border-2 border-white/20">
                        <AvatarImage src={entry.user.avatar_url} alt={entry.user.full_name} />
                        <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
                          {entry.user.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn(
                            "font-semibold truncate",
                            theme === 'light' ? "text-gray-900" : "text-white"
                          )}>
                            {entry.user.full_name}
                          </p>
                          {isCurrentUser && (
                            <Badge className="text-xs bg-emerald-500 hover:bg-emerald-600">You</Badge>
                          )}
                        </div>
                        <p className={cn(
                          "text-xs truncate",
                          theme === 'light' ? "text-gray-600" : "text-white/60"
                        )}>
                          @{entry.user.username}
                        </p>
                      </div>
                    </div>

                    {/* Total Points */}
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        <span className={cn(
                          "text-2xl font-bold",
                          entry.current_rank === 1
                            ? "text-amber-500"
                            : theme === 'light'
                              ? "text-gray-900"
                              : "text-white"
                        )}>
                          {entry.total_points}
                        </span>
                      </div>
                      <p className={cn("text-xs", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                        points
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={theme === 'light' ? "text-gray-600" : "text-white/60"}>
                        {entry.problems_solved} / {totalProblems} problems
                      </span>
                      <span className={cn(
                        "font-medium",
                        progressPercentage === 100
                          ? "text-emerald-500"
                          : theme === 'light'
                            ? "text-gray-700"
                            : "text-white/80"
                      )}>
                        {Math.round(progressPercentage)}%
                      </span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className={cn(
                      "p-2 rounded border text-center",
                      theme === 'light' ? "bg-gray-50 border-gray-200" : "bg-white/5 border-white/10"
                    )}>
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Target className={cn("w-3 h-3", theme === 'light' ? "text-gray-500" : "text-white/50")} />
                      </div>
                      <p className={cn("text-sm font-semibold", theme === 'light' ? "text-gray-900" : "text-white")}>
                        {entry.problems_attempted}
                      </p>
                      <p className={cn("text-xs", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                        Attempts
                      </p>
                    </div>

                    <div className={cn(
                      "p-2 rounded border text-center",
                      theme === 'light' ? "bg-blue-50 border-blue-200" : "bg-blue-500/10 border-blue-500/30"
                    )}>
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Zap className="w-3 h-3 text-blue-500" />
                      </div>
                      <p className="text-sm font-semibold text-blue-500">
                        +{entry.speed_bonus_earned}
                      </p>
                      <p className={cn("text-xs", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                        Speed
                      </p>
                    </div>

                    <div className={cn(
                      "p-2 rounded border text-center",
                      theme === 'light' ? "bg-purple-50 border-purple-200" : "bg-purple-500/10 border-purple-500/30"
                    )}>
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <TrendingUp className="w-3 h-3 text-purple-500" />
                      </div>
                      <p className="text-sm font-semibold text-purple-500">
                        +{entry.efficiency_bonus_earned}
                      </p>
                      <p className={cn("text-xs", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                        Efficiency
                      </p>
                    </div>
                  </div>

                  {/* Completion Badge */}
                  {entry.status === 'completed' && (
                    <div className="mt-3">
                      <Badge className="w-full justify-center gap-1 bg-emerald-500 hover:bg-emerald-600">
                        <Award className="w-3 h-3" />
                        Challenge Completed
                      </Badge>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
}
