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
import { X, Loader2, Save, Trash2, AlertTriangle, Sparkles, Shield } from "lucide-react";
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
      <div className={cn(
        "p-8 rounded-xl border-2 backdrop-blur-sm text-center",
        theme === 'light'
          ? "bg-gray-50 border-gray-200"
          : "bg-zinc-900/50 border-white/5"
      )}>
        <Shield className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
        <p className={theme === 'light' ? "text-gray-600" : "text-muted-foreground"}>
          You don't have permission to edit pod settings
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Role Badge */}
      {isModerator && !isOwner && (
        <div className={cn(
          "p-4 rounded-xl border-2 backdrop-blur-sm",
          theme === 'light'
            ? "bg-blue-50/50 border-blue-200/50"
            : "bg-blue-500/5 border-blue-500/20"
        )}>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <div>
              <h4 className={cn(
                "font-semibold text-sm",
                theme === 'light' ? "text-blue-900" : "text-blue-400"
              )}>
                Moderator Access
              </h4>
              <p className={cn(
                "text-xs",
                theme === 'light' ? "text-blue-700" : "text-blue-400/70"
              )}>
                You can edit topics, goals, and target problems count
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="relative">
        {/* Glassmorphic Background Effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.08),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(6,182,212,0.08),transparent_50%)]" />
          <div className={cn(
            "absolute inset-0",
            theme === 'light'
              ? "bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)]"
              : "bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)]"
          )} style={{ backgroundSize: '24px 24px' }} />
        </div>

        <div className={cn(
          "relative p-6 rounded-2xl border-2 backdrop-blur-xl space-y-6",
          theme === 'light'
            ? "bg-white/95 border-gray-200/50 shadow-xl"
            : "bg-zinc-950/95 border-white/10 shadow-2xl shadow-emerald-500/5"
        )}>
          {/* Owner-only fields */}
          {isOwner && (
            <>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className={cn(
                    "text-sm font-semibold mb-2 flex items-center gap-2",
                    theme === 'light' ? "text-gray-900" : "text-white"
                  )}>
                    Pod Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange({ name: e.target.value })}
                    className={cn(
                      "transition-all duration-300 border-2 backdrop-blur-sm",
                      theme === 'light'
                        ? "bg-white/90 border-gray-200 focus:border-emerald-400"
                        : "bg-zinc-900/80 border-white/10 focus:border-emerald-500/50"
                    )}
                    placeholder="e.g., Dynamic Programming Masters"
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
                    onChange={(e) => handleChange({ description: e.target.value })}
                    className={cn(
                      "min-h-[100px] transition-all duration-300 border-2 backdrop-blur-sm",
                      theme === 'light'
                        ? "bg-white/90 border-gray-200 focus:border-emerald-400"
                        : "bg-zinc-900/80 border-white/10 focus:border-emerald-500/50"
                    )}
                    placeholder="What's this pod about?"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subject" className={cn(
                    "text-sm font-semibold mb-2 flex items-center gap-2",
                    theme === 'light' ? "text-gray-900" : "text-white"
                  )}>
                    Subject <span className="text-red-400">*</span>
                  </Label>
                  <Select
                    value={formData.subject}
                    onValueChange={(value) => handleChange({ subject: value })}
                  >
                    <SelectTrigger className={cn(
                      "transition-all duration-300 border-2 backdrop-blur-sm",
                      theme === 'light'
                        ? "bg-white/90 border-gray-200"
                        : "bg-zinc-900/80 border-white/10"
                    )}>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent className={cn(
                      "backdrop-blur-2xl border-2",
                      theme === 'light'
                        ? "bg-white/95 border-gray-200"
                        : "bg-zinc-950/95 border-white/10"
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
                  <Label htmlFor="skill_level" className={cn(
                    "text-sm font-semibold mb-2 flex items-center gap-2",
                    theme === 'light' ? "text-gray-900" : "text-white"
                  )}>
                    Skill Level <span className="text-red-400">*</span>
                  </Label>
                  <Select
                    value={formData.skill_level}
                    onValueChange={(value) => handleChange({ skill_level: value })}
                  >
                    <SelectTrigger className={cn(
                      "transition-all duration-300 border-2 backdrop-blur-sm",
                      theme === 'light'
                        ? "bg-white/90 border-gray-200"
                        : "bg-zinc-900/80 border-white/10"
                    )}>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent className={cn(
                      "backdrop-blur-2xl border-2",
                      theme === 'light'
                        ? "bg-white/95 border-gray-200"
                        : "bg-zinc-950/95 border-white/10"
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
                <Label htmlFor="max_members" className={cn(
                  "text-sm font-semibold mb-2 flex items-center gap-2",
                  theme === 'light' ? "text-gray-900" : "text-white"
                )}>
                  Max Members <span className="text-red-400">*</span>
                  <span className="text-xs text-muted-foreground font-normal">
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
                    "transition-all duration-300 border-2 backdrop-blur-sm",
                    theme === 'light'
                      ? "bg-white/90 border-gray-200 focus:border-emerald-400"
                      : "bg-zinc-900/80 border-white/10 focus:border-emerald-500/50"
                  )}
                />
              </div>

              <div className="space-y-3">
                <div className={cn(
                  "flex items-center justify-between p-4 rounded-xl border-2 backdrop-blur-sm transition-all duration-300 hover:scale-[1.01]",
                  theme === 'light'
                    ? "bg-gray-50/80 border-gray-200"
                    : "bg-zinc-900/50 border-white/5"
                )}>
                  <div>
                    <Label htmlFor="is_public" className="cursor-pointer font-semibold">
                      Public Pod
                    </Label>
                    <p className={cn(
                      "text-xs mt-1",
                      theme === 'light' ? "text-gray-600" : "text-muted-foreground"
                    )}>
                      Anyone can discover and join
                    </p>
                  </div>
                  <Switch
                    id="is_public"
                    checked={formData.is_public}
                    onCheckedChange={(checked) => handleChange({ is_public: checked })}
                  />
                </div>

                <div className={cn(
                  "flex items-center justify-between p-4 rounded-xl border-2 backdrop-blur-sm transition-all duration-300 hover:scale-[1.01]",
                  theme === 'light'
                    ? "bg-gray-50/80 border-gray-200"
                    : "bg-zinc-900/50 border-white/5"
                )}>
                  <div>
                    <Label htmlFor="requires_approval" className="cursor-pointer font-semibold">
                      Require Approval
                    </Label>
                    <p className={cn(
                      "text-xs mt-1",
                      theme === 'light' ? "text-gray-600" : "text-muted-foreground"
                    )}>
                      Review join requests before accepting
                    </p>
                  </div>
                  <Switch
                    id="requires_approval"
                    checked={formData.requires_approval}
                    onCheckedChange={(checked) => handleChange({ requires_approval: checked })}
                  />
                </div>
              </div>
            </>
          )}

          {/* Divider for moderators */}
          {isModerator && !isOwner && (
            <div className={cn(
              "h-px",
              theme === 'light' ? "bg-gray-200" : "bg-white/10"
            )} />
          )}

          {/* Fields both owner and moderator can edit */}
          <div className="space-y-4">
            <div>
              <Label className={cn(
                "text-sm font-semibold mb-2 block",
                theme === 'light' ? "text-gray-900" : "text-white"
              )}>
                Topics
              </Label>
              <div className="flex gap-2">
                <Input
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                  className={cn(
                    "transition-all duration-300 border-2 backdrop-blur-sm",
                    theme === 'light'
                      ? "bg-white/90 border-gray-200 focus:border-emerald-400"
                      : "bg-zinc-900/80 border-white/10 focus:border-emerald-500/50"
                  )}
                  placeholder="Add a topic..."
                />
                <Button
                  type="button"
                  onClick={addTopic}
                  variant="outline"
                  className={cn(
                    "transition-all duration-300 border-2",
                    theme === 'light'
                      ? "border-gray-200 hover:border-emerald-400 hover:bg-emerald-50"
                      : "border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/10"
                  )}
                >
                  Add
                </Button>
              </div>
              {formData.topics.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.topics.map((topic, index) => (
                    <Badge
                      key={index}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 border-2 backdrop-blur-sm transition-all duration-300 hover:scale-105",
                        theme === 'light'
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                      )}
                    >
                      {topic}
                      <button
                        onClick={() => removeTopic(topic)}
                        className="hover:text-emerald-300 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="goals" className={cn(
                "text-sm font-semibold mb-2 block",
                theme === 'light' ? "text-gray-900" : "text-white"
              )}>
                Goals
              </Label>
              <Textarea
                id="goals"
                value={formData.goals}
                onChange={(e) => handleChange({ goals: e.target.value })}
                className={cn(
                  "min-h-[100px] transition-all duration-300 border-2 backdrop-blur-sm",
                  theme === 'light'
                    ? "bg-white/90 border-gray-200 focus:border-emerald-400"
                    : "bg-zinc-900/80 border-white/10 focus:border-emerald-500/50"
                )}
                placeholder="What do you want to achieve?"
              />
            </div>

            <div>
              <Label htmlFor="target_problems" className={cn(
                "text-sm font-semibold mb-2 block",
                theme === 'light' ? "text-gray-900" : "text-white"
              )}>
                Target Problems Count
              </Label>
              <Input
                id="target_problems"
                type="number"
                min={0}
                value={formData.target_problems_count}
                onChange={(e) => handleChange({ target_problems_count: parseInt(e.target.value) || 0 })}
                className={cn(
                  "transition-all duration-300 border-2 backdrop-blur-sm",
                  theme === 'light'
                    ? "bg-white/90 border-gray-200 focus:border-emerald-400"
                    : "bg-zinc-900/80 border-white/10 focus:border-emerald-500/50"
                )}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className={cn(
            "pt-4 border-t-2",
            theme === 'light' ? "border-gray-200/50" : "border-white/10"
          )}>
            <div className="flex items-center justify-between gap-4">
              {/* Delete Button (Owner only) */}
              <div>
                {isOwner && !showDeleteConfirm && (
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="border-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-all duration-300"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Pod
                  </Button>
                )}
                {isOwner && showDeleteConfirm && (
                  <div className="flex gap-2 items-center">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <span className="text-sm font-medium text-red-400">Are you sure?</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDelete}
                      disabled={deleteLoading}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      {deleteLoading ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Yes, Delete"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg blur-md opacity-0 group-hover:opacity-70 transition-all duration-500" />
                <Button
                  onClick={handleSubmit}
                  disabled={loading || deleteLoading || !hasChanges}
                  className={cn(
                    "relative bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 shadow-lg transition-all duration-300",
                    hasChanges ? "animate-pulse-slow" : ""
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                      {hasChanges && <Sparkles className="w-3 h-3 ml-1" />}
                    </>
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
