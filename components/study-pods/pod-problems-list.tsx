"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  MoreVertical,
  Trash2,
  Edit,
  Users,
  ExternalLink,
  Calendar,
  Flag,
  Trophy,
  Target,
  Sparkles,
  TrendingUp,
  Award,
  Zap,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface PodProblem {
  id: string;
  problem_id: string;
  deadline: string | null;
  notes: string | null;
  priority: "low" | "medium" | "high";
  status: string;
  assigned_at: string;
  problem: {
    id: string;
    title: string;
    difficulty: string;
    category: string;
    leetcode_id: number;
  };
  completions: Array<{
    id: string;
    user_id: string;
    completed_at: string;
    time_taken_minutes: number | null;
    notes: string | null;
    solution_link: string | null;
    user: {
      user_id: string;
      username: string;
      full_name: string;
      avatar_url: string | null;
    };
  }>;
  completion_count: number;
  user_completed: boolean;
  assigned_by_user: {
    username: string;
    full_name: string;
  };
}

interface PodProblemsListProps {
  podId: string;
  currentUserRole: "owner" | "moderator" | "member" | null;
  totalMembers: number;
}

export function PodProblemsList({ podId, currentUserRole, totalMembers }: PodProblemsListProps) {
  const [problems, setProblems] = useState<PodProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<PodProblem | null>(null);
  const [hoveredProblemId, setHoveredProblemId] = useState<string | null>(null);

  // Completion form state
  const [timeTaken, setTimeTaken] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [solutionLink, setSolutionLink] = useState("");

  const canManage = currentUserRole === "owner" || currentUserRole === "moderator";

  useEffect(() => {
    fetchProblems();
  }, [podId]);

  const fetchProblems = async () => {
    try {
      const response = await fetch(`/api/study-pods/${podId}/problems`);
      if (response.ok) {
        const data = await response.json();
        setProblems(data.problems || []);
      }
    } catch (error) {
      console.error("Error fetching problems:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCompletion = async (problem: PodProblem) => {
    if (problem.user_completed) {
      // Unmark as complete
      setCompletingId(problem.id);
      try {
        const response = await fetch(`/api/study-pods/problems/${problem.id}/complete`, {
          method: "DELETE",
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || "Failed to remove completion");
          return;
        }

        toast.success("Completion removed");
        fetchProblems();
      } catch (error) {
        console.error("Error removing completion:", error);
        toast.error("Failed to remove completion");
      } finally {
        setCompletingId(null);
      }
    } else {
      // Show completion modal
      setSelectedProblem(problem);
      setShowCompletionModal(true);
    }
  };

  const handleSubmitCompletion = async () => {
    if (!selectedProblem) return;

    setCompletingId(selectedProblem.id);

    try {
      const response = await fetch(`/api/study-pods/problems/${selectedProblem.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          time_taken_minutes: timeTaken ? parseInt(timeTaken) : undefined,
          notes: completionNotes || undefined,
          solution_link: solutionLink || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to mark as complete");
        return;
      }

      toast.success("🎉 Problem completed!");
      setShowCompletionModal(false);
      setTimeTaken("");
      setCompletionNotes("");
      setSolutionLink("");
      setSelectedProblem(null);
      fetchProblems();
    } catch (error) {
      console.error("Error completing problem:", error);
      toast.error("Failed to mark as complete");
    } finally {
      setCompletingId(null);
    }
  };

  const handleDeleteProblem = async (problemId: string) => {
    if (!confirm("Are you sure you want to remove this problem from the pod?")) {
      return;
    }

    try {
      const response = await fetch(`/api/study-pods/problems/${problemId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to remove problem");
        return;
      }

      toast.success("Problem removed from pod");
      fetchProblems();
    } catch (error) {
      console.error("Error deleting problem:", error);
      toast.error("Failed to remove problem");
    }
  };

  const getDifficultyConfig = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return {
          bg: "bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-emerald-500/10",
          text: "text-emerald-400",
          border: "border-emerald-500/30",
          glow: "shadow-[0_0_15px_rgba(16,185,129,0.15)]",
          icon: "🟢"
        };
      case "medium":
        return {
          bg: "bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10",
          text: "text-amber-400",
          border: "border-amber-500/30",
          glow: "shadow-[0_0_15px_rgba(245,158,11,0.15)]",
          icon: "🟡"
        };
      case "hard":
        return {
          bg: "bg-gradient-to-r from-rose-500/10 via-red-500/10 to-rose-500/10",
          text: "text-rose-400",
          border: "border-rose-500/30",
          glow: "shadow-[0_0_15px_rgba(244,63,94,0.15)]",
          icon: "🔴"
        };
      default:
        return {
          bg: "bg-muted/10",
          text: "text-muted-foreground",
          border: "border-white/10",
          glow: "",
          icon: "⚪"
        };
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case "high":
        return {
          bg: "bg-red-500/10",
          text: "text-red-400",
          border: "border-red-500/30",
          icon: <Zap className="w-3 h-3" />
        };
      case "medium":
        return {
          bg: "bg-blue-500/10",
          text: "text-blue-400",
          border: "border-blue-500/30",
          icon: <Flag className="w-3 h-3" />
        };
      case "low":
        return {
          bg: "bg-slate-500/10",
          text: "text-slate-400",
          border: "border-slate-500/30",
          icon: <Flag className="w-3 h-3" />
        };
      default:
        return {
          bg: "bg-muted/10",
          text: "text-muted-foreground",
          border: "border-white/10",
          icon: <Flag className="w-3 h-3" />
        };
    }
  };

  const isOverdue = (deadline: string | null) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full blur-xl opacity-20 animate-pulse" />
          <Loader2 className="w-12 h-12 animate-spin text-emerald-500 relative z-10" />
        </div>
        <p className="mt-6 text-sm text-muted-foreground animate-pulse">Loading problems...</p>
      </div>
    );
  }

  if (problems.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950 via-zinc-900/50 to-zinc-950 p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.05),transparent_50%)]" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-full blur-3xl" />

        <div className="relative text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
            <Target className="w-10 h-10 text-emerald-400" />
          </div>
          <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            No Problems Assigned Yet
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
            {canManage
              ? "Start building your study path by assigning LeetCode problems to track progress and collaborate with your pod members."
              : "Your pod hasn't assigned any problems yet. Check back soon!"}
          </p>
          {canManage && (
            <div className="mt-8 flex justify-center">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-300" />
                <div className="relative px-6 py-2.5 bg-zinc-950 rounded-lg text-sm text-emerald-400 border border-emerald-500/20">
                  Click "Assign Problems" above to get started
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const completionPercentage = problems.length > 0
    ? (problems.filter(p => p.user_completed).length / problems.length) * 100
    : 0;

  const completedCount = problems.filter(p => p.user_completed).length;

  return (
    <>
      <div className="space-y-6">
        {/* Premium Progress Card */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500" />
          <Card className="relative border-2 border-white/10 bg-gradient-to-br from-zinc-950 via-zinc-900/80 to-zinc-950 backdrop-blur-xl overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.1),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(6,182,212,0.1),transparent_50%)]" />

            <div className="relative p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30">
                      <Trophy className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                      Your Progress
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Keep up the momentum! Track your problem-solving journey
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    {completedCount}/{problems.length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Problems Solved</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Completion Rate</span>
                  <span className="font-semibold text-emerald-400">{completionPercentage.toFixed(0)}%</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-full blur-sm" />
                  <Progress
                    value={completionPercentage}
                    className="h-3 bg-zinc-900/50 border border-white/10 relative"
                  />
                </div>
              </div>

              {completionPercentage === 100 && (
                <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30">
                  <div className="flex items-center gap-2 text-sm text-emerald-400">
                    <Award className="w-4 h-4" />
                    <span className="font-semibold">Perfect Score! All problems completed 🎉</span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Problems Grid */}
        <div className="space-y-4">
          {problems.map((problem) => {
            const completionRate = totalMembers > 0
              ? (problem.completion_count / totalMembers) * 100
              : 0;
            const overdue = isOverdue(problem.deadline);
            const difficultyConfig = getDifficultyConfig(problem.problem.difficulty);
            const priorityConfig = getPriorityConfig(problem.priority);
            const isHovered = hoveredProblemId === problem.id;

            return (
              <div
                key={problem.id}
                className="relative group"
                onMouseEnter={() => setHoveredProblemId(problem.id)}
                onMouseLeave={() => setHoveredProblemId(null)}
              >
                {/* Glow effect on hover */}
                <div className={`absolute -inset-0.5 bg-gradient-to-r rounded-2xl blur transition-all duration-300 ${
                  problem.user_completed
                    ? "from-emerald-500/20 via-green-500/20 to-emerald-500/20 opacity-30"
                    : overdue
                    ? "from-rose-500/20 via-red-500/20 to-rose-500/20 opacity-20"
                    : "from-cyan-500/0 via-emerald-500/0 to-cyan-500/0 opacity-0"
                } ${isHovered ? "opacity-40" : ""}`} />

                <Card className={`relative border-2 transition-all duration-300 backdrop-blur-xl overflow-hidden ${
                  problem.user_completed
                    ? "border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-zinc-950/80 to-zinc-950/80"
                    : overdue
                    ? "border-rose-500/30 bg-gradient-to-br from-rose-950/20 via-zinc-950/80 to-zinc-950/80"
                    : "border-white/10 bg-gradient-to-br from-zinc-950/80 via-zinc-900/50 to-zinc-950/80 hover:border-emerald-500/20"
                }`}>
                  {/* Background pattern */}
                  <div className="absolute inset-0 opacity-30">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.03),transparent_50%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(255,255,255,0.03),transparent_50%)]" />
                  </div>

                  <div className="relative p-6">
                    <div className="flex items-start gap-5">
                      {/* Completion Checkbox */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleCompletion(problem)}
                        disabled={completingId === problem.id}
                        className="mt-1 p-0 h-auto hover:bg-transparent group/checkbox"
                      >
                        {completingId === problem.id ? (
                          <div className="relative w-8 h-8">
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full blur animate-pulse" />
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 relative" />
                          </div>
                        ) : problem.user_completed ? (
                          <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500 rounded-full blur-sm animate-pulse" />
                            <CheckCircle2 className="w-8 h-8 text-emerald-400 fill-emerald-500/20 relative transition-transform group-hover/checkbox:scale-110" />
                          </div>
                        ) : (
                          <Circle className="w-8 h-8 text-muted-foreground group-hover/checkbox:text-emerald-400 transition-all group-hover/checkbox:scale-110" />
                        )}
                      </Button>

                      {/* Problem Content */}
                      <div className="flex-1 min-w-0">
                        {/* Title and Link */}
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-mono text-muted-foreground px-2 py-0.5 rounded bg-zinc-800/50 border border-white/5">
                                #{problem.problem.leetcode_id}
                              </span>
                              <Link
                                href={`/problems/${problem.problem.id}`}
                                className="text-lg font-semibold hover:text-emerald-400 transition-colors group/link flex items-center gap-2"
                              >
                                {problem.problem.title}
                                <ExternalLink className="w-4 h-4 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                              </Link>
                            </div>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              <Badge className={`${difficultyConfig.bg} ${difficultyConfig.text} border ${difficultyConfig.border} font-semibold ${difficultyConfig.glow}`}>
                                <span className="mr-1.5">{difficultyConfig.icon}</span>
                                {problem.problem.difficulty}
                              </Badge>
                              <Badge variant="outline" className="bg-zinc-900/50 border-white/10">
                                {problem.problem.category}
                              </Badge>
                              <Badge className={`${priorityConfig.bg} ${priorityConfig.text} border ${priorityConfig.border} flex items-center gap-1`}>
                                {priorityConfig.icon}
                                {problem.priority.toUpperCase()}
                              </Badge>
                            </div>

                            {/* Notes */}
                            {problem.notes && (
                              <div className="mb-3 p-3 rounded-lg bg-zinc-900/50 border border-white/5">
                                <p className="text-sm text-muted-foreground italic leading-relaxed">
                                  💡 {problem.notes}
                                </p>
                              </div>
                            )}

                            {/* Stats Row */}
                            <div className="flex flex-wrap items-center gap-4 text-xs">
                              {problem.deadline && (
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
                                  overdue
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                                    : "bg-zinc-900/50 text-muted-foreground border border-white/5"
                                }`}>
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span className="font-medium">
                                    {overdue && "⚠️ "}
                                    {new Date(problem.deadline).toLocaleDateString()}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <Users className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="font-semibold text-emerald-400">
                                  {problem.completion_count}/{totalMembers}
                                </span>
                                <span className="text-muted-foreground">
                                  ({completionRate.toFixed(0)}%)
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>by @{problem.assigned_by_user.username}</span>
                              </div>
                            </div>

                            {/* Completions List */}
                            {problem.completions.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2 mb-3">
                                  <Award className="w-4 h-4 text-emerald-400" />
                                  <p className="text-xs font-semibold text-emerald-400">Completed by:</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {problem.completions.slice(0, 8).map((completion) => (
                                    <div
                                      key={completion.id}
                                      className="group/completion flex items-center gap-2 bg-zinc-900/50 hover:bg-zinc-800/50 border border-white/5 hover:border-emerald-500/30 rounded-full px-3 py-1.5 transition-all cursor-pointer"
                                      title={completion.notes || undefined}
                                    >
                                      <Avatar className="w-5 h-5 border border-white/10">
                                        <AvatarImage src={completion.user?.avatar_url || ""} />
                                        <AvatarFallback className="text-xs bg-gradient-to-br from-brand to-orange-300">
                                          {completion.user?.full_name?.charAt(0) || "?"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs font-medium">{completion.user?.username}</span>
                                      {completion.time_taken_minutes && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                          <Clock className="w-3 h-3" />
                                          <span>{completion.time_taken_minutes}m</span>
                                        </div>
                                      )}
                                      {completion.solution_link && (
                                        <LinkIcon className="w-3 h-3 text-emerald-400 opacity-0 group-hover/completion:opacity-100 transition-opacity" />
                                      )}
                                    </div>
                                  ))}
                                  {problem.completions.length > 8 && (
                                    <div className="flex items-center px-3 py-1.5 text-xs text-muted-foreground">
                                      +{problem.completions.length - 8} more
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Actions Menu */}
                          {canManage && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-800/50"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 backdrop-blur-xl">
                                <DropdownMenuItem className="cursor-pointer hover:bg-zinc-800/50">
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteProblem(problem.id)}
                                  className="cursor-pointer text-red-400 focus:text-red-400 hover:bg-red-500/10"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Remove Problem
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Premium Completion Modal */}
      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
        <DialogContent className="sm:max-w-[550px] bg-zinc-950 border-2 border-emerald-500/20 overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.1),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(6,182,212,0.1),transparent_50%)]" />

          <DialogHeader className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <DialogTitle className="text-2xl bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Mark as Complete
              </DialogTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Record your achievement and share your progress with the pod
            </p>
          </DialogHeader>

          {selectedProblem && (
            <div className="space-y-5 py-4 relative">
              {/* Problem Info Card */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-xl blur opacity-50" />
                <div className="relative bg-zinc-900/80 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-muted-foreground">
                      #{selectedProblem.problem.leetcode_id}
                    </span>
                  </div>
                  <p className="font-semibold text-lg mb-3">{selectedProblem.problem.title}</p>
                  <div className="flex gap-2">
                    {(() => {
                      const config = getDifficultyConfig(selectedProblem.problem.difficulty);
                      return (
                        <Badge className={`${config.bg} ${config.text} border ${config.border}`}>
                          <span className="mr-1.5">{config.icon}</span>
                          {selectedProblem.problem.difficulty}
                        </Badge>
                      );
                    })()}
                    <Badge variant="outline" className="bg-zinc-800/50 border-white/10">
                      {selectedProblem.problem.category}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="timeTaken" className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    Time Taken (minutes)
                  </Label>
                  <Input
                    id="timeTaken"
                    type="number"
                    placeholder="e.g., 45"
                    value={timeTaken}
                    onChange={(e) => setTimeTaken(e.target.value)}
                    className="bg-zinc-900/50 border-white/10 focus:border-emerald-500/50 transition-colors"
                  />
                  <p className="text-xs text-muted-foreground">Optional - helps track your progress over time</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="solutionLink" className="text-sm font-medium flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-emerald-400" />
                    Solution Link
                  </Label>
                  <Input
                    id="solutionLink"
                    type="url"
                    placeholder="https://leetcode.com/submissions/..."
                    value={solutionLink}
                    onChange={(e) => setSolutionLink(e.target.value)}
                    className="bg-zinc-900/50 border-white/10 focus:border-emerald-500/50 transition-colors"
                  />
                  <p className="text-xs text-muted-foreground">Share your solution with pod members</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="completionNotes" className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Notes
                  </Label>
                  <Textarea
                    id="completionNotes"
                    placeholder="Share your approach, learnings, or any challenges you faced..."
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    className="bg-zinc-900/50 border-white/10 focus:border-emerald-500/50 min-h-[100px] resize-none transition-colors"
                    maxLength={500}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Optional - share insights with your pod</span>
                    <span>{completionNotes.length}/500</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-white/10 relative">
            <Button
              variant="outline"
              onClick={() => {
                setShowCompletionModal(false);
                setTimeTaken("");
                setCompletionNotes("");
                setSolutionLink("");
                setSelectedProblem(null);
              }}
              disabled={completingId !== null}
              className="border-white/10 hover:bg-zinc-800/50"
            >
              Cancel
            </Button>
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg blur opacity-50 group-hover:opacity-75 transition duration-300" />
              <Button
                onClick={handleSubmitCompletion}
                disabled={completingId !== null}
                className="relative bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 border-0"
              >
                {completingId ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark Complete
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
