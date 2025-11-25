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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  Pencil,
  X,
  Plus,
  Zap,
  Clock,
  AlertTriangle,
  Trash2,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { toast } from "sonner";

interface EditChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  podId: string;
  challenge: Challenge;
  onChallengeUpdated?: () => void;
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
  created_by: string;
}

interface Problem {
  id: number;
  title: string;
  difficulty: string;
}

const DIFFICULTY_COLORS = {
  Easy: 'text-emerald-500',
  Medium: 'text-amber-500',
  Hard: 'text-red-500',
};

export function EditChallengeModal({
  isOpen,
  onClose,
  podId,
  challenge,
  onChallengeUpdated,
}: EditChallengeModalProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const [searchingProblems, setSearchingProblems] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblems, setSelectedProblems] = useState<Problem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    end_time: '',
    max_participants: '',
    base_points_easy: 10,
    base_points_medium: 20,
    base_points_hard: 30,
    max_speed_bonus: 50,
    max_efficiency_bonus: 30,
  });

  // Calculate if challenge has started
  const now = new Date();
  const startTime = new Date(challenge.start_time);
  const hasStarted = now >= startTime;
  const isCompleted = challenge.status === 'completed';
  const isCancelled = challenge.status === 'cancelled';

  useEffect(() => {
    if (isOpen && challenge) {
      // Initialize form with challenge data
      const endDate = new Date(challenge.end_time);
      endDate.setMinutes(endDate.getMinutes() - endDate.getTimezoneOffset());

      setFormData({
        title: challenge.title,
        description: challenge.description || '',
        end_time: endDate.toISOString().slice(0, 16),
        max_participants: challenge.max_participants?.toString() || '',
        base_points_easy: challenge.point_config?.base_points?.easy || 10,
        base_points_medium: challenge.point_config?.base_points?.medium || 20,
        base_points_hard: challenge.point_config?.base_points?.hard || 30,
        max_speed_bonus: challenge.point_config?.max_speed_bonus || 50,
        max_efficiency_bonus: challenge.point_config?.max_efficiency_bonus || 30,
      });

      // Fetch problem details
      if (challenge.problem_ids && challenge.problem_ids.length > 0) {
        fetchProblemDetails(challenge.problem_ids);
      }
    }
  }, [isOpen, challenge]);

  const fetchProblemDetails = async (problemIds: number[]) => {
    try {
      const response = await fetch(`/api/problems?ids=${problemIds.join(',')}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedProblems(data.problems || []);
      }
    } catch (error) {
      console.error('Error fetching problems:', error);
    }
  };

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

  const addProblem = (problem: Problem) => {
    if (!selectedProblems.find(p => p.id === problem.id)) {
      setSelectedProblems([...selectedProblems, problem]);
    }
    setSearchQuery('');
    setProblems([]);
  };

  const removeProblem = (problemId: number) => {
    // Can only remove if challenge hasn't started
    if (hasStarted) {
      toast.error('Cannot remove problems after challenge has started');
      return;
    }
    setSelectedProblems(selectedProblems.filter(p => p.id !== problemId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedProblems.length === 0) {
      toast.error('Challenge must have at least one problem');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Please enter a challenge title');
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {
        title: formData.title,
        description: formData.description,
        end_time: new Date(formData.end_time).toISOString(),
        problem_ids: selectedProblems.map(p => p.id),
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
      };

      // Only include point config if challenge hasn't started
      if (!hasStarted) {
        updateData.point_config = {
          base_points: {
            easy: formData.base_points_easy,
            medium: formData.base_points_medium,
            hard: formData.base_points_hard,
          },
          max_speed_bonus: formData.max_speed_bonus,
          max_efficiency_bonus: formData.max_efficiency_bonus,
        };
      }

      const response = await fetch(`/api/study-pods/${podId}/challenges/${challenge.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update challenge');
      }

      toast.success('Challenge updated successfully!');
      onClose();
      onChallengeUpdated?.();
    } catch (error: any) {
      console.error('Error updating challenge:', error);
      toast.error(error.message || 'Failed to update challenge');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const response = await fetch(`/api/study-pods/${podId}/challenges/${challenge.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel challenge');
      }

      toast.success('Challenge cancelled');
      setShowCancelConfirm(false);
      onClose();
      onChallengeUpdated?.();
    } catch (error: any) {
      console.error('Error cancelling challenge:', error);
      toast.error(error.message || 'Failed to cancel challenge');
    } finally {
      setCancelling(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/study-pods/${podId}/challenges/${challenge.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete challenge');
      }

      toast.success('Challenge deleted');
      setShowDeleteConfirm(false);
      onClose();
      onChallengeUpdated?.();
    } catch (error: any) {
      console.error('Error deleting challenge:', error);
      toast.error(error.message || 'Failed to delete challenge');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
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
              <Pencil className="w-5 h-5 text-emerald-500" />
              Edit Challenge
            </DialogTitle>
            <DialogDescription className={theme === 'light' ? "text-gray-600" : "text-white/60"}>
              Update challenge settings and configuration
            </DialogDescription>
          </DialogHeader>

          {/* Status warnings */}
          {hasStarted && !isCompleted && !isCancelled && (
            <div className={cn(
              "flex items-center gap-2 p-3 rounded-lg border",
              theme === 'light'
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-amber-500/10 border-amber-500/30 text-amber-400"
            )}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">
                Challenge is in progress. Some settings cannot be changed. You can extend the end time and add problems.
              </p>
            </div>
          )}

          {(isCompleted || isCancelled) && (
            <div className={cn(
              "flex items-center gap-2 p-3 rounded-lg border",
              theme === 'light'
                ? "bg-gray-50 border-gray-200 text-gray-600"
                : "bg-white/5 border-white/10 text-white/60"
            )}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">
                This challenge is {isCancelled ? 'cancelled' : 'completed'} and cannot be edited.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className={theme === 'light' ? "text-gray-700" : "text-white/90"}>
                Title
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={theme === 'light' ? "bg-white" : "bg-white/5"}
                disabled={isCompleted || isCancelled}
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
                className={theme === 'light' ? "bg-white" : "bg-white/5"}
                disabled={isCompleted || isCancelled}
                rows={3}
              />
            </div>

            {/* End Time */}
            <div className="space-y-2">
              <Label htmlFor="end_time" className={theme === 'light' ? "text-gray-700" : "text-white/90"}>
                End Time {hasStarted && "(Can only extend)"}
              </Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className={theme === 'light' ? "bg-white" : "bg-white/5"}
                disabled={isCompleted || isCancelled}
                required
              />
            </div>

            {/* Max Participants */}
            <div className="space-y-2">
              <Label htmlFor="max_participants" className={theme === 'light' ? "text-gray-700" : "text-white/90"}>
                Max Participants (Can only increase)
              </Label>
              <Input
                id="max_participants"
                type="number"
                value={formData.max_participants}
                onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                placeholder="Leave empty for unlimited"
                className={theme === 'light' ? "bg-white" : "bg-white/5"}
                disabled={isCompleted || isCancelled}
                min={challenge.current_participants}
              />
            </div>

            {/* Problem Selection */}
            <div className="space-y-2">
              <Label className={theme === 'light' ? "text-gray-700" : "text-white/90"}>
                Problems ({selectedProblems.length})
                {hasStarted && <span className="text-xs ml-2 opacity-60">(Can only add new)</span>}
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
                      {!hasStarted && !isCompleted && !isCancelled && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1 hover:bg-red-500/20"
                          onClick={() => removeProblem(problem.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Search (only if not completed/cancelled) */}
              {!isCompleted && !isCancelled && (
                <>
                  <div className="flex gap-2">
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchProblems())}
                      placeholder="Search problems to add..."
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
                </>
              )}
            </div>

            {/* Point Configuration (only editable before start) */}
            {!hasStarted && !isCompleted && !isCancelled && (
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
            )}

            <Separator />

            {/* Danger Zone */}
            {!isCompleted && !isCancelled && (
              <div className={cn(
                "p-4 rounded-lg border space-y-3",
                theme === 'light'
                  ? "bg-red-50 border-red-200"
                  : "bg-red-500/10 border-red-500/30"
              )}>
                <h4 className={cn(
                  "font-medium text-sm",
                  theme === 'light' ? "text-red-800" : "text-red-400"
                )}>
                  Danger Zone
                </h4>
                <div className="flex gap-2">
                  {hasStarted ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCancelConfirm(true)}
                      className="gap-2 border-red-500 text-red-500 hover:bg-red-500/10"
                    >
                      <Ban className="w-4 h-4" />
                      Cancel Challenge
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="gap-2 border-red-500 text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Challenge
                    </Button>
                  )}
                </div>
              </div>
            )}

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
              {!isCompleted && !isCancelled && (
                <Button
                  type="submit"
                  disabled={loading || selectedProblems.length === 0}
                  className="gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Pencil className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Challenge?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the challenge "{challenge.title}" and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Challenge?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the challenge "{challenge.title}". Participants will be notified and
              the challenge will be marked as cancelled. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Running</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelling}
              className="bg-red-500 hover:bg-red-600"
            >
              {cancelling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Cancelling...
                </>
              ) : (
                'Cancel Challenge'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
