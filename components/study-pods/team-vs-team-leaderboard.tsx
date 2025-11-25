"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DefaultAvatar } from "@/components/ui/default-avatar";
import {
  Trophy,
  Crown,
  Swords,
  Users,
  Target,
  Zap,
  TrendingUp,
  Loader2,
  Flame,
} from "lucide-react";

interface TeamParticipant {
  id: string;
  user_id: string;
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

interface TeamData {
  pod: {
    id: string;
    name: string;
    avatar_url: string;
    subject?: string;
  };
  stats: {
    total_points: number;
    problems_solved: number;
    participants: number;
    avg_points: number;
  };
  participants: TeamParticipant[];
}

interface TeamVsTeamLeaderboardProps {
  challengeId: string;
  className?: string;
  refreshInterval?: number;
}

export function TeamVsTeamLeaderboard({
  challengeId,
  className,
  refreshInterval = 10000,
}: TeamVsTeamLeaderboardProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<any>(null);
  const [team1, setTeam1] = useState<TeamData | null>(null);
  const [team2, setTeam2] = useState<TeamData | null>(null);
  const [leadingTeam, setLeadingTeam] = useState<'team1' | 'team2' | 'tie'>('tie');
  const [pointDifference, setPointDifference] = useState(0);

  useEffect(() => {
    fetchTeamLeaderboard();
    const interval = setInterval(fetchTeamLeaderboard, refreshInterval);
    return () => clearInterval(interval);
  }, [challengeId, refreshInterval]);

  const fetchTeamLeaderboard = async () => {
    try {
      const response = await fetch(`/api/study-pods/challenges/${challengeId}/team-leaderboard`);
      if (response.ok) {
        const data = await response.json();
        setChallenge(data.challenge);
        setTeam1(data.team1);
        setTeam2(data.team2);
        setLeadingTeam(data.leading_team);
        setPointDifference(data.point_difference);
      }
    } catch (error) {
      console.error('Error fetching team leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={cn(
        "flex items-center justify-center py-16 rounded-xl border-2",
        theme === 'light' ? "bg-white border-gray-200" : "bg-zinc-900/50 border-white/10",
        className
      )}>
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!team1 || !team2) {
    return (
      <div className={cn(
        "text-center py-12 rounded-xl border-2",
        theme === 'light' ? "bg-white border-gray-200" : "bg-zinc-900/50 border-white/10",
        className
      )}>
        <Swords className={cn(
          "w-12 h-12 mx-auto mb-3",
          theme === 'light' ? "text-gray-300" : "text-white/20"
        )} />
        <p className={cn(
          "text-sm",
          theme === 'light' ? "text-gray-500" : "text-white/50"
        )}>
          Team challenge data not available
        </p>
      </div>
    );
  }

  const totalPoints = team1.stats.total_points + team2.stats.total_points;
  const team1Percentage = totalPoints > 0 ? (team1.stats.total_points / totalPoints) * 100 : 50;
  const team2Percentage = totalPoints > 0 ? (team2.stats.total_points / totalPoints) * 100 : 50;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with VS */}
      <div className="relative">
        {/* Background gradient */}
        <div className={cn(
          "absolute inset-0 rounded-2xl overflow-hidden",
          theme === 'light'
            ? "bg-gradient-to-r from-blue-50 via-purple-50 to-rose-50"
            : "bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-rose-500/10"
        )} />

        <div className="relative p-6">
          <div className="flex items-center justify-between">
            {/* Team 1 */}
            <div className={cn(
              "flex-1 text-center",
              leadingTeam === 'team1' && "scale-105 transition-transform"
            )}>
              <div className="relative inline-block">
                <DefaultAvatar
                  src={team1.pod.avatar_url}
                  name={team1.pod.name}
                  size="lg"
                  className={cn(
                    "ring-4",
                    leadingTeam === 'team1'
                      ? "ring-emerald-500"
                      : theme === 'light' ? "ring-gray-200" : "ring-white/10"
                  )}
                />
                {leadingTeam === 'team1' && (
                  <Crown className="absolute -top-3 -right-2 w-6 h-6 text-amber-400" />
                )}
              </div>
              <h3 className={cn(
                "font-bold text-lg mt-3",
                theme === 'light' ? "text-gray-900" : "text-white"
              )}>
                {team1.pod.name}
              </h3>
              <div className={cn(
                "text-4xl font-bold mt-2 tabular-nums",
                leadingTeam === 'team1' ? "text-emerald-500" :
                theme === 'light' ? "text-gray-700" : "text-white/80"
              )}>
                {team1.stats.total_points.toLocaleString()}
              </div>
              <p className={cn(
                "text-sm",
                theme === 'light' ? "text-gray-500" : "text-white/50"
              )}>
                points
              </p>
            </div>

