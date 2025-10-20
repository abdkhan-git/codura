"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Users,
  Clock,
  Calendar,
  Lock,
  CheckCircle2,
  Loader2,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { StudyPod } from "@/types/study-pods";

interface PodCardProps {
  pod: any; // Will be StudyPodWithMembers in production
  onJoin?: (podId: string) => void;
  className?: string;
}

export function PodCard({ pod, onJoin, className }: PodCardProps) {
  const [joining, setJoining] = useState(false);

  const handleJoin = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!onJoin) return;

    setJoining(true);
    try {
      await onJoin(pod.id);
    } finally {
      setJoining(false);
    }
  };

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case "Beginner":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "Intermediate":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Advanced":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "Mixed":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      default:
        return "bg-muted";
    }
  };

  const isFull = pod.current_member_count >= pod.max_members;
  const spotsFilled = `${pod.current_member_count}/${pod.max_members}`;

  return (
    <Link href={`/study-pods/${pod.id}`}>
      <Card
        className={cn(
          "group relative p-6 border-2 backdrop-blur-xl transition-all duration-300",
          "bg-zinc-950/80 border-white/5 hover:border-emerald-500/30",
          "hover:scale-[1.02] hover:shadow-xl",
          className
        )}
      >
        {/* Gradient overlay */}
        <div
          className={cn(
            "absolute inset-0 rounded-xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
            pod.color_scheme || "from-green-500/5 via-emerald-500/5 to-transparent"
          )}
        />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-foreground mb-1 line-clamp-1 group-hover:text-emerald-400 transition-colors">
                {pod.name}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {pod.description || "No description provided"}
              </p>
            </div>

            {!pod.is_public && (
              <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
          </div>

          {/* Subject and Skill Level */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge
              variant="outline"
              className="border-2 bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            >
              {pod.subject}
            </Badge>
            <Badge
              variant="outline"
              className={cn("border-2", getSkillLevelColor(pod.skill_level))}
            >
              {pod.skill_level}
            </Badge>
          </div>

          {/* Topics */}
          {pod.topics && pod.topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {pod.topics.slice(0, 3).map((topic: string, idx: number) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-1 rounded-md bg-muted/30 text-muted-foreground"
                >
                  {topic}
                </span>
              ))}
              {pod.topics.length > 3 && (
                <span className="text-xs px-2 py-1 rounded-md bg-muted/30 text-muted-foreground">
                  +{pod.topics.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span className={isFull ? "text-orange-400" : ""}>
                {spotsFilled}
              </span>
            </div>
            {pod.total_sessions > 0 && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>{pod.total_sessions} sessions</span>
              </div>
            )}
            {pod.next_session_at && (
              <div className="flex items-center gap-1.5 text-emerald-400">
                <Clock className="w-4 h-4" />
                <span>Upcoming</span>
              </div>
            )}
          </div>

          {/* Members Preview */}
          {pod.members_preview && pod.members_preview.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex -space-x-2">
                {pod.members_preview.map((member: any, idx: number) => (
                  <Avatar
                    key={idx}
                    className="w-8 h-8 border-2 border-background"
                  >
                    <AvatarImage src={member.avatar_url || ""} />
                    <AvatarFallback className="text-xs bg-gradient-to-br from-brand to-purple-600">
                      {member.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {pod.current_member_count > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{pod.current_member_count - 3} more
                </span>
              )}
            </div>
          )}

          {/* Action Button */}
          {pod.is_member ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
              onClick={(e) => e.preventDefault()}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Joined
            </Button>
          ) : isFull ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled
              onClick={(e) => e.preventDefault()}
            >
              Pod Full
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              onClick={handleJoin}
              disabled={joining}
            >
              {joining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {pod.requires_approval ? "Request to Join" : "Join Pod"}
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </Link>
  );
}
