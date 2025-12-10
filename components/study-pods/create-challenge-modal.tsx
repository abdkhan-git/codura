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
import { Loader2, Trophy, X, Plus, Zap, Clock, Swords, Search, Calendar, Target, Sparkles, Users } from "lucide-react";
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
  {
    value: 'daily',
    label: 'Daily Challenge',
    description: '24-hour sprint',
    icon: Clock,
    gradient: 'from-emerald-500 to-cyan-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30'
  },
  {
    value: 'weekly',
    label: 'Weekly Challenge',
    description: '7-day competition',
    icon: Calendar,
    gradient: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30'
  },
  {
    value: 'custom',
    label: 'Custom Challenge',
    description: 'Set your own duration',
    icon: Target,
    gradient: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30'
  },
  {
    value: 'head_to_head',
    label: 'Head-to-Head',
    description: 'Compete against another pod',
    icon: Swords,
    gradient: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30'
  },
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

  const selectedType = CHALLENGE_TYPES.find(t => t.value === formData.challenge_type);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "sm:max-w-[900px] max-h-[90vh] overflow-hidden p-0 border-2 backdrop-blur-xl flex flex-col",
        theme === 'light'
          ? "bg-white/98 border-gray-200/50 shadow-2xl"
          : "bg-zinc-950/98 border-white/10 shadow-2xl shadow-amber-500/10"
      )}>
        {/* Glassmorphic Background Effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.12),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(249,115,22,0.12),transparent_50%)]" />
          <div className={cn(
            "absolute inset-0",
            theme === 'light'
              ? "bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)]"
              : "bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)]"
          )} style={{ backgroundSize: '24px 24px' }} />
        </div>

        {/* Header */}
        <div className={cn(
          "relative px-6 pt-6 pb-4 border-b",
          theme === 'light' ? "border-gray-200/50" : "border-white/10"
        )}>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3 bg-gradient-to-r from-foreground via-amber-400 to-orange-400 bg-clip-text text-transparent">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                Create Challenge
              </DialogTitle>
              <DialogDescription className={cn(
                "mt-2",
                theme === 'light' ? "text-gray-600" : "text-muted-foreground"
              )}>
                Create a competitive challenge for your pod members
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="relative overflow-y-auto flex-1 px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Challenge Type Selection */}
            <div className="space-y-3">
              <Label className={cn(
                "text-sm font-semibold flex items-center gap-2",
                theme === 'light' ? "text-gray-900" : "text-white"
              )}>
                <Sparkles className="w-4 h-4 text-amber-400" />
                Challenge Type
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {CHALLENGE_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, challenge_type: type.value })}
                    className={cn(
                      "relative group p-4 rounded-xl border-2 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] text-left overflow-hidden",
                      formData.challenge_type === type.value
                        ? `${type.borderColor} ${type.bgColor} shadow-lg`
                        : theme === 'light'
                        ? "bg-white/90 border-gray-200/50 hover:border-gray-300"
                        : "bg-zinc-900/50 border-white/10 hover:border-white/20"
                    )}
                  >
                    <div className="relative flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300",
                        formData.challenge_type === type.value
                          ? `bg-gradient-to-br ${type.gradient} shadow-md`
                          : theme === 'light'
                          ? "bg-gray-100"
                          : "bg-white/10"
                      )}>
                        <type.icon className={cn(
                          "w-5 h-5",
                          formData.challenge_type === type.value ? "text-white" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="flex-1">
                        <h4 className={cn(
                          "font-semibold mb-0.5",
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
                      {formData.challenge_type === type.value && (
                        <div className="absolute top-2 right-2">
                          <div className={cn(
                            "w-5 h-5 rounded-full bg-gradient-to-br flex items-center justify-center",
                            type.gradient
                          )}>
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Opponent Pod Selection (for Head-to-Head) */}
            {formData.challenge_type === 'head_to_head' && (
              <div className={cn(
                "relative p-5 rounded-xl border-2 backdrop-blur-sm space-y-4 overflow-hidden",
                theme === 'light'
                  ? "bg-gradient-to-r from-orange-50/80 to-red-50/80 border-orange-200/50"
                  : "bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/30"
              )}>
                <div className="flex items-center gap-2">
                  <Swords className="w-5 h-5 text-orange-500" />
                  <Label className={cn(
                    "font-semibold",
                    theme === 'light' ? "text-gray-900" : "text-white"
                  )}>
                    Select Opponent Pod
                  </Label>
                </div>

                {selectedOpponentPod ? (
                  <div className={cn(
                    "flex items-center justify-between p-4 rounded-xl border-2 backdrop-blur-sm",
                    theme === 'light'
                      ? "bg-white/90 border-gray-200"
                      : "bg-zinc-900/50 border-white/10"
                  )}>
                    <div className="flex items-center gap-3">
                      <DefaultAvatar
                        src={selectedOpponentPod.avatar_url}
                        name={selectedOpponentPod.name}
                        size="sm"
                      />
                      <div>
                        <p className={cn(
                          "font-semibold",
                          theme === 'light' ? "text-gray-900" : "text-white"
                        )}>
                          {selectedOpponentPod.name}
                        </p>
                        <p className={cn(
                          "text-xs flex items-center gap-1",
                          theme === 'light' ? "text-gray-600" : "text-muted-foreground"
                        )}>
                          <Users className="w-3 h-3" />
                          {selectedOpponentPod.member_count} members • {selectedOpponentPod.subject}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedOpponentPod(null)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50/50"
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
                          "pl-10 border-2 backdrop-blur-sm",
                          theme === 'light'
                            ? "bg-white/90 border-gray-200"
                            : "bg-zinc-900/80 border-white/10"
                        )}
                      />
                    </div>

                    {searchingPods && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                      </div>
                    )}

                    {availablePods.length > 0 && (
                      <div className={cn(
                        "space-y-2 max-h-48 overflow-y-auto rounded-xl border-2 p-2",
                        theme === 'light'
                          ? "bg-white/90 border-gray-200"
                          : "bg-zinc-900/50 border-white/10"
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
                              "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200 hover:scale-[1.02]",
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
                                "text-xs truncate flex items-center gap-1",
                                theme === 'light' ? "text-gray-600" : "text-muted-foreground"
                              )}>
                                <Users className="w-3 h-3" />
                                {pod.member_count} members • {pod.subject}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {podSearchQuery.length >= 2 && !searchingPods && availablePods.length === 0 && (
                      <p className={cn(
                        "text-center text-sm py-4",
                        theme === 'light' ? "text-gray-500" : "text-muted-foreground"
                      )}>
                        No public pods found
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Title and Description */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="title" className={cn(
                  "text-sm font-semibold mb-2 block",
                  theme === 'light' ? "text-gray-900" : "text-white"
                )}>
                  Title <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Weekend Code Sprint"
                  className={cn(
                    "border-2 backdrop-blur-sm transition-all duration-300",
                    theme === 'light'
                      ? "bg-white/90 border-gray-200 focus:border-amber-400"
                      : "bg-zinc-900/80 border-white/10 focus:border-amber-500/50"
                  )}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description" className={cn(
                  "text-sm font-semibold mb-2 block",
                  theme === 'light' ? "text-gray-900" : "text-white"
                )}>
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the challenge and any special rules..."
                  className={cn(
                    "border-2 backdrop-blur-sm transition-all duration-300",
                    theme === 'light'
                      ? "bg-white/90 border-gray-200 focus:border-amber-400"
                      : "bg-zinc-900/80 border-white/10 focus:border-amber-500/50"
                  )}
                  rows={3}
                />
              </div>
            </div>

            {/* Timing */}
            <div className={cn(
              "p-5 rounded-xl border-2 backdrop-blur-sm space-y-4",
              theme === 'light'
                ? "bg-cyan-50/50 border-cyan-200/50"
                : "bg-cyan-500/5 border-cyan-500/20"
            )}>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-500" />
                <Label className={cn(
                  "font-semibold",
                  theme === 'light' ? "text-gray-900" : "text-white"
                )}>
                  Schedule
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time" className={cn(
                    "text-xs mb-2 block",
                    theme === 'light' ? "text-gray-700" : "text-muted-foreground"
                  )}>
                    Start Time
                  </Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className={cn(
                      "border-2 backdrop-blur-sm",
                      theme === 'light'
                        ? "bg-white/90 border-gray-200"
                        : "bg-zinc-900/80 border-white/10"
                    )}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_time" className={cn(
                    "text-xs mb-2 block",
                    theme === 'light' ? "text-gray-700" : "text-muted-foreground"
                  )}>
                    End Time
                  </Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className={cn(
                      "border-2 backdrop-blur-sm",
                      theme === 'light'
                        ? "bg-white/90 border-gray-200"
                        : "bg-zinc-900/80 border-white/10"
                    )}
                    required
                  />
                </div>
              </div>

              {formData.challenge_type === 'custom' && (
                <div>
                  <Label htmlFor="duration" className={cn(
                    "text-xs mb-2 block",
                    theme === 'light' ? "text-gray-700" : "text-muted-foreground"
                  )}>
                    Duration (minutes)
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                    className={cn(
                      "border-2 backdrop-blur-sm",
                      theme === 'light'
                        ? "bg-white/90 border-gray-200"
                        : "bg-zinc-900/80 border-white/10"
                    )}
                    min={15}
                    required
                  />
                </div>
              )}

              <div>
                <Label htmlFor="max_participants" className={cn(
                  "text-xs mb-2 block",
                  theme === 'light' ? "text-gray-700" : "text-muted-foreground"
                )}>
                  Max Participants (Optional)
                </Label>
                <Input
                  id="max_participants"
                  type="number"
                  value={formData.max_participants}
                  onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                  placeholder="Leave empty for unlimited"
                  className={cn(
                    "border-2 backdrop-blur-sm",
                    theme === 'light'
                      ? "bg-white/90 border-gray-200"
                      : "bg-zinc-900/80 border-white/10"
                  )}
                  min={2}
                />
              </div>
            </div>

            {/* Problem Selection */}
            <div className={cn(
              "p-5 rounded-xl border-2 backdrop-blur-sm space-y-4",
              theme === 'light'
                ? "bg-purple-50/50 border-purple-200/50"
                : "bg-purple-500/5 border-purple-500/20"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-500" />
                  <Label className={cn(
                    "font-semibold",
                    theme === 'light' ? "text-gray-900" : "text-white"
                  )}>
                    Problems ({selectedProblems.length})
                  </Label>
                </div>
                {selectedProblems.length === 0 && (
                  <Badge variant="outline" className="text-red-400 border-red-400/30">
                    Required
                  </Badge>
                )}
              </div>

              {/* Selected Problems */}
              {selectedProblems.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedProblems.map((problem) => (
                    <Badge
                      key={problem.id}
                      className={cn(
                        "gap-1.5 pr-1 py-1.5 border-2 backdrop-blur-sm transition-all duration-300 hover:scale-105",
                        theme === 'light'
                          ? "bg-white border-gray-200"
                          : "bg-zinc-900/50 border-white/10"
                      )}
                    >
                      <span className={DIFFICULTY_COLORS[problem.difficulty as keyof typeof DIFFICULTY_COLORS]}>
                        {problem.difficulty}
                      </span>
                      <span className="mx-1">·</span>
                      <span className={theme === 'light' ? "text-gray-900" : "text-white"}>
                        {problem.title}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 ml-1 hover:bg-red-500/20"
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
                <div className="relative flex-1">
                  <Search className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
                    theme === 'light' ? "text-gray-400" : "text-white/40"
                  )} />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchProblems())}
                    placeholder="Search problems by title..."
                    className={cn(
                      "pl-10 border-2 backdrop-blur-sm",
                      theme === 'light'
                        ? "bg-white/90 border-gray-200"
                        : "bg-zinc-900/80 border-white/10"
                    )}
                  />
                </div>
                <Button
                  type="button"
                  onClick={searchProblems}
                  disabled={searchingProblems || !searchQuery.trim()}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-2"
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
                  "border-2 rounded-xl p-2 space-y-1 max-h-48 overflow-y-auto",
                  theme === 'light'
                    ? "bg-white/90 border-gray-200"
                    : "bg-zinc-900/50 border-white/10"
                )}>
                  {problems.map((problem) => (
                    <button
                      key={problem.id}
                      type="button"
                      onClick={() => addProblem(problem)}
                      disabled={selectedProblems.find(p => p.id === problem.id) !== undefined}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg transition-all duration-200 text-sm hover:scale-[1.01]",
                        theme === 'light'
                          ? "hover:bg-gray-50 disabled:opacity-50"
                          : "hover:bg-white/10 disabled:opacity-50"
                      )}
                    >
                      <span className={DIFFICULTY_COLORS[problem.difficulty as keyof typeof DIFFICULTY_COLORS]}>
                        {problem.difficulty}
                      </span>
                      <span className="mx-2">·</span>
                      <span className={theme === 'light' ? "text-gray-900" : "text-white"}>
                        {problem.title}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Point Configuration */}
            <div className={cn(
              "p-5 rounded-xl border-2 backdrop-blur-sm space-y-4",
              theme === 'light'
                ? "bg-amber-50/50 border-amber-200/50"
                : "bg-amber-500/5 border-amber-500/20"
            )}>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <Label className={cn(
                  "font-semibold",
                  theme === 'light' ? "text-gray-900" : "text-white"
                )}>
                  Point Configuration
                </Label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-emerald-500 mb-2 block">Easy Base</Label>
                  <Input
                    type="number"
                    value={formData.base_points_easy}
                    onChange={(e) => setFormData({ ...formData, base_points_easy: parseInt(e.target.value) || 10 })}
                    className={cn(
                      "h-10 border-2 backdrop-blur-sm",
                      theme === 'light'
                        ? "bg-white/90 border-gray-200"
                        : "bg-zinc-900/80 border-white/10"
                    )}
                    min={1}
                  />
                </div>
                <div>
                  <Label className="text-xs text-amber-500 mb-2 block">Medium Base</Label>
                  <Input
                    type="number"
                    value={formData.base_points_medium}
                    onChange={(e) => setFormData({ ...formData, base_points_medium: parseInt(e.target.value) || 20 })}
                    className={cn(
                      "h-10 border-2 backdrop-blur-sm",
                      theme === 'light'
                        ? "bg-white/90 border-gray-200"
                        : "bg-zinc-900/80 border-white/10"
                    )}
                    min={1}
                  />
                </div>
                <div>
                  <Label className="text-xs text-red-500 mb-2 block">Hard Base</Label>
                  <Input
                    type="number"
                    value={formData.base_points_hard}
                    onChange={(e) => setFormData({ ...formData, base_points_hard: parseInt(e.target.value) || 30 })}
                    className={cn(
                      "h-10 border-2 backdrop-blur-sm",
                      theme === 'light'
                        ? "bg-white/90 border-gray-200"
                        : "bg-zinc-900/80 border-white/10"
                    )}
                    min={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs flex items-center gap-1 mb-2">
                    <Clock className="w-3 h-3" />
                    Max Speed Bonus
                  </Label>
                  <Input
                    type="number"
                    value={formData.max_speed_bonus}
                    onChange={(e) => setFormData({ ...formData, max_speed_bonus: parseInt(e.target.value) || 50 })}
                    className={cn(
                      "h-10 border-2 backdrop-blur-sm",
                      theme === 'light'
                        ? "bg-white/90 border-gray-200"
                        : "bg-zinc-900/80 border-white/10"
                    )}
                    min={0}
                  />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1 mb-2">
                    <Zap className="w-3 h-3" />
                    Max Efficiency Bonus
                  </Label>
                  <Input
                    type="number"
                    value={formData.max_efficiency_bonus}
                    onChange={(e) => setFormData({ ...formData, max_efficiency_bonus: parseInt(e.target.value) || 30 })}
                    className={cn(
                      "h-10 border-2 backdrop-blur-sm",
                      theme === 'light'
                        ? "bg-white/90 border-gray-200"
                        : "bg-zinc-900/80 border-white/10"
                    )}
                    min={0}
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className={cn(
          "relative px-6 py-4 border-t backdrop-blur-xl flex-shrink-0",
          theme === 'light' ? "border-gray-200/50 bg-white/80" : "border-white/10 bg-zinc-950/80"
        )}>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className={cn(
                "border-2",
                theme === 'light' ? "border-gray-200" : "border-white/10"
              )}
            >
              Cancel
            </Button>
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg blur-md opacity-0 group-hover:opacity-70 transition-all duration-500" />
              <Button
                type="submit"
                onClick={handleSubmit}
                disabled={loading || selectedProblems.length === 0}
                className="relative gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg"
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
