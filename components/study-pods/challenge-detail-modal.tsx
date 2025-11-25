"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  Trophy,
  Users,
  Clock,
  Target,
  Calendar,
  Zap,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Award,
  TrendingUp,
  Pencil,
} from "lucide-react";
import { format, formatDistanceToNow, isPast, isFuture } from "date-fns";
import { toast } from "sonner";
import { LiveLeaderboard } from "./live-leaderboard";
import { TeamVsTeamLeaderboard } from "./team-vs-team-leaderboard";
import { ChallengeBadges } from "./challenge-badges";
import { EditChallengeModal } from "./edit-challenge-modal";
import Link from "next/link";

interface ChallengeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  challengeId: string;
  podId: string;
  onJoined?: () => void;
  isAdmin?: boolean;
}

interface Challenge {
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
  point_config: any;
  problem_ids: number[];
  created_at: string;
  created_by: string;
  is_team_challenge?: boolean;
  opponent_pod_id?: string;
}

interface Problem {
  id: number;
  title: string;
  difficulty: string;
  acceptance_rate: number;
}

interface Participation {
  status: string;
  total_points: number;
  problems_solved: number;
  problems_attempted: number;
  current_rank: number | null;
  speed_bonus_earned: number;
  efficiency_bonus_earned: number;
}

const DIFFICULTY_COLORS = {
  Easy: 'text-emerald-500',
  Medium: 'text-amber-500',
  Hard: 'text-red-500',
};

