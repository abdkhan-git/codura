"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  Loader2,
  Users,
  BookOpen,
  MessageSquare,
  Code2,
  Lightbulb,
  CheckCircle2,
  X,
  Search,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

interface Problem {
  id: number;
  title: string;
  difficulty: string;
  leetcode_id: number;
  title_slug: string;
}

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  podId: string;
  onSuccess?: () => void;
}

const SESSION_TYPES = [
  { value: 'study', label: 'Study Session', icon: BookOpen, color: 'emerald' },
  { value: 'problem_solving', label: 'Problem Solving', icon: Code2, color: 'blue' },
  { value: 'mock_interview', label: 'Mock Interview', icon: Users, color: 'purple' },
  { value: 'discussion', label: 'Discussion', icon: MessageSquare, color: 'cyan' },
  { value: 'review', label: 'Review', icon: Lightbulb, color: 'amber' },
];

export function CreateSessionModal({ isOpen, onClose, podId, onSuccess }: CreateSessionModalProps) {
  const { theme } = useTheme();
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [sessionType, setSessionType] = useState("study");
  const [durationMinutes, setDurationMinutes] = useState<number>(60);

  // Problems selection
  const [problems, setProblems] = useState<Problem[]>([]);
  const [filteredProblems, setFilteredProblems] = useState<Problem[]>([]);
  const [selectedProblems, setSelectedProblems] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showProblemsSection, setShowProblemsSection] = useState(false);
  const [loadingProblems, setLoadingProblems] = useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setDescription("");
      setScheduledAt("");
      setSessionType("study");
      setDurationMinutes(60);
      setSelectedProblems([]);
      setSearchQuery("");
      setShowProblemsSection(false);
    }
  }, [isOpen]);

  // Set default date to tomorrow at 10 AM
  useEffect(() => {
    if (isOpen && !scheduledAt) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      setScheduledAt(tomorrow.toISOString().slice(0, 16));
    }
  }, [isOpen]);

  // Load problems when problems section is shown
  useEffect(() => {
    if (showProblemsSection && problems.length === 0) {
      fetchProblems();
    }
  }, [showProblemsSection]);

  // Filter problems based on search
  useEffect(() => {
    if (searchQuery) {
      const filtered = problems.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.leetcode_id.toString().includes(searchQuery)
      );
      setFilteredProblems(filtered);
    } else {
      setFilteredProblems(problems);
    }
  }, [searchQuery, problems]);

  const fetchProblems = async () => {
    setLoadingProblems(true);
    try {
      const response = await fetch("/api/problems?limit=100");
      if (response.ok) {
        const data = await response.json();
        setProblems(data.problems || []);
        setFilteredProblems(data.problems || []);
      }
    } catch (error) {
      console.error("Error fetching problems:", error);
      toast.error("Failed to load problems");
    } finally {
      setLoadingProblems(false);
    }
  };

  const toggleProblem = (problemId: number) => {
    setSelectedProblems(prev =>
      prev.includes(problemId)
        ? prev.filter(id => id !== problemId)
        : [...prev, problemId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!title.trim()) {
      toast.error("Please enter a session title");
      return;
    }

    if (!scheduledAt) {
      toast.error("Please select a date and time");
      return;
    }

    // Check if date is in the future
    if (new Date(scheduledAt) < new Date()) {
      toast.error("Session must be scheduled for a future time");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/study-pods/${podId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          scheduled_at: new Date(scheduledAt).toISOString(),
          session_type: sessionType,
          duration_minutes: durationMinutes,
          problems_covered: selectedProblems,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create session");
      }

      toast.success("🎯 Session scheduled successfully!");
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Error creating session:", error);
      toast.error(error.message || "Failed to create session");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSessionType = SESSION_TYPES.find(t => t.value === sessionType);
  const SessionTypeIcon = selectedSessionType?.icon || BookOpen;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "medium":
        return "text-amber-400 bg-amber-500/10 border-amber-500/30";
      case "hard":
        return "text-rose-400 bg-rose-500/10 border-rose-500/30";
      default:
        return "text-muted-foreground bg-muted/10 border-white/10";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "sm:max-w-[700px] max-h-[90vh] border-2 overflow-hidden",
        theme === 'light'
          ? "bg-white border-emerald-500/20"
          : "bg-zinc-950 border-emerald-500/20"
      )}>
        {/* Background effects - only for dark mode */}
        {theme !== 'light' && (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.08),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(6,182,212,0.08),transparent_50%)]" />
          </>
        )}

        <DialogHeader className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              "p-2.5 rounded-xl border",
              theme === 'light'
                ? "bg-gradient-to-br from-emerald-50 to-cyan-50 border-emerald-200"
                : "bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border-emerald-500/30"
            )}>
              <Calendar className="w-6 h-6 text-emerald-400" />
            </div>
            <DialogTitle className={cn(
              "text-2xl",
              theme === 'light'
                ? "text-gray-900"
                : "bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent"
            )}>
              Schedule Study Session
            </DialogTitle>
          </div>
          <p className={cn(
            "text-sm",
            theme === 'light' ? "text-gray-600" : "text-white/60"
          )}>
            Coordinate a collaborative learning session with your pod members
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="relative space-y-5 max-h-[calc(90vh-200px)] overflow-y-auto pr-2">
          {/* Session Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className={theme === 'light' ? "text-gray-700" : "text-white/80"}>
              Session Title *
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Dynamic Programming Deep Dive"
              className={cn(
                "border",
                theme === 'light'
                  ? "bg-gray-50 border-gray-200 focus:border-emerald-500"
                  : "bg-white/5 border-white/10 focus:border-emerald-500/50"
              )}
              maxLength={100}
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_at" className={theme === 'light' ? "text-gray-700" : "text-white/80"}>
                Date & Time *
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="scheduled_at"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className={cn(
                    "pl-10 border",
                    theme === 'light'
                      ? "bg-gray-50 border-gray-200 focus:border-emerald-500"
                      : "bg-white/5 border-white/10 focus:border-emerald-500/50"
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration" className={theme === 'light' ? "text-gray-700" : "text-white/80"}>
                Duration (minutes)
              </Label>
              <Input
                id="duration"
                type="number"
                min="15"
                max="300"
                step="15"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className={cn(
                  "border",
                  theme === 'light'
                    ? "bg-gray-50 border-gray-200 focus:border-emerald-500"
                    : "bg-white/5 border-white/10 focus:border-emerald-500/50"
                )}
              />
            </div>
          </div>

          {/* Session Type */}
          <div className="space-y-2">
            <Label className={theme === 'light' ? "text-gray-700" : "text-white/80"}>
              Session Type *
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {SESSION_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = sessionType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setSessionType(type.value)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border transition-all",
                      theme === 'light'
                        ? isSelected
                          ? "bg-emerald-50 border-emerald-300"
                          : "bg-gray-50 border-gray-200 hover:border-gray-300"
                        : isSelected
                          ? "bg-emerald-500/10 border-emerald-500/50"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isSelected ? "text-emerald-500" : "text-muted-foreground")} />
                    <span className={cn(
                      "text-sm font-medium",
                      theme === 'light'
                        ? isSelected ? "text-emerald-700" : "text-gray-700"
                        : isSelected ? "text-emerald-400" : "text-white/70"
                    )}>
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className={theme === 'light' ? "text-gray-700" : "text-white/80"}>
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any details, agenda items, or preparation notes..."
              rows={3}
              className={cn(
                "border resize-none",
                theme === 'light'
                  ? "bg-gray-50 border-gray-200 focus:border-emerald-500"
                  : "bg-white/5 border-white/10 focus:border-emerald-500/50"
              )}
              maxLength={500}
            />
          </div>

          {/* Problems to Cover (Optional) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className={theme === 'light' ? "text-gray-700" : "text-white/80"}>
                Problems to Cover (Optional)
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowProblemsSection(!showProblemsSection)}
                className="h-7 text-xs"
              >
                {showProblemsSection ? 'Hide' : 'Add Problems'}
              </Button>
            </div>

            {showProblemsSection && (
              <Card className={cn(
                "p-4 border",
                theme === 'light'
                  ? "bg-gray-50/50 border-gray-200"
                  : "bg-white/5 border-white/10"
              )}>
                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search problems..."
                    className={cn(
                      "pl-10 h-9 border",
                      theme === 'light'
                        ? "bg-white border-gray-200"
                        : "bg-white/5 border-white/10"
                    )}
                  />
                </div>

                {/* Selected Problems Summary */}
                {selectedProblems.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {selectedProblems.map(problemId => {
                      const problem = problems.find(p => p.id === problemId);
                      if (!problem) return null;
                      return (
                        <Badge
                          key={problemId}
                          variant="secondary"
                          className="gap-1.5 pr-1"
                        >
                          {problem.title.slice(0, 30)}...
                          <button
                            type="button"
                            onClick={() => toggleProblem(problemId)}
                            className="hover:bg-white/10 rounded p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}

                {/* Problems List */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {loadingProblems ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredProblems.length === 0 ? (
                    <p className="text-center py-8 text-sm text-muted-foreground">
                      {searchQuery ? "No problems found" : "No problems available"}
                    </p>
                  ) : (
                    filteredProblems.slice(0, 20).map(problem => {
                      const isSelected = selectedProblems.includes(problem.id);
                      return (
                        <button
                          key={problem.id}
                          type="button"
                          onClick={() => toggleProblem(problem.id)}
                          className={cn(
                            "w-full flex items-center gap-2 p-2 rounded-lg border transition-all text-left",
                            theme === 'light'
                              ? isSelected
                                ? "bg-emerald-50 border-emerald-300"
                                : "bg-white border-gray-200 hover:border-gray-300"
                              : isSelected
                                ? "bg-emerald-500/10 border-emerald-500/50"
                                : "bg-white/5 border-white/10 hover:border-white/20"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded border flex items-center justify-center flex-shrink-0",
                            isSelected
                              ? "bg-emerald-500 border-emerald-500"
                              : theme === 'light'
                                ? "border-gray-300"
                                : "border-white/20"
                          )}>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm font-medium truncate",
                              theme === 'light' ? "text-gray-900" : "text-white/90"
                            )}>
                              {problem.title}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn("text-xs flex-shrink-0", getDifficultyColor(problem.difficulty))}
                          >
                            {problem.difficulty}
                          </Badge>
                        </button>
                      );
                    })
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 sticky bottom-0 bg-inherit pb-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className={cn(
                "flex-1",
                theme === 'light'
                  ? "border-gray-300 hover:bg-gray-50"
                  : "border-white/10 hover:bg-white/5"
              )}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white border-0"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Session
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
