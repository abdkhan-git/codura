"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { STUDY_SUBJECTS } from "@/types/study-pods";

interface PodSettingsFormProps {
  pod: any;
  userRole: 'owner' | 'moderator' | 'member' | null;
  onSuccess?: () => void;
}

export function PodSettingsForm({ pod, userRole, onSuccess }: PodSettingsFormProps) {
  const { theme } = useTheme();
  const isOwner = userRole === 'owner';
  const isModerator = userRole === 'moderator';
  const canEdit = isOwner || isModerator;

  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    subject: "",
    skill_level: "",
    max_members: 6,
    is_public: true,
    requires_approval: false,
    topics: [] as string[],
    goals: "",
    target_problems_count: 0,
  });

  const [topicInput, setTopicInput] = useState("");

  useEffect(() => {
    if (pod) {
      setFormData({
        name: pod.name || "",
        description: pod.description || "",
        subject: pod.subject || "",
        skill_level: pod.skill_level || "",
        max_members: pod.max_members || 6,
        is_public: pod.is_public ?? true,
        requires_approval: pod.requires_approval ?? false,
        topics: pod.topics || [],
        goals: pod.goals || "",
        target_problems_count: pod.target_problems_count || 0,
      });
      setHasChanges(false);
    }
  }, [pod]);

  const handleChange = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleSubmit = async () => {
    // Validation
    if (isOwner) {
      if (!formData.name || formData.name.trim().length < 3) {
        toast.error("Pod name must be at least 3 characters");
        return;
      }
      if (!formData.subject) {
        toast.error("Subject is required");
        return;
      }
      if (!formData.skill_level) {
        toast.error("Skill level is required");
        return;
      }
      if (formData.max_members < 2 || formData.max_members > 20) {
        toast.error("Max members must be between 2 and 20");
        return;
      }
      if (formData.max_members < (pod.current_member_count || 0)) {
        toast.error(`Cannot set max members below current member count (${pod.current_member_count})`);
        return;
      }
    }

    setLoading(true);

    try {
      const updates: any = {};

      if (isOwner) {
        updates.name = formData.name.trim();
        updates.description = formData.description.trim() || null;
        updates.subject = formData.subject;
        updates.skill_level = formData.skill_level;
        updates.max_members = formData.max_members;
        updates.is_public = formData.is_public;
        updates.requires_approval = formData.requires_approval;
        updates.topics = formData.topics;
        updates.goals = formData.goals.trim() || null;
        updates.target_problems_count = formData.target_problems_count;
      } else if (isModerator) {
        updates.topics = formData.topics;
        updates.goals = formData.goals.trim() || null;
        updates.target_problems_count = formData.target_problems_count;
      }

      const response = await fetch(`/api/study-pods/${pod.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to update pod");
        return;
      }

      toast.success("Pod updated successfully");
      setHasChanges(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error updating pod:", error);
      toast.error("Failed to update pod");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);

    try {
      const response = await fetch(`/api/study-pods/${pod.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to delete pod");
        return;
      }

      toast.success("Pod deleted successfully");
      window.location.href = "/study-pods";
    } catch (error) {
      console.error("Error deleting pod:", error);
      toast.error("Failed to delete pod");
    } finally {
      setDeleteLoading(false);
    }
  };

  const addTopic = () => {
    if (topicInput.trim() && !formData.topics.includes(topicInput.trim())) {
      handleChange({ topics: [...formData.topics, topicInput.trim()] });
      setTopicInput("");
    }
  };

  const removeTopic = (topic: string) => {
    handleChange({ topics: formData.topics.filter(t => t !== topic) });
  };

  if (!canEdit) {
    return (
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-red-500/30 via-orange-500/30 to-red-500/30 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-all duration-500" />
        <div className="relative bg-gradient-to-br from-zinc-950/80 via-zinc-900/50 to-zinc-950/80 backdrop-blur-xl border-2 border-white/10 rounded-2xl p-12 text-center shadow-2xl">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2 text-red-400">
              No Edit Access
            </h3>
            <p className="text-muted-foreground">
              You don't have permission to edit pod settings
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Moderator Badge */}
      {isModerator && !isOwner && (
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/30 via-cyan-500/30 to-blue-500/30 rounded-xl blur-md opacity-60 group-hover:opacity-100 transition-all duration-500" />
          <div className="relative bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10 backdrop-blur-xl border border-blue-500/20 rounded-xl p-4">
            <p className="text-sm font-semibold text-blue-400 flex items-center">
              <span className="inline-flex w-2 h-2 rounded-full bg-blue-400 mr-2 animate-pulse" />
              Moderator Access — You can edit topics, goals, and target problems count
            </p>
          </div>
        </div>
      )}

      {/* Main Form */}
      <div className="relative group">
        {/* Outer glow on hover */}
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/30 via-cyan-500/30 to-emerald-500/30 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-all duration-500" />

        <div className={cn(
          "relative p-8 border-2 backdrop-blur-xl transition-all duration-500 overflow-hidden rounded-2xl shadow-2xl",
          theme === 'light'
            ? "bg-white/90 border-gray-200/50"
            : "bg-gradient-to-br from-zinc-950/80 via-zinc-900/50 to-zinc-950/80 border-white/10"
        )}>
          {/* Glassmorphic background patterns */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 opacity-40">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.15),transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(6,182,212,0.15),transparent_50%)]" />
            </div>
          </div>

          <div className="relative space-y-10">
            {/* Owner-only fields */}
            {isOwner && (
              <>
                {/* Basic Information */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-3 border-b border-white/5">
                    <h3 className="text-xl font-bold text-emerald-400">
                      Basic Information
                    </h3>
                  </div>

                  <div className="grid gap-6">
                    <div>
                      <Label htmlFor="name" className="text-sm font-semibold mb-2.5 block text-foreground">
                        Pod Name <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleChange({ name: e.target.value })}
                        className={cn(
                          "h-12 transition-all duration-300 border-2 backdrop-blur-sm",
                          theme === 'light'
                            ? "bg-white border-gray-200 focus:border-emerald-400"
                            : "bg-zinc-900/50 border-white/10 focus:border-emerald-500/50"
                        )}
                        placeholder="e.g., Dynamic Programming Masters"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-sm font-semibold mb-2.5 block text-foreground">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleChange({ description: e.target.value })}
                        className={cn(
                          "min-h-[120px] transition-all duration-300 border-2 backdrop-blur-sm resize-none",
                          theme === 'light'
                            ? "bg-white border-gray-200 focus:border-emerald-400"
                            : "bg-zinc-900/50 border-white/10 focus:border-emerald-500/50"
                        )}
                        placeholder="What's this pod about?"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="subject" className="text-sm font-semibold mb-2.5 block text-foreground">
                          Subject <span className="text-red-400">*</span>
                        </Label>
                        <Select
                          value={formData.subject}
                          onValueChange={(value) => handleChange({ subject: value })}
                        >
                          <SelectTrigger className={cn(
                            "h-12 transition-all duration-300 border-2 backdrop-blur-sm",
                            theme === 'light'
                              ? "bg-white border-gray-200"
                              : "bg-zinc-900/50 border-white/10"
                          )}>
                            <SelectValue placeholder="Select subject" />
                          </SelectTrigger>
                          <SelectContent className={cn(
                            "backdrop-blur-xl",
                            theme === 'light' ? "bg-white border-gray-200" : "bg-zinc-900 border-white/10"
                          )}>
                            {STUDY_SUBJECTS.map((subject) => (
                              <SelectItem key={subject} value={subject}>
                                {subject}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="skill_level" className="text-sm font-semibold mb-2.5 block text-foreground">
                          Skill Level <span className="text-red-400">*</span>
                        </Label>
                        <Select
                          value={formData.skill_level}
                          onValueChange={(value) => handleChange({ skill_level: value })}
                        >
                          <SelectTrigger className={cn(
                            "h-12 transition-all duration-300 border-2 backdrop-blur-sm",
                            theme === 'light'
                              ? "bg-white border-gray-200"
                              : "bg-zinc-900/50 border-white/10"
                          )}>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent className={cn(
                            "backdrop-blur-xl",
                            theme === 'light' ? "bg-white border-gray-200" : "bg-zinc-900 border-white/10"
                          )}>
                            <SelectItem value="Beginner">Beginner</SelectItem>
                            <SelectItem value="Intermediate">Intermediate</SelectItem>
                            <SelectItem value="Advanced">Advanced</SelectItem>
                            <SelectItem value="Mixed">Mixed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="max_members" className="text-sm font-semibold mb-2.5 block text-foreground">
                        Max Members <span className="text-red-400">*</span>
                        <span className="text-xs text-muted-foreground font-normal ml-2">
                          (Current: {pod.current_member_count || 0})
                        </span>
                      </Label>
                      <Input
                        id="max_members"
                        type="number"
                        min={pod.current_member_count || 2}
                        max={20}
                        value={formData.max_members}
                        onChange={(e) => handleChange({ max_members: parseInt(e.target.value) || 2 })}
                        className={cn(
                          "h-12 max-w-xs transition-all duration-300 border-2 backdrop-blur-sm",
                          theme === 'light'
                            ? "bg-white border-gray-200 focus:border-emerald-400"
                            : "bg-zinc-900/50 border-white/10 focus:border-emerald-500/50"
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Privacy Settings */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-3 border-b border-white/5">
                    <h3 className="text-xl font-bold text-cyan-400">
                      Privacy Settings
                    </h3>
                  </div>

                  <div className="grid gap-4">
                    <div className="relative group/card">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/0 via-emerald-500/0 to-emerald-500/0 group-hover/card:from-emerald-500/20 group-hover/card:via-emerald-500/20 group-hover/card:to-emerald-500/20 rounded-xl blur transition-all duration-300" />
                      <div className={cn(
                        "relative flex items-center justify-between p-5 rounded-xl border-2 backdrop-blur-sm transition-all duration-300",
                        theme === 'light'
                          ? "bg-gray-50 border-gray-200 hover:border-emerald-300"
                          : "bg-zinc-900/50 border-white/5 hover:border-emerald-500/30"
                      )}>
                        <div className="flex-1">
                          <Label htmlFor="is_public" className="font-semibold text-base cursor-pointer block mb-1">
                            Public Pod
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Anyone can discover and join this pod
                          </p>
                        </div>
                        <Switch
                          id="is_public"
                          checked={formData.is_public}
                          onCheckedChange={(checked) => handleChange({ is_public: checked })}
                        />
                      </div>
                    </div>

                    <div className="relative group/card">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/0 via-amber-500/0 to-amber-500/0 group-hover/card:from-amber-500/20 group-hover/card:via-amber-500/20 group-hover/card:to-amber-500/20 rounded-xl blur transition-all duration-300" />
                      <div className={cn(
                        "relative flex items-center justify-between p-5 rounded-xl border-2 backdrop-blur-sm transition-all duration-300",
                        theme === 'light'
                          ? "bg-gray-50 border-gray-200 hover:border-amber-300"
                          : "bg-zinc-900/50 border-white/5 hover:border-amber-500/30"
                      )}>
                        <div className="flex-1">
                          <Label htmlFor="requires_approval" className="font-semibold text-base cursor-pointer block mb-1">
                            Require Approval
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Review join requests before accepting members
                          </p>
                        </div>
                        <Switch
                          id="requires_approval"
                          checked={formData.requires_approval}
                          onCheckedChange={(checked) => handleChange({ requires_approval: checked })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Shared Settings */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-white/5">
                <h3 className="text-xl font-bold text-orange-400">
                  Goals & Topics
                </h3>
              </div>

              <div className="grid gap-6">
                <div>
                  <Label className="text-sm font-semibold mb-2.5 block text-foreground">
                    Topics
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={topicInput}
                      onChange={(e) => setTopicInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                      className={cn(
                        "h-12 transition-all duration-300 border-2 backdrop-blur-sm",
                        theme === 'light'
                          ? "bg-white border-gray-200 focus:border-emerald-400"
                          : "bg-zinc-900/50 border-white/10 focus:border-emerald-500/50"
                      )}
                      placeholder="Add a topic..."
                    />
                    <div className="relative group/btn">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg blur-md opacity-60 group-hover/btn:opacity-100 transition-all duration-500" />
                      <Button
                        type="button"
                        onClick={addTopic}
                        className="relative h-12 px-6 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 border-0 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-300 font-semibold"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                  {formData.topics.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {formData.topics.map((topic, index) => (
                        <div key={index} className="relative group/badge">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 rounded-lg blur opacity-0 group-hover/badge:opacity-100 transition-all duration-300" />
                          <Badge
                            className={cn(
                              "relative px-4 py-2 flex items-center gap-2 transition-all duration-300 hover:scale-105 backdrop-blur-sm",
                              theme === 'light'
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:border-emerald-400"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50"
                            )}
                          >
                            {topic}
                            <button
                              onClick={() => removeTopic(topic)}
                              className="hover:text-cyan-400 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="goals" className="text-sm font-semibold mb-2.5 block text-foreground">
                    Goals
                  </Label>
                  <Textarea
                    id="goals"
                    value={formData.goals}
                    onChange={(e) => handleChange({ goals: e.target.value })}
                    className={cn(
                      "min-h-[120px] transition-all duration-300 border-2 backdrop-blur-sm resize-none",
                      theme === 'light'
                        ? "bg-white border-gray-200 focus:border-emerald-400"
                        : "bg-zinc-900/50 border-white/10 focus:border-emerald-500/50"
                    )}
                    placeholder="What do you want to achieve together?"
                  />
                </div>

                <div>
                  <Label htmlFor="target_problems" className="text-sm font-semibold mb-2.5 block text-foreground">
                    Target Problems Count
                  </Label>
                  <Input
                    id="target_problems"
                    type="number"
                    min={0}
                    value={formData.target_problems_count}
                    onChange={(e) => handleChange({ target_problems_count: parseInt(e.target.value) || 0 })}
                    className={cn(
                      "h-12 max-w-xs transition-all duration-300 border-2 backdrop-blur-sm",
                      theme === 'light'
                        ? "bg-white border-gray-200 focus:border-emerald-400"
                        : "bg-zinc-900/50 border-white/10 focus:border-emerald-500/50"
                    )}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className={cn(
            "relative mt-8 pt-6 border-t-2",
            theme === 'light' ? "border-gray-200" : "border-white/5"
          )}>
            <div className="flex items-center justify-between gap-4">
              {/* Delete Button */}
              <div>
                {isOwner && !showDeleteConfirm && (
                  <Button
                    variant="ghost"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                  >
                    Delete Pod
                  </Button>
                )}
                {isOwner && showDeleteConfirm && (
                  <div className="flex gap-3 items-center">
                    <span className="text-sm font-semibold text-red-400">
                      Are you sure?
                    </span>
                    <Button
                      size="sm"
                      onClick={handleDelete}
                      disabled={deleteLoading}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-500/50 transition-all"
                      variant="outline"
                    >
                      {deleteLoading ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="hover:bg-zinc-800/50 transition-all"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="relative group/btn">
                {hasChanges && (
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg blur-md opacity-60 group-hover/btn:opacity-100 animate-pulse transition-all" />
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={loading || deleteLoading || !hasChanges}
                  className={cn(
                    "relative min-w-[140px] h-12 font-semibold transition-all duration-300",
                    hasChanges
                      ? "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 border-0 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02]"
                      : "bg-zinc-800/50 text-zinc-500 cursor-not-allowed"
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