export function ChallengeDetailModal({
  isOpen,
  onClose,
  challengeId,
  podId,
  onJoined,
  isAdmin = false,
}: ChallengeDetailModalProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [participation, setParticipation] = useState<Participation | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchChallengeDetails();
      fetchCurrentUser();
    }
  }, [isOpen, challengeId]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const data = await response.json();
        setCurrentUserId(data.user?.id || '');
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchChallengeDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/study-pods/${podId}/challenges/${challengeId}`);
      if (response.ok) {
        const data = await response.json();
        setChallenge(data.challenge);
        setParticipation(data.participation || null);

        // Fetch problem details
        if (data.challenge.problem_ids && data.challenge.problem_ids.length > 0) {
          const problemsResponse = await fetch(
            `/api/problems?ids=${data.challenge.problem_ids.join(',')}`
          );
          if (problemsResponse.ok) {
            const problemsData = await problemsResponse.json();
            setProblems(problemsData.problems || []);
          }
        }
      } else {
        toast.error('Failed to load challenge details');
      }
    } catch (error) {
      console.error('Error fetching challenge details:', error);
      toast.error('Failed to load challenge details');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setJoining(true);
    try {
      const response = await fetch(`/api/study-pods/challenges/${challengeId}/join`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join challenge');
      }

      toast.success('Successfully joined the challenge!');
      fetchChallengeDetails();
      onJoined?.();
    } catch (error: any) {
      console.error('Error joining challenge:', error);
      toast.error(error.message || 'Failed to join challenge');
    } finally {
      setJoining(false);
    }
  };

  if (loading || !challenge) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Loading Challenge Details</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const startDate = new Date(challenge.start_time);
  const endDate = new Date(challenge.end_time);
  const now = new Date();

  const isUpcoming = isFuture(startDate);
  const isActive = now >= startDate && now <= endDate;
  const isCompleted = isPast(endDate);

  const isParticipating = !!participation;
  const isFull = challenge.max_participants && challenge.current_participants >= challenge.max_participants;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "sm:max-w-[900px] max-h-[90vh] overflow-y-auto",
        theme === 'light' ? "bg-white" : "bg-zinc-900 border-white/10"
      )}>
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className={cn(
                "text-2xl mb-2",
                theme === 'light' ? "text-gray-900" : "text-white"
              )}>
                {challenge.title}
              </DialogTitle>
              <DialogDescription className={theme === 'light' ? "text-gray-600" : "text-white/60"}>
                {challenge.description || 'No description provided'}
              </DialogDescription>
            </div>

            <div className={cn(
              "p-3 rounded-xl border flex-shrink-0",
              theme === 'light'
                ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200"
                : "bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30"
            )}>
              <Trophy className="w-8 h-8 text-amber-500" />
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-2 mt-4">
            {isActive && (
              <Badge className="gap-1 bg-emerald-500 hover:bg-emerald-600">
                <Zap className="w-3 h-3 animate-pulse" />
                ACTIVE
              </Badge>
            )}
            {isUpcoming && (
              <Badge className="gap-1 bg-blue-500/20 text-blue-400 border-blue-500/30">
                <Clock className="w-3 h-3" />
                Upcoming
              </Badge>
            )}
            {isCompleted && (
              <Badge className="gap-1 bg-gray-500/20 text-gray-500 border-gray-500/30">
                <CheckCircle2 className="w-3 h-3" />
                Completed
              </Badge>
            )}
            <Badge variant="outline" className={theme === 'light' ? "bg-gray-50" : "bg-white/5"}>
              {challenge.challenge_type}
            </Badge>
          </div>
        </DialogHeader>

        <Separator className="my-4" />

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className={cn(
            "p-4 rounded-lg border",
            theme === 'light' ? "bg-gray-50 border-gray-200" : "bg-white/5 border-white/10"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <Target className={cn("w-4 h-4", theme === 'light' ? "text-gray-500" : "text-white/50")} />
              <span className={cn("text-xs", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                Problems
              </span>
            </div>
            <p className={cn("text-2xl font-bold", theme === 'light' ? "text-gray-900" : "text-white")}>
              {challenge.total_problems}
            </p>
          </div>

          <div className={cn(
            "p-4 rounded-lg border",
            theme === 'light' ? "bg-gray-50 border-gray-200" : "bg-white/5 border-white/10"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <Users className={cn("w-4 h-4", theme === 'light' ? "text-gray-500" : "text-white/50")} />
              <span className={cn("text-xs", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                Participants
              </span>
            </div>
            <p className={cn("text-2xl font-bold", theme === 'light' ? "text-gray-900" : "text-white")}>
              {challenge.current_participants}
              {challenge.max_participants && (
                <span className={cn("text-base font-normal", theme === 'light' ? "text-gray-500" : "text-white/50")}>
                  /{challenge.max_participants}
                </span>
              )}
            </p>
          </div>

          <div className={cn(
            "p-4 rounded-lg border",
            theme === 'light' ? "bg-gray-50 border-gray-200" : "bg-white/5 border-white/10"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <Clock className={cn("w-4 h-4", theme === 'light' ? "text-gray-500" : "text-white/50")} />
              <span className={cn("text-xs", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                Duration
              </span>
            </div>
            <p className={cn("text-2xl font-bold", theme === 'light' ? "text-gray-900" : "text-white")}>
              {challenge.duration_minutes >= 60
                ? `${Math.floor(challenge.duration_minutes / 60)}h`
                : `${challenge.duration_minutes}m`}
            </p>
          </div>

          {isParticipating && participation && (
            <div className={cn(
              "p-4 rounded-lg border",
              theme === 'light'
                ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200"
                : "bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/30"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-emerald-500" />
                <span className={cn("text-xs", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                  Your Points
                </span>
              </div>
              <p className="text-2xl font-bold text-emerald-500">
                {participation.total_points}
              </p>
            </div>
          )}
        </div>

        {/* Timing Info */}
        <div className={cn(
          "p-4 rounded-lg border space-y-2",
          theme === 'light' ? "bg-gray-50 border-gray-200" : "bg-white/5 border-white/10"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className={cn("w-4 h-4", theme === 'light' ? "text-gray-500" : "text-white/50")} />
              <span className={cn("text-sm font-medium", theme === 'light' ? "text-gray-700" : "text-white/80")}>
                Start Time
              </span>
            </div>
            <span className={cn("text-sm", theme === 'light' ? "text-gray-600" : "text-white/60")}>
              {format(startDate, 'MMM d, yyyy h:mm a')}
              {isUpcoming && (
                <span className="ml-2 text-blue-500">
                  ({formatDistanceToNow(startDate, { addSuffix: true })})
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className={cn("w-4 h-4", theme === 'light' ? "text-gray-500" : "text-white/50")} />
              <span className={cn("text-sm font-medium", theme === 'light' ? "text-gray-700" : "text-white/80")}>
                End Time
              </span>
            </div>
            <span className={cn("text-sm", theme === 'light' ? "text-gray-600" : "text-white/60")}>
              {format(endDate, 'MMM d, yyyy h:mm a')}
              {isActive && (
                <span className="ml-2 text-emerald-500">
                  ({formatDistanceToNow(endDate, { addSuffix: true })})
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="problems" className="mt-6">
          <TabsList className={cn(
            "grid w-full grid-cols-4",
            theme === 'light' ? "bg-gray-100" : "bg-white/5"
          )}>
            <TabsTrigger value="problems">Problems</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="badges">Badges</TabsTrigger>
            <TabsTrigger value="points">Points</TabsTrigger>
          </TabsList>

          {/* Problems Tab */}
          <TabsContent value="problems" className="space-y-3 mt-4">
            {problems.length === 0 ? (
              <div className={cn(
                "text-center py-8",
                theme === 'light' ? "text-gray-600" : "text-white/60"
              )}>
                <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No problems found</p>
              </div>
            ) : (
              problems.map((problem) => (
                <Link
                  key={problem.id}
                  href={`/problems/${problem.id}`}
                  className="block"
                >
                  <div className={cn(
                    "p-4 rounded-lg border transition-all hover:scale-[1.02]",
                    theme === 'light'
                      ? "bg-white border-gray-200 hover:bg-gray-50 hover:border-emerald-300"
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-emerald-500/50"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={cn(
                          "font-medium",
                          problem.difficulty === 'Easy' && "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
                          problem.difficulty === 'Medium' && "bg-amber-500/10 text-amber-500 border-amber-500/30",
                          problem.difficulty === 'Hard' && "bg-red-500/10 text-red-500 border-red-500/30"
                        )}>
                          {problem.difficulty}
                        </Badge>
                        <span className={cn(
                          "font-medium",
                          theme === 'light' ? "text-gray-900" : "text-white"
                        )}>
                          {problem.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn("text-sm", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                          {problem.acceptance_rate}% Acceptance
                        </span>
                        <ExternalLink className={cn("w-4 h-4", theme === 'light' ? "text-gray-400" : "text-white/40")} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="mt-4">
            {challenge.is_team_challenge || challenge.challenge_type === 'head_to_head' ? (
              <TeamVsTeamLeaderboard
                challengeId={challengeId}
                refreshInterval={10000}
              />
            ) : (
              <LiveLeaderboard
                challengeId={challengeId}
                totalProblems={challenge.total_problems}
                currentUserId={currentUserId}
                refreshInterval={10000}
              />
            )}
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges" className="mt-4">
            {isParticipating ? (
              <ChallengeBadges
                challengeId={challengeId}
                showTitle={true}
              />
            ) : (
              <div className={cn(
                "text-center py-12 rounded-lg border",
                theme === 'light' ? "bg-gray-50 border-gray-200" : "bg-white/5 border-white/10"
              )}>
                <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className={cn("text-sm", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                  Join the challenge to start earning badges!
                </p>
              </div>
            )}
          </TabsContent>

          {/* Points System Tab */}
          <TabsContent value="points" className="space-y-4 mt-4">
            <div className={cn(
              "p-4 rounded-lg border",
              theme === 'light' ? "bg-gray-50 border-gray-200" : "bg-white/5 border-white/10"
            )}>
              <h4 className={cn("font-semibold mb-3", theme === 'light' ? "text-gray-900" : "text-white")}>
                Base Points by Difficulty
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className={cn(
                  "p-3 rounded border text-center",
                  theme === 'light' ? "bg-emerald-50 border-emerald-200" : "bg-emerald-500/10 border-emerald-500/30"
                )}>
                  <p className="text-sm text-emerald-500 mb-1">Easy</p>
                  <p className="text-2xl font-bold text-emerald-500">
                    {challenge.point_config?.base_points?.easy || 10}
                  </p>
                </div>
                <div className={cn(
                  "p-3 rounded border text-center",
                  theme === 'light' ? "bg-amber-50 border-amber-200" : "bg-amber-500/10 border-amber-500/30"
                )}>
                  <p className="text-sm text-amber-500 mb-1">Medium</p>
                  <p className="text-2xl font-bold text-amber-500">
                    {challenge.point_config?.base_points?.medium || 20}
                  </p>
                </div>
                <div className={cn(
                  "p-3 rounded border text-center",
                  theme === 'light' ? "bg-red-50 border-red-200" : "bg-red-500/10 border-red-500/30"
                )}>
                  <p className="text-sm text-red-500 mb-1">Hard</p>
                  <p className="text-2xl font-bold text-red-500">
                    {challenge.point_config?.base_points?.hard || 30}
                  </p>
                </div>
              </div>
            </div>

            <div className={cn(
              "p-4 rounded-lg border",
              theme === 'light' ? "bg-blue-50 border-blue-200" : "bg-blue-500/10 border-blue-500/30"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-blue-500" />
                <h4 className={cn("font-semibold", theme === 'light' ? "text-gray-900" : "text-white")}>
                  Speed Bonus
                </h4>
              </div>
              <p className={cn("text-sm mb-2", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                Complete problems faster to earn speed bonuses
              </p>
              <p className="text-lg font-bold text-blue-500">
                Up to +{challenge.point_config?.max_speed_bonus || 50} points
              </p>
            </div>

            <div className={cn(
              "p-4 rounded-lg border",
              theme === 'light' ? "bg-purple-50 border-purple-200" : "bg-purple-500/10 border-purple-500/30"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <h4 className={cn("font-semibold", theme === 'light' ? "text-gray-900" : "text-white")}>
                  Efficiency Bonus
                </h4>
              </div>
              <p className={cn("text-sm mb-2", theme === 'light' ? "text-gray-600" : "text-white/60")}>
                Write cleaner, more efficient code to earn efficiency bonuses
              </p>
              <p className="text-lg font-bold text-purple-500">
                Up to +{challenge.point_config?.max_efficiency_bonus || 30} points
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {/* Edit button for creator or admin */}
          {(isAdmin || challenge.created_by === currentUserId) && (
            <Button
              variant="outline"
              onClick={() => setShowEditModal(true)}
              className="gap-2"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
          )}
          {!isParticipating && !isCompleted && (
            <Button
              onClick={handleJoin}
              disabled={joining || isFull || !isActive}
              className="gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
            >
              {joining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Joining...
                </>
              ) : isFull ? (
                'Challenge Full'
              ) : !isActive ? (
                isUpcoming ? 'Not Started Yet' : 'Challenge Ended'
              ) : (
                <>
                  <Trophy className="w-4 h-4" />
                  Join Challenge
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>

      {/* Edit Challenge Modal */}
      {challenge && (
        <EditChallengeModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          podId={podId}
          challenge={challenge}
          onChallengeUpdated={() => {
            fetchChallengeDetails();
            onJoined?.();
          }}
        />
      )}
    </Dialog>
  );
}
