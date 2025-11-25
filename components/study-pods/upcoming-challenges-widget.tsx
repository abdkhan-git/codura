"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  Trophy,
  Clock,
  Users,
  Target,
  ArrowRight,
  Loader2,
  Zap,
  Flame,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface Challenge {
  id: string;
  pod_id: string;
  title: string;
  challenge_type: string;
  start_time: string;
  end_time: string;
  status: string;
  total_problems: number;
  current_participants: number;
  pod?: {
    name: string;
  };
  user_participation?: {
    total_points: number;
    current_rank: number | null;
  };
}

interface UpcomingChallengesWidgetProps {
  limit?: number;
  className?: string;
}

const CHALLENGE_TYPE_CONFIG: Record<string, any> = {
  daily: {
    icon: Calendar,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  weekly: {
    icon: Calendar,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  custom: {
    icon: Target,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  head_to_head: {
    icon: Flame,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
  },
};

export function UpcomingChallengesWidget({ limit = 5, className }: UpcomingChallengesWidgetProps) {
  const { theme } = useTheme();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingChallenges();
  }, []);

  const fetchUpcomingChallenges = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/study-pods/my-challenges?filter=active&limit=' + limit);
      if (response.ok) {
        const data = await response.json();
        setChallenges(data.challenges || []);
      }
    } catch (error) {
      console.error('Error fetching upcoming challenges:', error);
    } finally {
      setLoading(false);
    }
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
            Active Challenges
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
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-2 rounded-lg border",
              theme === 'light'
                ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200"
                : "bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30"
            )}>
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <CardTitle className={theme === 'light' ? "text-gray-900" : "text-white"}>
              Active Challenges
            </CardTitle>
          </div>
          <Link href="/study-pods">
            <Button variant="ghost" size="sm" className="gap-1">
              View All
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <CardDescription className={theme === 'light' ? "text-gray-600" : "text-white/60"}>
          Compete with your pod members
        </CardDescription>
      </CardHeader>

      <CardContent className="relative space-y-3">
        {challenges.length === 0 ? (
          <div className={cn(
            "text-center py-8",
            theme === 'light' ? "text-gray-600" : "text-white/60"
          )}>
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No active challenges</p>
            <Link href="/study-pods">
              <Button variant="outline" size="sm" className="mt-4">
                Browse Study Pods
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {challenges.map((challenge) => {
              const typeConfig = CHALLENGE_TYPE_CONFIG[challenge.challenge_type] || CHALLENGE_TYPE_CONFIG.daily;
              const TypeIcon = typeConfig.icon;
              const endDate = new Date(challenge.end_time);
              const timeLeft = formatDistanceToNow(endDate, { addSuffix: true });
              const isParticipating = !!challenge.user_participation;

              return (
                <Link
                  key={challenge.id}
                  href={`/study-pods/${challenge.pod_id}?tab=challenges`}
                  className="block"
                >
                  <div className={cn(
                    "p-3 rounded-lg border transition-all hover:scale-[1.02]",
                    theme === 'light'
                      ? "bg-gray-50/50 border-gray-200 hover:bg-gray-100 hover:border-amber-300"
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-amber-500/50"
                  )}>
                    <div className="flex items-start gap-3">
                      {/* Type Icon */}
                      <div className={cn(
                        "p-2 rounded-lg border flex-shrink-0",
                        theme === 'light'
                          ? "bg-white border-gray-200"
                          : "bg-white/5 border-white/10"
                      )}>
                        <TypeIcon className={cn("w-4 h-4", typeConfig.color)} />
                      </div>

                      {/* Challenge Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className={cn(
                            "font-medium text-sm leading-tight truncate",
                            theme === 'light' ? "text-gray-900" : "text-white"
                          )}>
                            {challenge.title}
                          </h4>
                          <Badge className="text-xs gap-1 bg-amber-500 hover:bg-amber-600 flex-shrink-0">
                            <Zap className="w-3 h-3" />
                            ACTIVE
                          </Badge>
                        </div>

                        {/* Pod Name */}
                        {challenge.pod && (
                          <p className={cn(
                            "text-xs mb-2 truncate",
                            theme === 'light' ? "text-gray-600" : "text-white/60"
                          )}>
                            {challenge.pod.name}
                          </p>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1">
                            <Clock className={cn("w-3 h-3", theme === 'light' ? "text-gray-500" : "text-white/50")} />
                            <span className={cn(
                              "font-medium text-amber-500"
                            )}>
                              Ends {timeLeft}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <Target className={cn("w-3 h-3", theme === 'light' ? "text-gray-500" : "text-white/50")} />
                            <span className={theme === 'light' ? "text-gray-600" : "text-white/60"}>
                              {challenge.total_problems} problems
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <Users className={cn("w-3 h-3", theme === 'light' ? "text-gray-500" : "text-white/50")} />
                            <span className={theme === 'light' ? "text-gray-600" : "text-white/60"}>
                              {challenge.current_participants}
                            </span>
                          </div>
                        </div>

                        {/* Participation Status */}
                        {isParticipating && challenge.user_participation && (
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                              <Trophy className="w-3 h-3 mr-1" />
                              {challenge.user_participation.total_points} pts
                            </Badge>
                            {challenge.user_participation.current_rank && (
                              <Badge variant="outline" className="text-xs">
                                Rank #{challenge.user_participation.current_rank}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
}
