"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DefaultAvatar } from "@/components/ui/default-avatar";
import {
  Trophy,
  Crown,
  Medal,
  Users,
  Target,
  TrendingUp,
  Loader2,
  Zap,
  Calendar,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface PodLeaderboardEntry {
  id: string;
  name: string;
  description: string;
  subject: string;
  skill_level: string;
  avatar_url: string;
  member_count: number;
  rank: number;
  score: number;
  stats: {
    total_challenges: number;
    completed_challenges: number;
    challenge_wins: number;
    total_problems_completed: number;
    total_challenge_points: number;
  };
}

interface PublicPodLeaderboardProps {
  className?: string;
  limit?: number;
  showFilters?: boolean;
}

type LeaderboardType = 'overall' | 'challenges' | 'problems' | 'activity';
type Timeframe = 'week' | 'month' | 'all';

export function PublicPodLeaderboard({
  className,
  limit = 10,
  showFilters = true,
}: PublicPodLeaderboardProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<PodLeaderboardEntry[]>([]);
  const [type, setType] = useState<LeaderboardType>('overall');
  const [timeframe, setTimeframe] = useState<Timeframe>('all');

  useEffect(() => {
    fetchLeaderboard();
  }, [type, timeframe, limit]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/study-pods/leaderboards?type=${type}&timeframe=${timeframe}&limit=${limit}`
      );
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

  const getRankDisplay = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="relative flex items-center justify-center w-10 h-10">
          <Crown className="w-7 h-7 text-amber-400" />
          <div className="absolute inset-0 bg-amber-400/20 blur-xl rounded-full animate-pulse" />
        </div>
      );
    }
    if (rank === 2) {
      return <Medal className="w-7 h-7 text-gray-400" />;
    }
    if (rank === 3) {
      return <Medal className="w-7 h-7 text-orange-500" />;
    }
    return (
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold",
        theme === 'light' ? "bg-gray-100 text-gray-600" : "bg-white/10 text-white/70"
      )}>
        {rank}
      </div>
    );
  };

  const getRankBgColor = (rank: number) => {
    if (rank === 1) {
      return theme === 'light'
        ? "bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border-amber-200"
        : "bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border-amber-500/30";
    }
    if (rank === 2) {
      return theme === 'light'
        ? "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200"
        : "bg-gradient-to-r from-gray-500/10 to-slate-500/10 border-gray-500/30";
    }
    if (rank === 3) {
      return theme === 'light'
        ? "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200"
        : "bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-500/30";
    }
    return theme === 'light'
      ? "bg-white border-gray-200 hover:border-gray-300"
      : "bg-white/5 border-white/10 hover:border-white/20";
  };

  const typeOptions: { value: LeaderboardType; label: string; icon: React.ReactNode }[] = [
    { value: 'overall', label: 'Overall', icon: <Trophy className="w-4 h-4" /> },
    { value: 'challenges', label: 'Challenges', icon: <Zap className="w-4 h-4" /> },
    { value: 'problems', label: 'Problems', icon: <Target className="w-4 h-4" /> },
    { value: 'activity', label: 'Activity', icon: <TrendingUp className="w-4 h-4" /> },
  ];

  const timeframeOptions: { value: Timeframe; label: string }[] = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'all', label: 'All Time' },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2.5 rounded-xl",
            theme === 'light'
              ? "bg-gradient-to-br from-amber-100 to-yellow-100"
              : "bg-gradient-to-br from-amber-500/20 to-yellow-500/20"
          )}>
            <Trophy className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className={cn(
              "text-xl font-bold",
              theme === 'light' ? "text-gray-900" : "text-white"
            )}>
              Pod Leaderboards
            </h2>
            <p className={cn(
              "text-sm",
              theme === 'light' ? "text-gray-500" : "text-white/50"
            )}>
              Top performing study pods
            </p>
          </div>
        </div>

        <Badge variant="outline" className="gap-1.5 animate-pulse">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          Live Rankings
        </Badge>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3">
          {/* Type Filter */}
          <div className={cn(
            "inline-flex p-1 rounded-lg gap-1",
            theme === 'light' ? "bg-gray-100" : "bg-white/5"
          )}>
            {typeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setType(option.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  type === option.value
                    ? theme === 'light'
                      ? "bg-white text-gray-900 shadow-sm"
                      : "bg-white/10 text-white"
                    : theme === 'light'
                      ? "text-gray-600 hover:text-gray-900"
                      : "text-white/60 hover:text-white"
                )}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>

          {/* Timeframe Filter */}
          <div className={cn(
            "inline-flex p-1 rounded-lg gap-1",
            theme === 'light' ? "bg-gray-100" : "bg-white/5"
          )}>
            {timeframeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setTimeframe(option.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  timeframe === option.value
                    ? theme === 'light'
                      ? "bg-white text-gray-900 shadow-sm"
                      : "bg-white/10 text-white"
                    : theme === 'light'
                      ? "text-gray-600 hover:text-gray-900"
                      : "text-white/60 hover:text-white"
                )}
              >
                <Calendar className="w-3.5 h-3.5" />
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      {loading ? (
        <div className={cn(
          "flex items-center justify-center py-16 rounded-xl border-2",
          theme === 'light' ? "bg-gray-50 border-gray-200" : "bg-white/5 border-white/10"
        )}>
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : leaderboard.length === 0 ? (
        <div className={cn(
          "text-center py-16 rounded-xl border-2",
          theme === 'light' ? "bg-gray-50 border-gray-200" : "bg-white/5 border-white/10"
        )}>
          <Trophy className={cn(
            "w-12 h-12 mx-auto mb-4",
            theme === 'light' ? "text-gray-300" : "text-white/20"
          )} />
          <p className={cn(
            "text-lg font-medium mb-2",
            theme === 'light' ? "text-gray-900" : "text-white"
          )}>
            No pods ranked yet
          </p>
          <p className={cn(
            "text-sm",
            theme === 'light' ? "text-gray-500" : "text-white/50"
          )}>
            Create a public pod to appear on the leaderboard
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((pod, index) => (
            <Link
              key={pod.id}
              href={`/study-pods/${pod.id}`}
              className="block"
            >
              <div
                className={cn(
                  "group relative p-4 rounded-xl border-2 transition-all duration-300",
                  "hover:scale-[1.01] hover:shadow-lg",
                  getRankBgColor(pod.rank),
                  pod.rank <= 3 && "shadow-md"
                )}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="flex-shrink-0">
                    {getRankDisplay(pod.rank)}
                  </div>

                  {/* Pod Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <DefaultAvatar
                      src={pod.avatar_url}
                      name={pod.name}
                      size="md"
                      className="flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={cn(
                          "font-semibold truncate",
                          theme === 'light' ? "text-gray-900" : "text-white"
                        )}>
                          {pod.name}
                        </h3>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {pod.subject}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={cn(
                          "text-xs flex items-center gap-1",
                          theme === 'light' ? "text-gray-500" : "text-white/50"
                        )}>
                          <Users className="w-3 h-3" />
                          {pod.member_count} members
                        </span>
                        <span className={cn(
                          "text-xs flex items-center gap-1",
                          theme === 'light' ? "text-gray-500" : "text-white/50"
                        )}>
                          <Zap className="w-3 h-3" />
                          {pod.stats.challenge_wins} wins
                        </span>
                        <span className={cn(
                          "text-xs flex items-center gap-1",
                          theme === 'light' ? "text-gray-500" : "text-white/50"
                        )}>
                          <Target className="w-3 h-3" />
                          {pod.stats.total_problems_completed} solved
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <div className={cn(
                      "text-2xl font-bold tabular-nums",
                      pod.rank === 1 ? "text-amber-500" :
                      pod.rank === 2 ? "text-gray-500" :
                      pod.rank === 3 ? "text-orange-500" :
                      theme === 'light' ? "text-gray-900" : "text-white"
                    )}>
                      {pod.score.toLocaleString()}
                    </div>
                    <p className={cn(
                      "text-xs",
                      theme === 'light' ? "text-gray-500" : "text-white/50"
                    )}>
                      points
                    </p>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className={cn(
                    "w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0",
                    theme === 'light' ? "text-gray-400" : "text-white/40"
                  )} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