            {/* VS Badge */}
            <div className="flex-shrink-0 mx-8">
              <div className={cn(
                "relative w-20 h-20 rounded-full flex items-center justify-center",
                theme === 'light'
                  ? "bg-white shadow-xl border-2 border-gray-100"
                  : "bg-zinc-800 border-2 border-white/10"
              )}>
                <Swords className={cn(
                  "w-8 h-8",
                  leadingTeam === 'tie'
                    ? "text-amber-500"
                    : theme === 'light' ? "text-gray-400" : "text-white/40"
                )} />
                {leadingTeam !== 'tie' && (
                  <div className="absolute -bottom-6">
                    <Badge className={cn(
                      "text-xs font-bold",
                      leadingTeam === 'team1'
                        ? "bg-blue-500"
                        : "bg-rose-500"
                    )}>
                      +{pointDifference}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Team 2 */}
            <div className={cn(
              "flex-1 text-center",
              leadingTeam === 'team2' && "scale-105 transition-transform"
            )}>
              <div className="relative inline-block">
                <DefaultAvatar
                  src={team2.pod.avatar_url}
                  name={team2.pod.name}
                  size="lg"
                  className={cn(
                    "ring-4",
                    leadingTeam === 'team2'
                      ? "ring-emerald-500"
                      : theme === 'light' ? "ring-gray-200" : "ring-white/10"
                  )}
                />
                {leadingTeam === 'team2' && (
                  <Crown className="absolute -top-3 -right-2 w-6 h-6 text-amber-400" />
                )}
              </div>
              <h3 className={cn(
                "font-bold text-lg mt-3",
                theme === 'light' ? "text-gray-900" : "text-white"
              )}>
                {team2.pod.name}
              </h3>
              <div className={cn(
                "text-4xl font-bold mt-2 tabular-nums",
                leadingTeam === 'team2' ? "text-emerald-500" :
                theme === 'light' ? "text-gray-700" : "text-white/80"
              )}>
                {team2.stats.total_points.toLocaleString()}
              </div>
              <p className={cn(
                "text-sm",
                theme === 'light' ? "text-gray-500" : "text-white/50"
              )}>
                points
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-8">
            <div className="relative h-4 rounded-full overflow-hidden bg-gray-200 dark:bg-white/10">
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                style={{ width: `${team1Percentage}%` }}
              />
              <div
                className="absolute right-0 top-0 h-full bg-gradient-to-l from-rose-500 to-pink-500 transition-all duration-500"
                style={{ width: `${team2Percentage}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs font-medium">
              <span className="text-blue-500">{Math.round(team1Percentage)}%</span>
              <span className="text-rose-500">{Math.round(team2Percentage)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Team Stats Comparison */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { team: team1, color: 'blue', label: 'Team 1' },
          { team: team2, color: 'rose', label: 'Team 2' },
        ].map(({ team, color, label }, teamIndex) => (
          <div
            key={teamIndex}
            className={cn(
              "p-4 rounded-xl border-2",
              theme === 'light' ? "bg-white border-gray-200" : "bg-zinc-900/50 border-white/10"
            )}
          >
            <div className="flex items-center gap-2 mb-4">
              <DefaultAvatar
                src={team.pod.avatar_url}
                name={team.pod.name}
                size="sm"
              />
              <h4 className={cn(
                "font-semibold",
                theme === 'light' ? "text-gray-900" : "text-white"
              )}>
                {team.pod.name}
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={cn(
                "p-3 rounded-lg",
                theme === 'light' ? "bg-gray-50" : "bg-white/5"
              )}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className={cn("w-3.5 h-3.5", `text-${color}-500`)} />
                  <span className={cn(
                    "text-xs",
                    theme === 'light' ? "text-gray-500" : "text-white/50"
                  )}>
                    Participants
                  </span>
                </div>
                <p className={cn(
                  "text-xl font-bold",
                  theme === 'light' ? "text-gray-900" : "text-white"
                )}>
                  {team.stats.participants}
                </p>
              </div>

              <div className={cn(
                "p-3 rounded-lg",
                theme === 'light' ? "bg-gray-50" : "bg-white/5"
              )}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Target className={cn("w-3.5 h-3.5", `text-${color}-500`)} />
                  <span className={cn(
                    "text-xs",
                    theme === 'light' ? "text-gray-500" : "text-white/50"
                  )}>
                    Solved
                  </span>
                </div>
                <p className={cn(
                  "text-xl font-bold",
                  theme === 'light' ? "text-gray-900" : "text-white"
                )}>
                  {team.stats.problems_solved}
                </p>
              </div>

              <div className={cn(
                "p-3 rounded-lg col-span-2",
                theme === 'light' ? "bg-gray-50" : "bg-white/5"
              )}>
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className={cn("w-3.5 h-3.5", `text-${color}-500`)} />
                  <span className={cn(
                    "text-xs",
                    theme === 'light' ? "text-gray-500" : "text-white/50"
                  )}>
                    Avg Points/Member
                  </span>
                </div>
                <p className={cn(
                  "text-xl font-bold",
                  theme === 'light' ? "text-gray-900" : "text-white"
                )}>
                  {team.stats.avg_points}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Individual Rankings */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { team: team1, color: 'blue' },
          { team: team2, color: 'rose' },
        ].map(({ team, color }, teamIndex) => (
          <div
            key={teamIndex}
            className={cn(
              "rounded-xl border-2 overflow-hidden",
              theme === 'light' ? "bg-white border-gray-200" : "bg-zinc-900/50 border-white/10"
            )}
          >
            <div className={cn(
              "px-4 py-3 border-b",
              theme === 'light' ? "bg-gray-50 border-gray-100" : "bg-white/5 border-white/5"
            )}>
              <h4 className={cn(
                "font-semibold text-sm",
                theme === 'light' ? "text-gray-900" : "text-white"
              )}>
                {team.pod.name} Rankings
              </h4>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {team.participants.length === 0 ? (
                <div className={cn(
                  "px-4 py-8 text-center text-sm",
                  theme === 'light' ? "text-gray-500" : "text-white/50"
                )}>
                  No participants yet
                </div>
              ) : (
                team.participants.slice(0, 5).map((participant, index) => (
                  <div
                    key={participant.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3",
                      index === 0 && (theme === 'light'
                        ? `bg-${color}-50/50`
                        : `bg-${color}-500/10`)
                    )}
                  >
                    <span className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                      index === 0
                        ? `bg-${color}-500 text-white`
                        : theme === 'light'
                          ? "bg-gray-100 text-gray-600"
                          : "bg-white/10 text-white/70"
                    )}>
                      {index + 1}
                    </span>

                    <DefaultAvatar
                      src={participant.user.avatar_url}
                      name={participant.user.full_name}
                      size="sm"
                    />

                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium text-sm truncate",
                        theme === 'light' ? "text-gray-900" : "text-white"
                      )}>
                        {participant.user.full_name}
                      </p>
                      <p className={cn(
                        "text-xs",
                        theme === 'light' ? "text-gray-500" : "text-white/50"
                      )}>
                        {participant.problems_solved} solved
                      </p>
                    </div>

                    <div className="text-right">
                      <p className={cn(
                        "font-bold text-sm",
                        index === 0 ? `text-${color}-500` :
                        theme === 'light' ? "text-gray-900" : "text-white"
                      )}>
                        {participant.total_points}
                      </p>
                      <p className={cn(
                        "text-xs",
                        theme === 'light' ? "text-gray-400" : "text-white/40"
                      )}>
                        pts
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Live Indicator */}
      <div className="flex justify-center">
        <Badge variant="outline" className="gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live - Updates every {refreshInterval / 1000}s</span>
        </Badge>
      </div>
    </div>
  );
}
