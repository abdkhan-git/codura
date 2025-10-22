"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Loader2,
  X,
  ListPlus,
  CheckCircle2,
  Filter,
  Calendar,
  Flag,
  Sparkles,
  Zap,
  Target,
} from "lucide-react";
import { toast } from "sonner";

interface Problem {
  id: string;
  title: string;
  difficulty: string;
  category: string;
  leetcode_id: number;
}

interface AssignProblemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  podId: string;
  onSuccess?: () => void;
}

export function AssignProblemsModal({ isOpen, onClose, podId, onSuccess }: AssignProblemsModalProps) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [filteredProblems, setFilteredProblems] = useState<Problem[]>([]);
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hoveredProblemId, setHoveredProblemId] = useState<string | null>(null);

  // Assignment details
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  useEffect(() => {
    if (isOpen) {
      fetchProblems();
    }
  }, [isOpen]);

  useEffect(() => {
    filterProblems();
  }, [searchQuery, difficultyFilter, categoryFilter, problems]);

  const fetchProblems = async () => {
    try {
      const response = await fetch("/api/problems");
      if (response.ok) {
        const data = await response.json();
        setProblems(data.problems || []);
        setFilteredProblems(data.problems || []);
      }
    } catch (error) {
      console.error("Error fetching problems:", error);
      toast.error("Failed to load problems");
    } finally {
      setLoading(false);
    }
  };

  const filterProblems = () => {
    let filtered = [...problems];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.leetcode_id.toString().includes(searchQuery)
      );
    }

    // Difficulty filter
    if (difficultyFilter !== "all") {
      filtered = filtered.filter(p => p.difficulty.toLowerCase() === difficultyFilter.toLowerCase());
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(p => p.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    setFilteredProblems(filtered);
  };

  const toggleProblemSelection = (problemId: string) => {
    setSelectedProblems(prev =>
      prev.includes(problemId)
        ? prev.filter(id => id !== problemId)
        : [...prev, problemId]
    );
  };

  const handleAssign = async () => {
    if (selectedProblems.length === 0) {
      toast.error("Please select at least one problem");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/study-pods/${podId}/problems`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_ids: selectedProblems,
          deadline: deadline || undefined,
          notes: notes || undefined,
          priority,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to assign problems");
        return;
      }

      toast.success(`🎯 ${selectedProblems.length} problem${selectedProblems.length > 1 ? 's' : ''} assigned successfully`);
      setSelectedProblems([]);
      setDeadline("");
      setNotes("");
      setPriority("medium");
      setSearchQuery("");
      setDifficultyFilter("all");
      setCategoryFilter("all");
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error assigning problems:", error);
      toast.error("Failed to assign problems");
    } finally {
      setSubmitting(false);
    }
  };

  const getDifficultyConfig = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return {
          bg: "bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-emerald-500/10",
          text: "text-emerald-400",
          border: "border-emerald-500/30",
          icon: "🟢"
        };
      case "medium":
        return {
          bg: "bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10",
          text: "text-amber-400",
          border: "border-amber-500/30",
          icon: "🟡"
        };
      case "hard":
        return {
          bg: "bg-gradient-to-r from-rose-500/10 via-red-500/10 to-rose-500/10",
          text: "text-rose-400",
          border: "border-rose-500/30",
          icon: "🔴"
        };
      default:
        return {
          bg: "bg-muted/10",
          text: "text-muted-foreground",
          border: "border-white/10",
          icon: "⚪"
        };
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <Zap className="w-4 h-4 text-red-400" />;
      case "medium":
        return <Flag className="w-4 h-4 text-blue-400" />;
      case "low":
        return <Flag className="w-4 h-4 text-slate-400" />;
      default:
        return <Flag className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] bg-zinc-950 border-2 border-emerald-500/20 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(6,182,212,0.08),transparent_50%)]" />

        <DialogHeader className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30">
              <ListPlus className="w-6 h-6 text-emerald-400" />
            </div>
            <DialogTitle className="text-2xl bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              Assign Problems to Pod
            </DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Select problems to build your pod's learning path
          </p>
        </DialogHeader>

        <div className="space-y-5 overflow-y-auto max-h-[65vh] pr-2 relative">
          {/* Filters */}
          <div className="sticky top-0 bg-zinc-950/95 backdrop-blur-xl pb-4 z-20 border-b border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">Filters</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="search" className="text-xs font-medium flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-emerald-400" />
                  Search
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Title or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-zinc-900/50 border-white/10 focus:border-emerald-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Difficulty</Label>
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger className="bg-zinc-900/50 border-white/10 focus:border-emerald-500/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="easy">🟢 Easy</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="hard">🔴 Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="bg-zinc-900/50 border-white/10 focus:border-emerald-500/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="array">Array</SelectItem>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="tree">Tree</SelectItem>
                    <SelectItem value="graph">Graph</SelectItem>
                    <SelectItem value="dynamic programming">Dynamic Programming</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Selected count banner */}
          {selectedProblems.length > 0 && (
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl blur opacity-30" />
              <div className="relative flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-400">
                      {selectedProblems.length} Problem{selectedProblems.length !== 1 ? "s" : ""} Selected
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ready to assign to your pod
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedProblems([])}
                  className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>
          )}

          {/* Problems list */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full blur-xl opacity-20 animate-pulse" />
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500 relative z-10" />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">Loading problems...</p>
            </div>
          ) : filteredProblems.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/5">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold mb-2">No Problems Found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredProblems.slice(0, 50).map((problem) => {
                const isSelected = selectedProblems.includes(problem.id);
                const isHovered = hoveredProblemId === problem.id;
                const difficultyConfig = getDifficultyConfig(problem.difficulty);

                return (
                  <div
                    key={problem.id}
                    className="relative group"
                    onMouseEnter={() => setHoveredProblemId(problem.id)}
                    onMouseLeave={() => setHoveredProblemId(null)}
                  >
                    {isSelected && (
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 rounded-xl blur opacity-50" />
                    )}
                    <Card
                      onClick={() => toggleProblemSelection(problem.id)}
                      className={`relative cursor-pointer transition-all duration-200 border overflow-hidden ${
                        isSelected
                          ? "border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-950/40 to-zinc-950/80"
                          : "border border-white/5 bg-zinc-900/30 hover:border-emerald-500/30 hover:bg-zinc-900/50"
                      }`}
                    >
                      {/* Selection gradient overlay */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-cyan-500/5" />
                      )}

                      <div className="relative p-4">
                        <div className="flex items-center gap-4">
                          {/* Custom Checkbox */}
                          <div className={`relative w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                            isSelected
                              ? "bg-gradient-to-br from-emerald-500 to-cyan-500 border-emerald-500"
                              : "border-white/20 group-hover:border-emerald-500/50"
                          }`}>
                            {isSelected && (
                              <CheckCircle2 className="w-5 h-5 text-white animate-in zoom-in duration-200" />
                            )}
                          </div>

                          {/* Problem Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-mono text-muted-foreground px-2 py-0.5 rounded bg-zinc-800/50 border border-white/5">
                                #{problem.leetcode_id}
                              </span>
                              <h4 className="font-semibold truncate group-hover:text-emerald-400 transition-colors">
                                {problem.title}
                              </h4>
                            </div>
                            <div className="flex gap-2">
                              <Badge className={`text-xs ${difficultyConfig.bg} ${difficultyConfig.text} border ${difficultyConfig.border}`}>
                                <span className="mr-1">{difficultyConfig.icon}</span>
                                {problem.difficulty}
                              </Badge>
                              <Badge variant="outline" className="text-xs bg-zinc-900/50 border-white/10">
                                {problem.category}
                              </Badge>
                            </div>
                          </div>

                          {/* Hover indicator */}
                          {isHovered && !isSelected && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus className="w-5 h-5 text-emerald-400" />
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              })}
              {filteredProblems.length > 50 && (
                <p className="text-xs text-center text-muted-foreground py-3 border-t border-white/5">
                  Showing first 50 results. Use filters to narrow down your search.
                </p>
              )}
            </div>
          )}

          {/* Assignment details */}
          {selectedProblems.length > 0 && (
            <div className="border-t border-white/10 pt-5 mt-5 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-emerald-400">Assignment Details</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deadline" className="text-xs font-medium flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    Deadline (Optional)
                  </Label>
                  <Input
                    id="deadline"
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="bg-zinc-900/50 border-white/10 focus:border-emerald-500/50 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-2">
                    {getPriorityIcon(priority)}
                    Priority
                  </Label>
                  <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                    <SelectTrigger className="bg-zinc-900/50 border-white/10 focus:border-emerald-500/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-medium flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Add instructions or context for this assignment..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-zinc-900/50 border-white/10 focus:border-emerald-500/50 min-h-[90px] resize-none transition-colors"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {notes.length}/500
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 justify-end border-t border-white/10 pt-5 relative">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="border-white/10 hover:bg-zinc-800/50"
          >
            Cancel
          </Button>
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg blur opacity-50 group-hover:opacity-75 transition duration-300" />
            <Button
              onClick={handleAssign}
              disabled={submitting || selectedProblems.length === 0}
              className="relative bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 border-0 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Assign {selectedProblems.length > 0 ? `(${selectedProblems.length})` : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
