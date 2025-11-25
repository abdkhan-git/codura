"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Clock, FileText, Heading } from "lucide-react";

interface HostPublicInterviewProps {
  user: {
    name: string;
    email: string;
    avatar: string;
    username?: string;
    user_id?: string;
  };
  onBack: () => void;
  onCreateSession: (sessionData: PublicSessionData) => void;
}

export interface PublicSessionData {
  title: string;
  description: string;
  endTime: string;
  hostUserId: string;
  hostName: string;
}

const DURATION_OPTIONS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
  { value: '180', label: '3 hours' },
  { value: '240', label: '4 hours' },
];

export function HostPublicInterview({ user, onBack, onCreateSession }: HostPublicInterviewProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("60"); // Default 1 hour
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !duration) {
      return;
    }

    setIsCreating(true);

    try {
      // Calculate end time from current time + selected duration
      const now = new Date();
      const endTime = new Date(now.getTime() + parseInt(duration) * 60000); // duration is in minutes

      const sessionData: PublicSessionData = {
        title: title.trim(),
        description: description.trim(),
        endTime: endTime.toISOString(),
        hostUserId: user.user_id || '',
        hostName: user.name,
      };

      onCreateSession(sessionData);
    } catch (error) {
      console.error('Error creating public session:', error);
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Button variant="ghost" className="mb-6 gap-2" onClick={onBack}>
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <Card className="border-2 border-green-500/20 bg-card/50 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
            Host Public Interview
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            Create a public session for others to join
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2 text-base">
                <Heading className="w-4 h-4 text-green-500" />
                Session Title *
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Frontend Developer Mock Interview"
                maxLength={100}
                required
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">
                {title.length}/100 characters
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4 text-green-500" />
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details about the interview focus, your experience level, or what you're looking to practice..."
                maxLength={500}
                rows={4}
                className="text-base resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/500 characters
              </p>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration" className="flex items-center gap-2 text-base">
                <Clock className="w-4 h-4 text-green-500" />
                Availability Duration *
              </Label>
              <select
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-base"
              >
                {DURATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                How long you'll be available for interviews starting now
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <h4 className="font-semibold text-sm mb-2 text-green-500">How it works:</h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• Your session will appear in the public sessions list</li>
                <li>• Users can request to join your session</li>
                <li>• You can approve or deny join requests</li>
                <li>• Your status shows "Available" when open, "Unavailable" when in a session</li>
                <li>• Session automatically closes after the duration expires</li>
              </ul>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!title.trim() || !duration || isCreating}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-500/90 hover:to-emerald-600/90 text-base h-12"
            >
              {isCreating ? "Creating Session..." : "Create Public Session"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
