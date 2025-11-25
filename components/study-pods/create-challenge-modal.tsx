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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, X, Plus, Zap, Clock, Swords, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { DefaultAvatar } from "@/components/ui/default-avatar";

interface CreateChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  podId: string;
  onChallengeCreated?: () => void;
}

interface Problem {
  id: number;
  title: string;
  difficulty: string;
}

interface Pod {
  id: string;
  name: string;
  avatar_url: string;
  subject: string;
  member_count: number;
}

const CHALLENGE_TYPES = [
  { value: 'daily', label: 'Daily Challenge', description: '24-hour sprint' },
  { value: 'weekly', label: 'Weekly Challenge', description: '7-day competition' },
  { value: 'custom', label: 'Custom Challenge', description: 'Set your own duration' },
  { value: 'head_to_head', label: 'Head-to-Head', description: 'Compete against another pod' },
];

const DIFFICULTY_COLORS = {
  Easy: 'text-emerald-500',
  Medium: 'text-amber-500',
  Hard: 'text-red-500',
};

export function CreateChallengeModal({
  isOpen,
  onClose,
  podId,
  onChallengeCreated,
}: CreateChallengeModalProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [searchingProblems, setSearchingProblems] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblems, setSelectedProblems] = useState<Problem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Team vs Team state
  const [searchingPods, setSearchingPods] = useState(false);
  const [availablePods, setAvailablePods] = useState<Pod[]>([]);
  const [selectedOpponentPod, setSelectedOpponentPod] = useState<Pod | null>(null);
  const [podSearchQuery, setPodSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    challenge_type: 'daily',
    start_time: '',
    end_time: '',
    duration_minutes: 60,
    max_participants: '',
    base_points_easy: 10,
    base_points_medium: 20,
    base_points_hard: 30,
    max_speed_bonus: 50,
    max_efficiency_bonus: 30,
  });

  useEffect(() => {
    if (isOpen) {
      // Set default start time to now
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setFormData(prev => ({
        ...prev,
        start_time: now.toISOString().slice(0, 16),
      }));
    }
  }, [isOpen]);

  useEffect(() => {
    // Auto-calculate end time based on challenge type
    if (formData.start_time && formData.challenge_type) {
      const start = new Date(formData.start_time);
      let duration = 0;

      switch (formData.challenge_type) {
        case 'daily':
          duration = 24 * 60; // 24 hours
          break;
        case 'weekly':
          duration = 7 * 24 * 60; // 7 days
          break;
        case 'custom':
          duration = formData.duration_minutes;
          break;
        case 'head_to_head':
          duration = 120; // 2 hours default
          break;
      }

      const end = new Date(start.getTime() + duration * 60000);
      end.setMinutes(end.getMinutes() - end.getTimezoneOffset());
      setFormData(prev => ({
        ...prev,
        end_time: end.toISOString().slice(0, 16),
        duration_minutes: duration,
      }));
    }
  }, [formData.start_time, formData.challenge_type]);

  const searchProblems = async () => {
    if (!searchQuery.trim()) return;

    setSearchingProblems(true);
    try {
      const response = await fetch(`/api/problems?search=${encodeURIComponent(searchQuery)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setProblems(data.problems || []);
      }
    } catch (error) {
      console.error('Error searching problems:', error);
      toast.error('Failed to search problems');
    } finally {
      setSearchingProblems(false);
    }
  };

  const searchPods = async () => {
    setSearchingPods(true);
    try {
      const response = await fetch(
        `/api/study-pods/search?q=${encodeURIComponent(podSearchQuery)}&visibility=public&limit=10`
      );
      if (response.ok) {
        const data = await response.json();
        // Filter out the current pod
        const filteredPods = (data.pods || []).filter((p: Pod) => p.id !== podId);
        setAvailablePods(filteredPods);
      }
    } catch (error) {
      console.error('Error searching pods:', error);
      toast.error('Failed to search pods');
    } finally {
      setSearchingPods(false);
    }
  };

  // Search pods when query changes (debounced effect)
  useEffect(() => {
    if (formData.challenge_type === 'head_to_head' && podSearchQuery.length >= 2) {
      const timer = setTimeout(searchPods, 300);
      return () => clearTimeout(timer);
    }
  }, [podSearchQuery, formData.challenge_type]);

  const addProblem = (problem: Problem) => {
    if (!selectedProblems.find(p => p.id === problem.id)) {
      setSelectedProblems([...selectedProblems, problem]);
    }
    setSearchQuery('');
    setProblems([]);
  };

  const removeProblem = (problemId: number) => {
    setSelectedProblems(selectedProblems.filter(p => p.id !== problemId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedProblems.length === 0) {
      toast.error('Please select at least one problem');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Please enter a challenge title');
      return;
    }

    // Validate team challenge has opponent selected
    if (formData.challenge_type === 'head_to_head' && !selectedOpponentPod) {
      toast.error('Please select an opponent pod for the team challenge');
      return;
    }

    setLoading(true);
    try {
      // Use different endpoint for team challenges
      const endpoint = formData.challenge_type === 'head_to_head'
        ? `/api/study-pods/${podId}/challenges/team-challenge`
        : `/api/study-pods/${podId}/challenges`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          challenge_type: formData.challenge_type,
          start_time: new Date(formData.start_time).toISOString(),
          end_time: new Date(formData.end_time).toISOString(),
          duration_minutes: formData.duration_minutes,
          problem_ids: selectedProblems.map(p => p.id),
          max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
          point_config: {
            base_points: {
              easy: formData.base_points_easy,
              medium: formData.base_points_medium,
              hard: formData.base_points_hard,
            },
            max_speed_bonus: formData.max_speed_bonus,
            max_efficiency_bonus: formData.max_efficiency_bonus,
          },
          // Team challenge specific
          ...(formData.challenge_type === 'head_to_head' && {
            opponent_pod_id: selectedOpponentPod?.id,
          }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create challenge');
      }

      toast.success(
        formData.challenge_type === 'head_to_head'
          ? `Team challenge sent to ${selectedOpponentPod?.name}!`
          : 'Challenge created successfully!'
      );
      onClose();
      onChallengeCreated?.();

      // Reset form
      setFormData({
        title: '',
        description: '',
        challenge_type: 'daily',
        start_time: '',
        end_time: '',
        duration_minutes: 60,
        max_participants: '',
        base_points_easy: 10,
        base_points_medium: 20,
        base_points_hard: 30,
        max_speed_bonus: 50,
        max_efficiency_bonus: 30,
      });
      setSelectedProblems([]);
      setSelectedOpponentPod(null);
      setPodSearchQuery('');
      setAvailablePods([]);
    } catch (error: any) {
      console.error('Error creating challenge:', error);
      toast.error(error.message || 'Failed to create challenge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "sm:max-w-[700px] max-h-[90vh] overflow-y-auto",
        theme === 'light' ? "bg-white" : "bg-zinc-900 border-white/10"
      )}>
        <DialogHeader>
          <DialogTitle className={cn(
            "flex items-center gap-2",
            theme === 'light' ? "text-gray-900" : "text-white"
          )}>
            <Trophy className="w-5 h-5 text-emerald-500" />
            Create Challenge
          </DialogTitle>
          <DialogDescription className={theme === 'light' ? "text-gray-600" : "text-white/60"}>
            Create a competitive challenge for your pod members
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Challenge Type */}
          <div className="space-y-2">
            <Label className={theme === 'light' ? "text-gray-700" : "text-white/90"}>
              Challenge Type
            </Label>
            <Select
              value={formData.challenge_type}
              onValueChange={(value) => setFormData({ ...formData, challenge_type: value })}
            >
              <SelectTrigger className={theme === 'light' ? "bg-white" : "bg-white/5"}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHALLENGE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs opacity-60">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Opponent Pod Selection (for Head-to-Head) */}
          {formData.challenge_type === 'head_to_head' && (
            <div className={cn(
              "p-4 rounded-xl border-2 space-y-3",
              theme === 'light'
                ? "bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200"
                : "bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30"
            )}>
              <div className="flex items-center gap-2">
                <Swords className="w-5 h-5 text-blue-500" />
                <Label className={cn(
                  "font-semibold",
                  theme === 'light' ? "text-gray-900" : "text-white"
                )}>
                  Select Opponent Pod
                </Label>
              </div>

              {selectedOpponentPod ? (
                <div className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  theme === 'light' ? "bg-white border-gray-200" : "bg-white/5 border-white/10"
                )}>
                  <div className="flex items-center gap-3">
                    <DefaultAvatar
                      src={selectedOpponentPod.avatar_url}
                      name={selectedOpponentPod.name}
                      size="sm"
                    />
                    <div>
                      <p className={cn(
                        "font-medium",
                        theme === 'light' ? "text-gray-900" : "text-white"
                      )}>
                        {selectedOpponentPod.name}
                      </p>
                      <p className={cn(
                        "text-xs",
                        theme === 'light' ? "text-gray-500" : "text-white/50"
                      )}>
                        {selectedOpponentPod.subject} • {selectedOpponentPod.member_count} members
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedOpponentPod(null)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className={cn(
                      "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
                      theme === 'light' ? "text-gray-400" : "text-white/40"
                    )} />
                    <Input
                      value={podSearchQuery}
                      onChange={(e) => setPodSearchQuery(e.target.value)}
                      placeholder="Search public pods to challenge..."
                      className={cn(
                        "pl-10",
                        theme === 'light' ? "bg-white" : "bg-white/5"
                      )}
                    />
                  </div>

                  {searchingPods && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    </div>
                  )}

                  {availablePods.length > 0 && (
                    <div className={cn(
                      "space-y-1 max-h-48 overflow-y-auto rounded-lg border p-1",
                      theme === 'light' ? "bg-white border-gray-200" : "bg-white/5 border-white/10"
                    )}>
                      {availablePods.map((pod) => (
                        <button
                          key={pod.id}
                          type="button"
                          onClick={() => {
                            setSelectedOpponentPod(pod);
                            setPodSearchQuery('');
                            setAvailablePods([]);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors",
                            theme === 'light'
                              ? "hover:bg-gray-50"
                              : "hover:bg-white/10"
                          )}
                        >
                          <DefaultAvatar
                            src={pod.avatar_url}
                            name={pod.name}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "font-medium text-sm truncate",
                              theme === 'light' ? "text-gray-900" : "text-white"
                            )}>
                              {pod.name}
                            </p>
                            <p className={cn(
                              "text-xs truncate",
                              theme === 'light' ? "text-gray-500" : "text-white/50"
                            )}>
                              {pod.subject} • {pod.member_count} members
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {podSearchQuery.length >= 2 && !searchingPods && availablePods.length === 0 && (
                    <p className={cn(
                      "text-center text-sm py-3",
                      theme === 'light' ? "text-gray-500" : "text-white/50"
                    )}>
                      No public pods found
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className={theme === 'light' ? "text-gray-700" : "text-white/90"}>
              Title
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Weekend Code Sprint"
              className={theme === 'light' ? "bg-white" : "bg-white/5"}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className={theme === 'light' ? "text-gray-700" : "text-white/90"}>
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the challenge and any special rules..."
              className={theme === 'light' ? "bg-white" : "bg-white/5"}
              rows={3}
            />
          </div>

          {/* Timing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time" className={theme === 'light' ? "text-gray-700" : "text-white/90"}>
                Start Time
              </Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className={theme === 'light' ? "bg-white" : "bg-white/5"}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time" className={theme === 'light' ? "text-gray-700" : "text-white/90"}>
                End Time
              </Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className={theme === 'light' ? "bg-white" : "bg-white/5"}
                required
              />
            </div>
          </div>

          {/* Duration (for custom) */}
          {formData.challenge_type === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="duration" className={theme === 'light' ? "text-gray-700" : "text-white/90"}>
                Duration (minutes)
              </Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                className={theme === 'light' ? "bg-white" : "bg-white/5"}
                min={15}
                required
              />
            </div>
          )}

          {/* Max Participants */}
          <div className="space-y-2">
            <Label htmlFor="max_participants" className={theme === 'light' ? "text-gray-700" : "text-white/90"}>
              Max Participants (Optional)
            </Label>
            <Input
              id="max_participants"
              type="number"
              value={formData.max_participants}
              onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
              placeholder="Leave empty for unlimited"
              className={theme === 'light' ? "bg-white" : "bg-white/5"}
              min={2}
            />
          </div>

          {/* Problem Selection */}
          <div className="space-y-2">
            <Label className={theme === 'light' ? "text-gray-700" : "text-white/90"}>
              Problems ({selectedProblems.length})
            </Label>

            {/* Selected Problems */}
            {selectedProblems.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedProblems.map((problem) => (
                  <Badge
                    key={problem.id}
                    className={cn(
                      "gap-1 pr-1",
                      theme === 'light' ? "bg-gray-100 text-gray-900" : "bg-white/10 text-white"
                    )}
                  >
                    <span className={DIFFICULTY_COLORS[problem.difficulty as keyof typeof DIFFICULTY_COLORS]}>
                      {problem.difficulty}
                    </span>
                    <span className="mx-1">·</span>
                    {problem.title}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 hover:bg-red-500/20"
                      onClick={() => removeProblem(problem.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchProblems())}
                placeholder="Search problems by title..."
                className={theme === 'light' ? "bg-white" : "bg-white/5"}
              />
              <Button
                type="button"
                onClick={searchProblems}
                disabled={searchingProblems || !searchQuery.trim()}
                className="gap-2"
              >
                {searchingProblems ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add
              </Button>
            </div>

            {/* Search Results */}
            {problems.length > 0 && (
              <div className={cn(
                "border rounded-lg p-2 space-y-1 max-h-48 overflow-y-auto",
                theme === 'light' ? "bg-gray-50 border-gray-200" : "bg-white/5 border-white/10"
              )}>
                {problems.map((problem) => (
                  <button
                    key={problem.id}
                    type="button"
                    onClick={() => addProblem(problem)}
                    disabled={selectedProblems.find(p => p.id === problem.id) !== undefined}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded transition-colors text-sm",
                      theme === 'light'
                        ? "hover:bg-white disabled:opacity-50"
                        : "hover:bg-white/10 disabled:opacity-50"
                    )}
                  >
                    <span className={DIFFICULTY_COLORS[problem.difficulty as keyof typeof DIFFICULTY_COLORS]}>
                      {problem.difficulty}
                    </span>
                    <span className="mx-2">·</span>
                    {problem.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Point Configuration */}
          <div className={cn(
            "p-4 rounded-lg border space-y-4",
            theme === 'light' ? "bg-gray-50 border-gray-200" : "bg-white/5 border-white/10"
          )}>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h4 className={cn(
                "font-medium text-sm",
                theme === 'light' ? "text-gray-900" : "text-white"
              )}>
                Point Configuration
              </h4>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-emerald-500">Easy Base</Label>
                <Input
                  type="number"
                  value={formData.base_points_easy}
                  onChange={(e) => setFormData({ ...formData, base_points_easy: parseInt(e.target.value) || 10 })}
                  className={cn("h-8", theme === 'light' ? "bg-white" : "bg-white/5")}
                  min={1}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-amber-500">Medium Base</Label>
                <Input
                  type="number"
                  value={formData.base_points_medium}
                  onChange={(e) => setFormData({ ...formData, base_points_medium: parseInt(e.target.value) || 20 })}
                  className={cn("h-8", theme === 'light' ? "bg-white" : "bg-white/5")}
                  min={1}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-red-500">Hard Base</Label>
                <Input
                  type="number"
                  value={formData.base_points_hard}
                  onChange={(e) => setFormData({ ...formData, base_points_hard: parseInt(e.target.value) || 30 })}
                  className={cn("h-8", theme === 'light' ? "bg-white" : "bg-white/5")}
                  min={1}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Max Speed Bonus
                </Label>
                <Input
                  type="number"
                  value={formData.max_speed_bonus}
                  onChange={(e) => setFormData({ ...formData, max_speed_bonus: parseInt(e.target.value) || 50 })}
                  className={cn("h-8", theme === 'light' ? "bg-white" : "bg-white/5")}
                  min={0}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Max Efficiency Bonus
                </Label>
                <Input
                  type="number"
                  value={formData.max_efficiency_bonus}
                  onChange={(e) => setFormData({ ...formData, max_efficiency_bonus: parseInt(e.target.value) || 30 })}
                  className={cn("h-8", theme === 'light' ? "bg-white" : "bg-white/5")}
                  min={0}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || selectedProblems.length === 0}
              className="gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Trophy className="w-4 h-4" />
                  Create Challenge
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
