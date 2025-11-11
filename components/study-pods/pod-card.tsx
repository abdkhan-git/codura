"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  Users,
  Clock,
  Calendar,
  CheckCircle2,
  Loader2,
  Settings,
  Lock as LockIcon,
  Plus,
  Star as Crown,
  Shield as ShieldIcon,
  Sparkles,
  TrendingUp,
  Target,
} from "lucide-react";
import Link from "next/link";

interface PodCardProps {
  pod: any; // Will be StudyPodWithMembers in production
  onJoin?: (podId: string) => void;
  className?: string;
}

export function PodCard({ pod, onJoin, className }: PodCardProps) {
  const { theme } = useTheme();
  const [joining, setJoining] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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

  const getSkillLevelConfig = (level: string) => {
    switch (level) {
      case "Beginner":
        return {
          bg: "bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-green-500/10",
          text: "text-green-400",
          border: "border-green-500/30",
          icon: "🌱"
        };
      case "Intermediate":
        return {
          bg: "bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10",
          text: "text-blue-400",
          border: "border-blue-500/30",
          icon: "📈"
        };
      case "Advanced":
        return {
          bg: "bg-gradient-to-r from-purple-500/10 via-violet-500/10 to-purple-500/10",
          text: "text-purple-400",
          border: "border-purple-500/30",
          icon: "🚀"
        };
      case "Mixed":
        return {
          bg: "bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10",
          text: "text-orange-400",
          border: "border-orange-500/30",
          icon: "🌈"
        };
      default:
        return {
          bg: "bg-muted/10",
          text: "text-muted-foreground",
          border: "border-white/10",
          icon: "📚"
        };
    }
  };

  const isFull = pod.current_member_count >= pod.max_members;
  const spotsFilled = `${pod.current_member_count}/${pod.max_members}`;
  const fillPercentage = (pod.current_member_count / pod.max_members) * 100;

  // Check if user is owner or moderator
  const userRole = pod.user_role || pod.members?.find((m: any) => m.user_id === pod.current_user_id)?.role;
  const isOwner = userRole === 'owner';
  const isModerator = userRole === 'moderator';

  const skillConfig = getSkillLevelConfig(pod.skill_level);

  return (
    <Link href={`/study-pods/${pod.id}`}>
      <div
        className="relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Glow effect on hover */}
        <div className={cn(
          "absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20 rounded-2xl blur transition-all duration-300",
          isHovered ? "opacity-40" : "opacity-0"
        )} />

        <Card className={cn(
          "relative p-6 border-2 backdrop-blur-xl transition-all duration-300 overflow-hidden",
          theme === 'light'
            ? "bg-white/90 border-gray-200/50 hover:border-emerald-500/30"
            : "bg-gradient-to-br from-zinc-950/80 via-zinc-900/50 to-zinc-950/80 border-white/10",
          isHovered
            ? "border-emerald-500/30 transform scale-[1.02]"
            : "",
          className
        )}>
          {/* Background patterns */}
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.1),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(6,182,212,0.1),transparent_50%)]" />
          </div>

          {/* Private badge */}
          {!pod.is_public && (
            <div className={cn(
              "absolute top-4 right-4 p-1.5 rounded-lg backdrop-blur-sm",
              theme === 'light'
                ? "bg-gray-100/80 border border-gray-200/50"
                : "bg-zinc-900/80 border border-white/10"
            )}>
              <LockIcon className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          )}

          <div className="relative z-10 space-y-4">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    "text-xl font-bold line-clamp-1 transition-colors",
                    theme === 'light'
                      ? "text-gray-900 group-hover:text-emerald-600"
                      : "group-hover:text-emerald-400"
                  )}>
                    {pod.name}
                  </h3>
                  <p className={cn(
                    "text-sm line-clamp-2 leading-relaxed mt-1",
                    theme === 'light' ? "text-gray-600" : "text-muted-foreground"
                  )}>
                    {pod.description || "No description provided"}
                  </p>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge className={cn(
                "border font-semibold",
                skillConfig.bg,
                skillConfig.text,
                skillConfig.border
              )}>
                <span className="mr-1.5">{skillConfig.icon}</span>
                {pod.skill_level}
              </Badge>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-semibold">
                {pod.subject}
              </Badge>
              {isOwner && (
                <Badge className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 text-amber-400 border border-amber-500/30">
                  <Crown className="w-3 h-3 mr-1" />
                  Owner
                </Badge>
              )}
              {isModerator && (
                <Badge className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-400 border border-blue-500/30">
                  <ShieldIcon className="w-3 h-3 mr-1" />
                  Mod
                </Badge>
              )}
            </div>

            {/* Topics */}
            {pod.topics && pod.topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {pod.topics.slice(0, 3).map((topic: string, idx: number) => (
                  <span
                    key={idx}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full transition-colors hover:border-emerald-500/30 hover:text-emerald-400",
                      theme === 'light'
                        ? "bg-gray-100 border border-gray-200 text-gray-600"
                        : "bg-zinc-900/50 border border-white/5 text-muted-foreground"
                    )}
                  >
                    {topic}
                  </span>
                ))}
                {pod.topics.length > 3 && (
                  <span className={cn(
                    "text-xs px-2.5 py-1 rounded-full",
                    theme === 'light'
                      ? "bg-gray-100 border border-gray-200 text-gray-600"
                      : "bg-zinc-900/50 border border-white/5 text-muted-foreground"
                  )}>
                    +{pod.topics.length - 3} more
                  </span>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className={cn(
                "flex items-center gap-2 px-2.5 py-1.5 rounded-lg",
                theme === 'light'
                  ? "bg-gray-100 border border-gray-200"
                  : "bg-zinc-900/50 border border-white/5"
              )}>
                <Users className="w-4 h-4 text-emerald-400" />
                <span className={cn(
                  "font-medium",
                  isFull ? "text-orange-400" : theme === 'light' ? "text-gray-900" : "text-foreground"
                )}>
                  {spotsFilled}
                </span>
              </div>

              {pod.total_sessions > 0 && (
                <div className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-lg",
                  theme === 'light'
                    ? "bg-gray-100 border border-gray-200"
                    : "bg-zinc-900/50 border border-white/5"
                )}>
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <span className={theme === 'light' ? "text-gray-600" : "text-muted-foreground"}>{pod.total_sessions}</span>
                </div>
              )}

              {pod.next_session_at && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 text-xs font-semibold">Upcoming</span>
                </div>
              )}
            </div>

            {/* Capacity progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className={theme === 'light' ? "text-gray-600" : "text-muted-foreground"}>Pod Capacity</span>
                <span className={cn(
                  "font-semibold",
                  fillPercentage >= 90 ? "text-orange-400" : "text-emerald-400"
                )}>
                  {fillPercentage.toFixed(0)}%
                </span>
              </div>
              <div className={cn(
                "relative h-2 rounded-full overflow-hidden",
                theme === 'light'
                  ? "bg-gray-200 border border-gray-300"
                  : "bg-zinc-900/50 border border-white/5"
              )}>
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                    fillPercentage >= 90
                      ? "bg-gradient-to-r from-brand to-orange-300"
                      : "bg-gradient-to-r from-emerald-500 to-cyan-500"
                  )}
                  style={{ width: `${fillPercentage}%` }}
                />
              </div>
            </div>

            {/* Members Preview */}
            {pod.members_preview && pod.members_preview.length > 0 && (
              <div className={cn(
                "flex items-center gap-3 pt-2 border-t",
                theme === 'light' ? "border-gray-200" : "border-white/5"
              )}>
                <div className="flex -space-x-2">
                  {pod.members_preview.slice(0, 4).map((member: any, idx: number) => (
                    <Avatar
                      key={idx}
                      className={cn(
                        "w-8 h-8 border-2 ring-1",
                        theme === 'light'
                          ? "border-white ring-gray-200"
                          : "border-zinc-950 ring-white/10"
                      )}
                    >
                      <AvatarImage src={member.avatar_url || ""} />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-brand to-orange-300">
                        {member.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-xs",
                    theme === 'light' ? "text-gray-600" : "text-muted-foreground"
                  )}>
                    {pod.current_member_count > 4 && `+${pod.current_member_count - 4} more `}
                    {pod.current_member_count === 1 ? "member" : "members"}
                  </p>
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="pt-2">
              {isOwner ? (
                <div className="relative group/btn">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/30 to-yellow-500/30 rounded-lg blur opacity-0 group-hover/btn:opacity-50 transition duration-300" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="relative w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10 bg-amber-500/5"
                    onClick={(e) => e.preventDefault()}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Pod
                  </Button>
                </div>
              ) : pod.is_member ? (
                <div className="relative group/btn">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 rounded-lg blur opacity-30 group-hover/btn:opacity-50 transition duration-300" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="relative w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 bg-emerald-500/5"
                    onClick={(e) => e.preventDefault()}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Member
                  </Button>
                </div>
              ) : isFull ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-white/10 opacity-50 cursor-not-allowed"
                  disabled
                  onClick={(e) => e.preventDefault()}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Pod Full
                </Button>
              ) : (
                <div className="relative group/btn">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg blur opacity-50 group-hover/btn:opacity-75 transition duration-300" />
                  <Button
                    size="sm"
                    className="relative w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 border-0"
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
                        <Plus className="w-4 h-4 mr-2" />
                        {pod.requires_approval ? "Request to Join" : "Join Pod"}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </Link>
  );
}
