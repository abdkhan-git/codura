"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Loader2, Settings, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { STUDY_SUBJECTS } from "@/types/study-pods";

interface EditPodModalProps {
  isOpen: boolean;
  onClose: () => void;
  pod: any;
  userRole: 'owner' | 'moderator' | 'member' | null;
  onSuccess?: () => void;
}

export function EditPodModal({ isOpen, onClose, pod, userRole, onSuccess }: EditPodModalProps) {
  const isOwner = userRole === 'owner';
  const isModerator = userRole === 'moderator';
  const canEdit = isOwner || isModerator;

  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form state - Owner can edit all, Moderator can edit some
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
    if (pod && isOpen) {
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
    }
  }, [pod, isOpen]);

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
      // Check if reducing max_members below current count
      if (formData.max_members < (pod.current_member_count || 0)) {
        toast.error(`Cannot set max members below current member count (${pod.current_member_count})`);
        return;
      }
    }

    setLoading(true);

    try {
      // Build update object based on role
      const updates: any = {};

      if (isOwner) {
        // Owner can update everything
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
        // Moderator can only update these fields
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
      onSuccess?.();
      onClose();
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
      onSuccess?.();
      onClose();
      // Redirect to study pods page
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
      setFormData(prev => ({
        ...prev,
        topics: [...prev.topics, topicInput.trim()],
      }));
      setTopicInput("");
    }
  };

  const removeTopic = (topic: string) => {
    setFormData(prev => ({
      ...prev,
      topics: prev.topics.filter(t => t !== topic),
    }));
  };

  if (!canEdit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-zinc-950 border-2 border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="w-5 h-5 text-emerald-500" />
            Edit Study Pod
            {isModerator && !isOwner && (
              <span className="text-xs text-muted-foreground font-normal ml-2">
                (Moderator - Limited Access)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Owner-only fields */}
          {isOwner && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Pod Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-zinc-900 border-white/10"
                  placeholder="e.g., Dynamic Programming Masters"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-zinc-900 border-white/10 min-h-[80px]"
                  placeholder="What's this pod about?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Select
                    value={formData.subject}
                    onValueChange={(value) => setFormData({ ...formData, subject: value })}
                  >
                    <SelectTrigger className="bg-zinc-900 border-white/10">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {STUDY_SUBJECTS.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skill_level">Skill Level *</Label>
                  <Select
                    value={formData.skill_level}
                    onValueChange={(value) => setFormData({ ...formData, skill_level: value })}
                  >
                    <SelectTrigger className="bg-zinc-900 border-white/10">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                      <SelectItem value="Mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_members">
                  Max Members *
                  <span className="text-xs text-muted-foreground ml-2">
                    (Current: {pod.current_member_count || 0})
                  </span>
                </Label>
                <Input
                  id="max_members"
                  type="number"
                  min={pod.current_member_count || 2}
                  max={20}
                  value={formData.max_members}
                  onChange={(e) => setFormData({ ...formData, max_members: parseInt(e.target.value) || 2 })}
                  className="bg-zinc-900 border-white/10"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-white/5">
                  <div>
                    <Label htmlFor="is_public" className="cursor-pointer">Public Pod</Label>
                    <p className="text-xs text-muted-foreground">
                      Anyone can discover and join
                    </p>
                  </div>
                  <Switch
                    id="is_public"
                    checked={formData.is_public}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-white/5">
                  <div>
                    <Label htmlFor="requires_approval" className="cursor-pointer">Require Approval</Label>
                    <p className="text-xs text-muted-foreground">
                      Review join requests before accepting
                    </p>
                  </div>
                  <Switch
                    id="requires_approval"
                    checked={formData.requires_approval}
                    onCheckedChange={(checked) => setFormData({ ...formData, requires_approval: checked })}
                  />
                </div>
              </div>
            </>
          )}

          {/* Fields both owner and moderator can edit */}
          <div className="space-y-2">
            <Label>Topics</Label>
            <div className="flex gap-2">
              <Input
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                className="bg-zinc-900 border-white/10"
                placeholder="Add a topic..."
              />
              <Button type="button" onClick={addTopic} variant="outline">
                Add
              </Button>
            </div>
            {formData.topics.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.topics.map((topic, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-sm"
                  >
                    {topic}
                    <button
                      onClick={() => removeTopic(topic)}
                      className="hover:text-emerald-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="goals">Goals</Label>
            <Textarea
              id="goals"
              value={formData.goals}
              onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
              className="bg-zinc-900 border-white/10 min-h-[80px]"
              placeholder="What do you want to achieve?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_problems">Target Problems Count</Label>
            <Input
              id="target_problems"
              type="number"
              min={0}
              value={formData.target_problems_count}
              onChange={(e) => setFormData({ ...formData, target_problems_count: parseInt(e.target.value) || 0 })}
              className="bg-zinc-900 border-white/10"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-between">
          <div>
            {isOwner && !showDeleteConfirm && (
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="border-red-500/20 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Pod
              </Button>
            )}
            {isOwner && showDeleteConfirm && (
              <div className="flex gap-2 items-center">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400">Are you sure?</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                >
                  {deleteLoading ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    "Yes, Delete"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading || deleteLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || deleteLoading}
              className="bg-gradient-to-r from-green-500 to-emerald-500"
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
      </DialogContent>
    </Dialog>
  );
}
