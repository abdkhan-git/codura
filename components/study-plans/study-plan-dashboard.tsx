"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  CheckCircle2,
  Circle,
  Lock,
  Loader2,
  TrendingUp,
  Target,
  Clock,
  BookOpen,
  Trophy,
  Sparkles,
  Calendar,
  Play,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { StudyPlanTemplatesLibrary } from "./study-plan-templates-library";

interface StudyPlanDashboardProps {
  podId: string;
  isAdmin: boolean;
}

export function StudyPlanDashboard({
  podId,
  isAdmin,
}: StudyPlanDashboardProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [adoptingPlan, setAdoptingPlan] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, [podId]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/study-pods/${podId}/study-plans?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        const activePlans = (data.plans || []).filter((p: any) => 
          p.status === 'active' || p.status === 'draft'
        );
        setPlans(activePlans);
        if (activePlans.length > 0 && !selectedPlanId) {
          setSelectedPlanId(activePlans[0].id);
        } else if (activePlans.length === 0) {
          setSelectedPlanId(null);
        }
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast.error("Failed to load study plans");
    } finally {
      setLoading(false);
    }
  };

  const handleAdoptTemplate = async (templateId: string) => {
    try {
      setAdoptingPlan(true);
      const response = await fetch(`/api/study-pods/${podId}/study-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: templateId,
          start_date: new Date().toISOString().split("T")[0],
        }),
      });

      if (response.ok) {
        toast.success("Study plan adopted successfully!");
        await fetchPlans(); // Refresh the list
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to adopt study plan");
      }
    } catch (error) {
      console.error("Error adopting plan:", error);
      toast.error("Failed to adopt study plan");
    } finally {
      setAdoptingPlan(false);
    }
  };

  const handleUnenrollPlan = async (planId: string, planName: string) => {
    if (!confirm(`Are you sure you want to unenroll from "${planName}"? This will delete all progress.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/study-pods/${podId}/study-plan/${planId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Immediately update state optimistically
        const updatedPlans = plans.filter(p => p.id !== planId);
        setPlans(updatedPlans);
        
        // Clear selected plan if it was the one we unenrolled
        if (selectedPlanId === planId) {
          setSelectedPlanId(updatedPlans.length > 0 ? updatedPlans[0].id : null);
        }
        
        toast.success("Unenrolled from study plan successfully!");
        
        // Refresh in background to ensure sync
        fetchPlans().catch(console.error);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to unenroll from study plan");
        // Revert optimistic update on error
        fetchPlans();
      }
    } catch (error) {
      console.error("Error unenrolling from plan:", error);
      toast.error("Failed to unenroll from study plan");
      // Revert optimistic update on error
      fetchPlans();
    }
  };

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Active Plans Section */}
      {plans.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={cn(
              "text-xl font-bold",
              theme === "light" ? "text-gray-900" : "text-white"
            )}>
              Your Active Plans ({plans.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={cn(
                  "p-4 border-2 cursor-pointer transition-all",
                  selectedPlanId === plan.id
                    ? "border-purple-500 bg-purple-500/5"
                    : theme === "light"
                      ? "bg-white border-gray-200 hover:border-purple-300"
                      : "bg-zinc-950/80 border-white/10 hover:border-purple-500/40"
                )}
                onClick={() => setSelectedPlanId(plan.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className={cn(
                      "font-bold mb-1",
                      theme === "light" ? "text-gray-900" : "text-white"
                    )}>
                      {plan.name}
                    </h3>
                    <Badge className="bg-purple-500/10 text-purple-400 text-xs">
                      {plan.status}
                    </Badge>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnenrollPlan(plan.id, plan.name);
                      }}
                      className="text-red-500 hover:bg-red-500/10 h-8 w-8 p-0"
                    >
                      <AlertCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="text-purple-400 font-bold">
                      {Math.round(plan.progress_percentage || 0)}%
                    </span>
                  </div>
                  <Progress value={plan.progress_percentage || 0} className="h-1" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{plan.milestones_completed || 0}/{plan.milestones_total || 0} milestones</span>
                    <span>{plan.problems_completed || 0}/{plan.problems_total || 0} problems</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Selected Plan Details */}
      {selectedPlan && (
        <PlanDetails plan={selectedPlan} theme={theme} />
      )}

      {/* Always Show Template Library */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h2 className={cn(
            "text-xl font-bold",
            theme === "light" ? "text-gray-900" : "text-white"
          )}>
            Browse More Templates
          </h2>
        </div>
        <StudyPlanTemplatesLibrary
          podId={podId}
          onSelectTemplate={handleAdoptTemplate}
        />
      </div>
    </div>
  );
}

// Separate component for plan details
function PlanDetails({ plan, theme }: any) {
  const completedMilestones =
    plan.milestones?.filter((m: any) => m.progress?.status === "completed")
      .length || 0;
  const totalMilestones = plan.milestones?.length || 0;
  const overallProgress = plan.progress_percentage || 0;

  return (
    <div className="space-y-6">
      {/* Plan Header */}
      <Card
        className={cn(
          "relative p-6 border-2 backdrop-blur-xl overflow-hidden",
          theme === "light"
            ? "bg-white border-gray-200"
            : "bg-gradient-to-br from-zinc-950/80 via-zinc-900/50 to-zinc-950/80 border-white/10"
        )}
      >
        {/* Background patterns */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(168,85,247,0.2),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(236,72,153,0.2),transparent_50%)]" />
        </div>

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h2
                  className={cn(
                    "text-2xl font-bold",
                    theme === "light" ? "text-gray-900" : "text-white"
                  )}
                >
                  {plan.name}
                </h2>
                <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                  {plan.status}
                </Badge>
              </div>
              <p
                className={cn(
                  "text-sm mb-4",
                  theme === "light" ? "text-gray-600" : "text-muted-foreground"
                )}
              >
                {plan.description}
              </p>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span
                    className={cn(
                      "font-medium",
                      theme === "light" ? "text-gray-900" : "text-white"
                    )}
                  >
                    Overall Progress
                  </span>
                  <span className="text-purple-400 font-bold">
                    {Math.round(overallProgress)}%
                  </span>
                </div>
                <div
                  className={cn(
                    "relative h-3 rounded-full overflow-hidden border",
                    theme === "light"
                      ? "bg-gray-100 border-gray-200"
                      : "bg-zinc-900/50 border-white/5"
                  )}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${overallProgress}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="h-full bg-gradient-to-r from-purple-500 via-purple-400 to-pink-500 shadow-lg shadow-purple-500/50"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                  </motion.div>
                </div>
                <p
                  className={cn(
                    "text-xs",
                    theme === "light" ? "text-gray-600" : "text-muted-foreground"
                  )}
                >
                  {completedMilestones} of {totalMilestones} milestones completed
                </p>
              </div>
            </div>

            {plan.template?.icon && (
              <div className="text-5xl ml-6">{plan.template.icon}</div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Target}
              label="Milestones"
              value={`${completedMilestones}/${totalMilestones}`}
              color="purple"
              theme={theme}
            />
            <StatCard
              icon={BookOpen}
              label="Problems"
              value={`${plan.problems_completed || 0}/${plan.problems_total || 0}`}
              color="pink"
              theme={theme}
            />
            <StatCard
              icon={Calendar}
              label="Start Date"
              value={plan.start_date ? new Date(plan.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "N/A"}
              color="cyan"
              theme={theme}
            />
            <StatCard
              icon={Trophy}
              label="Target Date"
              value={plan.target_end_date ? new Date(plan.target_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "N/A"}
              color="amber"
              theme={theme}
            />
          </div>
        </div>
      </Card>

      {/* Milestones Roadmap */}
      <div>
        <h3
          className={cn(
            "text-xl font-bold mb-4",
            theme === "light" ? "text-gray-900" : "text-white"
          )}
        >
          Learning Roadmap
        </h3>

        <div className="space-y-4">
          {plan.milestones?.map((milestone: any, index: number) => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              index={index}
              theme={theme}
              isLocked={milestone.is_locked}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: any;
  label: string;
  value: string;
  color: string;
  theme: string | undefined;
}

function StatCard({ icon: Icon, label, value, color, theme }: StatCardProps) {
  return (
    <div
      className={cn(
        "p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 hover:scale-105",
        theme === "light"
          ? "bg-gray-50 border-gray-200 hover:shadow-md"
          : "bg-zinc-900/50 border-white/5 hover:bg-zinc-900/70"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("w-4 h-4", `text-${color}-400`)} />
        <span
          className={cn(
            "text-xs font-medium",
            theme === "light" ? "text-gray-600" : "text-muted-foreground"
          )}
        >
          {label}
        </span>
      </div>
      <div className={cn("text-lg font-bold", `text-${color}-400`)}>
        {value}
      </div>
    </div>
  );
}

interface MilestoneCardProps {
  milestone: any;
  index: number;
  theme: string | undefined;
  isLocked: boolean;
}

function MilestoneCard({
  milestone,
  index,
  theme,
  isLocked,
}: MilestoneCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const progress = milestone.progress;
  const status = progress?.status || "not_started";

  const statusConfig = {
    not_started: {
      icon: Circle,
      color: "gray",
      label: "Not Started",
      bg: "bg-gray-500/10",
    },
    in_progress: {
      icon: Play,
      color: "cyan",
      label: "In Progress",
      bg: "bg-cyan-500/10",
    },
    completed: {
      icon: CheckCircle2,
      color: "emerald",
      label: "Completed",
      bg: "bg-emerald-500/10",
    },
  };

  const config =
    statusConfig[status as keyof typeof statusConfig] || statusConfig.not_started;
  const StatusIcon = isLocked ? Lock : config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card
        className={cn(
          "border-2 backdrop-blur-xl transition-all duration-300 cursor-pointer",
          theme === "light"
            ? "bg-white border-gray-200 hover:border-purple-300 hover:shadow-lg"
            : "bg-zinc-950/80 border-white/10 hover:border-purple-500/40 hover:shadow-lg",
          isLocked && "opacity-60"
        )}
        onClick={() => !isLocked && setIsExpanded(!isExpanded)}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Milestone Number & Status Icon */}
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-2",
                  isLocked
                    ? "bg-gray-500/10 border-gray-500/30 text-gray-400"
                    : `${config.bg} border-${config.color}-500/30 text-${config.color}-400`
                )}
              >
                {index + 1}
              </div>
              <StatusIcon
                className={cn(
                  "w-5 h-5",
                  isLocked ? "text-gray-400" : `text-${config.color}-400`
                )}
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <h4
                    className={cn(
                      "text-lg font-bold mb-1",
                      theme === "light" ? "text-gray-900" : "text-white"
                    )}
                  >
                    {milestone.title}
                  </h4>
                  {milestone.description && (
                    <p
                      className={cn(
                        "text-sm",
                        theme === "light"
                          ? "text-gray-600"
                          : "text-muted-foreground"
                      )}
                    >
                      {milestone.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      "text-xs",
                      isLocked
                        ? "bg-gray-500/10 text-gray-400 border-gray-500/30"
                        : `bg-${config.color}-500/10 text-${config.color}-400 border-${config.color}-500/30`
                    )}
                  >
                    {isLocked ? "Locked" : config.label}
                  </Badge>
                  <ChevronRight
                    className={cn(
                      "w-5 h-5 transition-transform",
                      isExpanded && "rotate-90",
                      theme === "light" ? "text-gray-400" : "text-white/40"
                    )}
                  />
                </div>
              </div>

              {/* Progress Bar */}
              {progress && !isLocked && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={cn(
                        theme === "light"
                          ? "text-gray-600"
                          : "text-muted-foreground"
                      )}
                    >
                      Progress
                    </span>
                    <span className={`text-${config.color}-400 font-semibold`}>
                      {Math.round(progress.progress_percentage || 0)}%
                    </span>
                  </div>
                  <Progress
                    value={progress.progress_percentage || 0}
                    className="h-2"
                  />
                  <p
                    className={cn(
                      "text-xs",
                      theme === "light"
                        ? "text-gray-500"
                        : "text-muted-foreground"
                    )}
                  >
                    {progress.problems_completed || 0} of{" "}
                    {progress.problems_total || 0} problems completed
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 mt-3 text-xs">
                {milestone.total_problems > 0 && (
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3 text-purple-400" />
                    <span
                      className={cn(
                        theme === "light"
                          ? "text-gray-600"
                          : "text-muted-foreground"
                      )}
                    >
                      {milestone.total_problems} problems
                    </span>
                  </div>
                )}
                {milestone.estimated_hours > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-pink-400" />
                    <span
                      className={cn(
                        theme === "light"
                          ? "text-gray-600"
                          : "text-muted-foreground"
                      )}
                    >
                      ~{milestone.estimated_hours}h
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && !isLocked && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                  {/* Learning Objectives */}
                  {milestone.learning_objectives &&
                    milestone.learning_objectives.length > 0 && (
                      <div>
                        <h5
                          className={cn(
                            "text-sm font-semibold mb-2",
                            theme === "light" ? "text-gray-900" : "text-white"
                          )}
                        >
                          Learning Objectives
                        </h5>
                        <ul className="space-y-1">
                          {milestone.learning_objectives.map(
                            (obj: string, idx: number) => (
                              <li
                                key={idx}
                                className={cn(
                                  "text-sm flex items-start gap-2",
                                  theme === "light"
                                    ? "text-gray-600"
                                    : "text-muted-foreground"
                                )}
                              >
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                                {obj}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                  {/* Problems List */}
                  {milestone.problems && milestone.problems.length > 0 && (
                    <div>
                      <h5
                        className={cn(
                          "text-sm font-semibold mb-3",
                          theme === "light" ? "text-gray-900" : "text-white"
                        )}
                      >
                        Problems ({milestone.problems.length})
                      </h5>
                      <div className="space-y-2">
                        {milestone.problems.map((problem: any) => {
                          const difficultyColors = {
                            Easy: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
                            Medium: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
                            Hard: "text-red-400 border-red-400/30 bg-red-400/10",
                          };
                          const difficultyColor = difficultyColors[problem.difficulty as keyof typeof difficultyColors] || "text-gray-400 border-gray-400/30 bg-gray-400/10";

                          return (
                            <a
                              key={problem.id}
                              href={`/problems/${problem.title_slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "flex items-center justify-between p-3 rounded-lg border backdrop-blur-sm text-sm transition-all duration-300 hover:scale-[1.02] group",
                                theme === "light"
                                  ? "bg-gray-50 border-gray-200 hover:bg-gray-100"
                                  : "bg-zinc-900/50 border-white/5 hover:bg-zinc-900/70 hover:border-purple-500/50"
                              )}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs text-muted-foreground">
                                    #{problem.leetcode_id}
                                  </span>
                                  <span
                                    className={cn(
                                      "font-medium truncate",
                                      theme === "light"
                                        ? "text-gray-900"
                                        : "text-white"
                                    )}
                                  >
                                    {problem.title}
                                  </span>
                                </div>
                                {problem.topic_tags && problem.topic_tags.length > 0 && (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {problem.topic_tags.slice(0, 2).map((tag: any, idx: number) => (
                                      <span
                                        key={idx}
                                        className={cn(
                                          "text-xs px-1.5 py-0.5 rounded",
                                          theme === "light"
                                            ? "bg-gray-200 text-gray-600"
                                            : "bg-zinc-800 text-muted-foreground"
                                        )}
                                      >
                                        {tag.name || tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                {problem.acceptance_rate && (
                                  <span className="text-xs text-muted-foreground">
                                    {problem.acceptance_rate.toFixed(1)}%
                                  </span>
                                )}
                                <span
                                  className={cn(
                                    "text-xs px-2 py-1 rounded border font-semibold",
                                    difficultyColor
                                  )}
                                >
                                  {problem.difficulty}
                                </span>
                                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recommended Resources */}
                  {milestone.recommended_resources &&
                    milestone.recommended_resources.length > 0 && (
                      <div>
                        <h5
                          className={cn(
                            "text-sm font-semibold mb-2",
                            theme === "light" ? "text-gray-900" : "text-white"
                          )}
                        >
                          Recommended Resources
                        </h5>
                        <div className="space-y-2">
                          {milestone.recommended_resources.map(
                            (resource: any, idx: number) => (
                              <a
                                key={idx}
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "block p-3 rounded-lg border backdrop-blur-sm text-sm transition-all duration-300 hover:scale-[1.02]",
                                  theme === "light"
                                    ? "bg-gray-50 border-gray-200 hover:bg-gray-100"
                                    : "bg-zinc-900/50 border-white/5 hover:bg-zinc-900/70"
                                )}
                              >
                                <div
                                  className={cn(
                                    "font-medium mb-1",
                                    theme === "light"
                                      ? "text-gray-900"
                                      : "text-white"
                                  )}
                                >
                                  {resource.title}
                                </div>
                                <div
                                  className={cn(
                                    "text-xs",
                                    theme === "light"
                                      ? "text-gray-500"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {resource.type}
                                </div>
                              </a>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}
