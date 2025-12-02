"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { format, addDays, setHours, setMinutes, startOfDay } from "date-fns";
import {
  Calendar as CalendarIcon,
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
  Sparkles,
  Zap,
  ChevronDown,
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
  {
    value: 'study',
    label: 'Study Session',
    icon: BookOpen,
    gradient: 'from-emerald-400 to-teal-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/50',
    description: 'Learn together'
  },
  {
    value: 'problem_solving',
    label: 'Problem Solving',
    icon: Code2,
    gradient: 'from-blue-400 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/50',
    description: 'Solve coding challenges'
  },
  {
    value: 'mock_interview',
    label: 'Mock Interview',
    icon: Users,
    gradient: 'from-purple-400 to-pink-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/50',
    description: 'Practice interviews'
  },
  {
    value: 'discussion',
    label: 'Discussion',
    icon: MessageSquare,
    gradient: 'from-cyan-400 to-blue-500',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/50',
    description: 'Talk about concepts'
  },
  {
    value: 'review',
    label: 'Review',
    icon: Lightbulb,
    gradient: 'from-amber-400 to-orange-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/50',
    description: 'Review and reinforce'
  },
];

const QUICK_DURATIONS = [30, 45, 60, 90, 120];

export function CreateSessionModal({ isOpen, onClose, podId, onSuccess }: CreateSessionModalProps) {
  const { theme } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("10:00");
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
      setSelectedDate(undefined);
      setSelectedTime("10:00");
      setSessionType("study");
      setDurationMinutes(60);
      setSelectedProblems([]);
      setSearchQuery("");
      setShowProblemsSection(false);
    }
  }, [isOpen]);

  // Set default date to tomorrow
  useEffect(() => {
    if (isOpen && !selectedDate) {
      const tomorrow = addDays(new Date(), 1);
      setSelectedDate(tomorrow);
    }
  }, [isOpen, selectedDate]);

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

    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    // Parse time string (HH:MM format)
    const [hours, minutes] = selectedTime.split(':').map(Number);

    // Combine date and time
    const scheduledDateTime = setMinutes(
      setHours(startOfDay(selectedDate), hours),
      minutes
    );

    // Check if date is in the future
    if (scheduledDateTime < new Date()) {
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
          scheduled_at: scheduledDateTime.toISOString(),
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
        "sm:max-w-[900px] max-h-[90vh] border-2 overflow-hidden p-0",
        theme === 'light'
          ? "bg-white border-emerald-200/50"
          : "bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border-emerald-500/20"
      )}>
        {/* Glassmorphic Background Effects */}
        {theme !== 'light' && (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.15),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(6,182,212,0.12),transparent_50%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />
          </>
        )}

        {/* Header */}
        <div className={cn(
          "relative p-6 pb-4 border-b",
          theme === 'light' ? "border-gray-200 bg-white/80" : "border-white/10 backdrop-blur-xl"
        )}>
          <div className="flex items-start gap-4">
            <div className={cn(
              "p-3 rounded-xl border-2 backdrop-blur-sm",
              theme === 'light'
                ? "bg-gradient-to-br from-emerald-50 to-cyan-50 border-emerald-300/50"
                : "bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border-emerald-500/30"
            )}>
              <CalendarIcon className="w-7 h-7 text-emerald-400" />
            </div>
            <div className="flex-1">
              <DialogTitle className={cn(
                "text-2xl font-bold mb-1",
                theme === 'light'
                  ? "text-gray-900"
                  : "bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent"
              )}>
                Schedule Study Session
              </DialogTitle>
              <p className={cn(
                "text-sm flex items-center gap-2",
                theme === 'light' ? "text-gray-600" : "text-white/60"
              )}>
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Plan a collaborative learning experience with your pod
              </p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="max-h-[calc(90vh-200px)] overflow-y-auto px-6 py-5 space-y-6">
            {/* Session Title */}
            <div className="space-y-2.5">
              <Label htmlFor="title" className={cn(
                "text-sm font-semibold flex items-center gap-2",
                theme === 'light' ? "text-gray-700" : "text-white/90"
              )}>
                <Zap className="w-4 h-4 text-amber-400" />
                Session Title *
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Dynamic Programming Deep Dive"
                className={cn(
                  "h-11 border-2 transition-all duration-200",
                  theme === 'light'
                    ? "bg-gray-50/80 border-gray-200 focus:border-emerald-400 focus:bg-white"
                    : "bg-white/5 backdrop-blur-sm border-white/10 focus:border-emerald-500/50 focus:bg-white/10"
                )}
                maxLength={100}
              />
            </div>

            {/* Date & Time Selection */}
            <div className="grid md:grid-cols-2 gap-5">
              {/* Date Picker */}
              <div className="space-y-2.5">
                <Label className={cn(
                  "text-sm font-semibold flex items-center gap-2",
                  theme === 'light' ? "text-gray-700" : "text-white/90"
                )}>
                  <CalendarIcon className="w-4 h-4 text-cyan-400" />
                  Date *
                </Label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full h-11 justify-between font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      {selectedDate ? format(selectedDate, "PPP") : <span>Select date</span>}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      captionLayout="dropdown"
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setDatePickerOpen(false);
                      }}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Picker */}
              <div className="space-y-2.5">
                <Label htmlFor="time-picker" className={cn(
                  "text-sm font-semibold flex items-center gap-2",
                  theme === 'light' ? "text-gray-700" : "text-white/90"
                )}>
                  <Clock className="w-4 h-4 text-purple-400" />
                  Time *
                </Label>
                <Input
                  type="time"
                  id="time-picker"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="h-11 bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                />
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2.5">
              <Label className={cn(
                "text-sm font-semibold",
                theme === 'light' ? "text-gray-700" : "text-white/90"
              )}>
                Duration
              </Label>
              <div className="flex flex-wrap gap-2">
                {QUICK_DURATIONS.map((duration) => (
                  <button
                    key={duration}
                    type="button"
                    onClick={() => setDurationMinutes(duration)}
                    className={cn(
                      "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all duration-200 hover:scale-105",
                      durationMinutes === duration
                        ? theme === 'light'
                          ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                          : "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                        : theme === 'light'
                          ? "bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300"
                          : "bg-white/5 backdrop-blur-sm border-white/10 text-white/70 hover:border-white/20"
                    )}
                  >
                    {duration} min
                  </button>
                ))}
              </div>
            </div>

            {/* Session Type */}
            <div className="space-y-2.5">
              <Label className={cn(
                "text-sm font-semibold",
                theme === 'light' ? "text-gray-700" : "text-white/90"
              )}>
                Session Type *
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {SESSION_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = sessionType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setSessionType(type.value)}
                      className={cn(
                        "relative group p-4 rounded-xl border-2 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] text-left overflow-hidden",
                        isSelected
                          ? `${type.borderColor} ${type.bgColor} shadow-lg`
                          : theme === 'light'
                          ? "bg-white/90 border-gray-200/50 hover:border-gray-300"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      )}
                    >
                      <div className="relative flex flex-col gap-2">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300",
                          isSelected
                            ? `bg-gradient-to-br ${type.gradient} shadow-md`
                            : theme === 'light'
                            ? "bg-gray-100"
                            : "bg-white/10"
                        )}>
                          <Icon className={cn(
                            "w-5 h-5",
                            isSelected ? "text-white" : "text-muted-foreground"
                          )} />
                        </div>
                        <div>
                          <h4 className={cn(
                            "font-semibold text-sm mb-0.5",
                            theme === 'light' ? "text-gray-900" : "text-white"
                          )}>
                            {type.label}
                          </h4>
                          <p className={cn(
                            "text-xs",
                            theme === 'light' ? "text-gray-600" : "text-muted-foreground"
                          )}>
                            {type.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2.5">
              <Label htmlFor="description" className={cn(
                "text-sm font-semibold",
                theme === 'light' ? "text-gray-700" : "text-white/90"
              )}>
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add any details, agenda items, or preparation notes..."
                rows={3}
                className={cn(
                  "border-2 resize-none transition-all duration-200",
                  theme === 'light'
                    ? "bg-gray-50/80 border-gray-200 focus:border-emerald-400"
                    : "bg-white/5 backdrop-blur-sm border-white/10 focus:border-emerald-500/50"
                )}
                maxLength={500}
              />
            </div>

            {/* Problems to Cover (Optional) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className={cn(
                  "text-sm font-semibold",
                  theme === 'light' ? "text-gray-700" : "text-white/90"
                )}>
                  Problems to Cover (Optional)
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProblemsSection(!showProblemsSection)}
                  className="h-8 text-xs"
                >
                  {showProblemsSection ? 'Hide' : 'Add Problems'}
                </Button>
              </div>

              {showProblemsSection && (
                <Card className={cn(
                  "p-4 border-2",
                  theme === 'light'
                    ? "bg-gray-50/50 border-gray-200"
                    : "bg-white/5 backdrop-blur-sm border-white/10"
                )}>
                  {/* Search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search problems..."
                      className={cn(
                        "pl-10 h-10 border-2",
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
                  <div className="space-y-2 max-h-48 overflow-y-auto">
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
                              "w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left",
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
                              "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0",
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
          </div>

          {/* Footer */}
          <div className={cn(
            "relative flex gap-3 p-6 pt-4 border-t",
            theme === 'light' ? "border-gray-200 bg-white/80" : "border-white/10 backdrop-blur-xl"
          )}>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className={cn(
                "flex-1 h-11 border-2",
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
              className="flex-1 h-11 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white border-0 shadow-lg shadow-emerald-500/25"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <CalendarIcon className="w-4 h-4 mr-2" />
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