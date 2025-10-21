"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, X, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { STUDY_SUBJECTS, POD_COLOR_SCHEMES } from "@/types/study-pods";
import type { SkillLevel, CreatePodRequest } from "@/types/study-pods";

interface CreatePodModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (pod: any) => void;
}

export function CreatePodModal({ open, onClose, onSuccess }: CreatePodModalProps) {
  const [loading, setLoading] = useState(false);
  const [currentTopic, setCurrentTopic] = useState("");

  const [formData, setFormData] = useState<CreatePodRequest>({
    name: "",
    description: "",
    subject: "",
    skill_level: "Mixed" as SkillLevel,
    max_members: 6,
    is_public: true,
    requires_approval: false,
    topics: [],
    goals: "",
    color_scheme: "from-green-500 to-emerald-500",
    target_problems_count: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter a pod name");
      return;
    }

    if (!formData.subject) {
      toast.error("Please select a subject");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/study-pods/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to create study pod");
        return;
      }

      toast.success("Study pod created successfully!");
      onSuccess?.(data.pod);
      handleClose();
    } catch (error) {
      console.error("Error creating pod:", error);
      toast.error("Failed to create study pod");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      description: "",
      subject: "",
      skill_level: "Mixed",
      max_members: 6,
      is_public: true,
      requires_approval: false,
      topics: [],
      goals: "",
      color_scheme: "from-green-500 to-emerald-500",
      target_problems_count: 0,
    });
    setCurrentTopic("");
    onClose();
  };

  const addTopic = () => {
    if (currentTopic.trim() && formData.topics.length < 10) {
      setFormData({
        ...formData,
        topics: [...formData.topics, currentTopic.trim()],
      });
      setCurrentTopic("");
    }
  };

  const removeTopic = (index: number) => {
    setFormData({
      ...formData,
      topics: formData.topics.filter((_, i) => i !== index),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-white/5 bg-zinc-950/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-foreground via-emerald-400 to-green-400 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-400" />
            Create Study Pod
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Pod Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Dynamic Programming Masters"
                className="mt-1.5"
                maxLength={100}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What will your pod focus on?"
                className="mt-1.5 min-h-[80px]"
                maxLength={500}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Select
                  value={formData.subject}
                  onValueChange={(value) => setFormData({ ...formData, subject: value })}
                >
                  <SelectTrigger className="mt-1.5">
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

              <div>
                <Label htmlFor="skill_level">Skill Level *</Label>
                <Select
                  value={formData.skill_level}
                  onValueChange={(value) => setFormData({ ...formData, skill_level: value as SkillLevel })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                    <SelectItem value="Mixed">Mixed Levels</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Topics */}
          <div>
            <Label>Topics (Optional)</Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                value={currentTopic}
                onChange={(e) => setCurrentTopic(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTopic())}
                placeholder="Add a topic..."
                maxLength={50}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addTopic}
                disabled={!currentTopic.trim() || formData.topics.length >= 10}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.topics.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.topics.map((topic, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="pl-2 pr-1 py-1 border-emerald-500/20 bg-emerald-500/10"
                  >
                    {topic}
                    <button
                      type="button"
                      onClick={() => removeTopic(idx)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max_members">Max Members</Label>
                <Input
                  id="max_members"
                  type="number"
                  min={2}
                  max={20}
                  value={formData.max_members}
                  onChange={(e) => setFormData({ ...formData, max_members: parseInt(e.target.value) || 2 })}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="target_problems">Target Problems</Label>
                <Input
                  id="target_problems"
                  type="number"
                  min={0}
                  value={formData.target_problems_count}
                  onChange={(e) => setFormData({ ...formData, target_problems_count: parseInt(e.target.value) || 0 })}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="color">Color Theme</Label>
              <Select
                value={formData.color_scheme}
                onValueChange={(value) => setFormData({ ...formData, color_scheme: value })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POD_COLOR_SCHEMES.map((scheme) => (
                    <SelectItem key={scheme.value} value={scheme.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${scheme.value}`} />
                        {scheme.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <Label htmlFor="is_public" className="cursor-pointer">
                  Public Pod
                </Label>
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

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <Label htmlFor="requires_approval" className="cursor-pointer">
                  Require Approval
                </Label>
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

          {/* Goals */}
          <div>
            <Label htmlFor="goals">Pod Goals (Optional)</Label>
            <Textarea
              id="goals"
              value={formData.goals}
              onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
              placeholder="What do you want to achieve together?"
              className="mt-1.5 min-h-[60px]"
              maxLength={300}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border/20">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Pod"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
