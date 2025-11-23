"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface HostPublicInterviewModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (sessionData: {
    id: string;
    title: string;
    description: string | null;
    endTime: string;
    sessionCode: string;
  }) => void;
}

export function HostPublicInterviewModal({
  open,
  onClose,
  onSuccess,
}: HostPublicInterviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    duration: "15", // in minutes, default to 15
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Please enter a session title");
      return;
    }

    if (!formData.duration) {
      toast.error("Please select a duration");
      return;
    }

    setLoading(true);

    try {
      // Calculate end time based on selected duration
      const durationMinutes = parseInt(formData.duration);
      const endTime = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

      const response = await fetch("/api/mock-interview/public-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          endTime,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to create public session");
        return;
      }

      toast.success("Public interview session created!");
      onSuccess({
        id: data.session.id,
        title: data.session.title,
        description: data.session.description,
        endTime: data.session.endTime,
        sessionCode: data.session.sessionCode,
      });
      handleClose();
    } catch (error) {
      console.error("Error creating public session:", error);
      toast.error("Failed to create public session");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: "",
      description: "",
      duration: "15",
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-brand" />
            Host Public Interview
          </DialogTitle>
          <DialogDescription>
            Create a public interview session that others can join
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="title">Session Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Frontend Interview Practice"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              disabled={loading}
              maxLength={100}
            />
          </div>

          {/* Description Textarea */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe what you'd like to practice..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={loading}
              maxLength={500}
              rows={3}
            />
          </div>

          {/* Duration Select */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration *</Label>
            <Select
              value={formData.duration}
              onValueChange={(value) =>
                setFormData({ ...formData, duration: value })
              }
              disabled={loading}
            >
              <SelectTrigger id="duration">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="20">20 minutes</SelectItem>
                <SelectItem value="25">25 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Session"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
