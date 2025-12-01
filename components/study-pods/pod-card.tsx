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
import { ManagePodModal } from "./manage-pod-modal";

interface PodCardProps {
  pod: any; // Will be StudyPodWithMembers in production
  onJoin?: (podId: string) => void;
  onRefresh?: () => void;
  className?: string;
}

export function PodCard({ pod, onJoin, onRefresh, className }: PodCardProps) {
  const { theme } = useTheme();
  const [joining, setJoining] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

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
    <>
      <Link href={`/study-pods/${pod.id}`}>
      <div
        className="relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Outer glow effect on hover */}
        <div className={cn(
          "absolute -inset-1 bg-gradient-to-r from-emerald-500/30 via-cyan-500/30 to-emerald-500/30 rounded-2xl blur-xl transition-all duration-500",
          isHovered ? "opacity-60" : "opacity-0"
        )} />

        <Card className={cn(
          "relative p-6 border-2 backdrop-blur-xl transition-all duration-500 overflow-hidden flex flex-col h-[520px]",
          theme === 'light'
            ? "bg-white/90 border-gray-200/50 hover:border-emerald-500/40 hover:shadow-2xl hover:shadow-emerald-500/20"
            : "bg-gradient-to-br from-zinc-950/80 via-zinc-900/50 to-zinc-950/80 border-white/10 hover:shadow-2xl hover:shadow-emerald-500/20",
          isHovered
            ? "border-emerald-500/40 transform scale-[1.02] shadow-2xl"
            : "",
          className
        )}>
          {/* Glassmorphic shine background patterns */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Radial gradients */}
            <div className="absolute inset-0 opacity-40">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.15),transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(6,182,212,0.15),transparent_50%)]" />
            </div>

            {/* Animated gloss shine effect on hover */}
            <div className={cn(
              "absolute inset-0 opacity-0 transition-opacity duration-700",
              isHovered && "opacity-100"
            )}>
              <div className="absolute -inset-full bg-gradient-to-br from-transparent via-white/10 to-transparent rotate-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000 ease-in-out" />
            </div>

            {/* Glassmorphic grid pattern */}
            <div className={cn(
              "absolute inset-0 opacity-0 transition-opacity duration-500",
              isHovered && "opacity-30",
              theme === 'light' ? "bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)]" : "bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)]"
            )} style={{ backgroundSize: '20px 20px' }} />
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
            <div className="flex flex-wrap gap-2 min-h-[32px] items-start">
              <Badge className={cn(
                "border font-semibold backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg",
                skillConfig.bg,
                skillConfig.text,
                skillConfig.border
              )}>
                <span className="mr-1.5">{skillConfig.icon}</span>
                {pod.skill_level}
              </Badge>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-semibold backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/20">
                {pod.subject}
              </Badge>
              {isOwner && (
                <Badge className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 text-amber-400 border border-amber-500/30 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:from-amber-500/20 hover:to-yellow-500/20 hover:shadow-lg hover:shadow-amber-500/20">
                  <Crown className="w-3 h-3 mr-1" />
                  Owner
                </Badge>
              )}
              {isModerator && (
                <Badge className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-400 border border-blue-500/30 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:from-blue-500/20 hover:to-cyan-500/20 hover:shadow-lg hover:shadow-blue-500/20">
                  <ShieldIcon className="w-3 h-3 mr-1" />
                  Mod
                </Badge>
              )}
            </div>

            {/* Topics - always show for consistent height */}
            <div className="flex flex-wrap gap-1.5 min-h-[32px]">
              {pod.topics && pod.topics.length > 0 ? (
                <>
                  {pod.topics.slice(0, 3).map((topic: string, idx: number) => (
                    <span
                      key={idx}
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-full transition-all duration-300 hover:border-emerald-500/40 hover:text-emerald-400 hover:scale-105 backdrop-blur-sm hover:shadow-md",
                        theme === 'light'
                          ? "bg-gray-100/80 border border-gray-200 text-gray-600 hover:bg-gray-100"
                          : "bg-zinc-900/50 border border-white/5 text-muted-foreground hover:bg-zinc-900/70"
                      )}
                    >
                      {topic}
                    </span>
                  ))}
                  {pod.topics.length > 3 && (
                    <span className={cn(
                      "text-xs px-2.5 py-1 rounded-full backdrop-blur-sm",
                      theme === 'light'
                        ? "bg-gray-100/80 border border-gray-200 text-gray-600"
                        : "bg-zinc-900/50 border border-white/5 text-muted-foreground"
                    )}>
                      +{pod.topics.length - 3} more
                    </span>
                  )}
                </>
              ) : (
                <span className={cn(
                  "text-xs px-2.5 py-1 rounded-full backdrop-blur-sm",
                  theme === 'light'
                    ? "bg-gray-100/80 border border-gray-200 text-gray-500"
                    : "bg-zinc-900/50 border border-white/5 text-muted-foreground/70"
                )}>
                  General topics
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className={cn(
                "flex items-center gap-2 px-2.5 py-1.5 rounded-lg backdrop-blur-sm transition-all duration-300 hover:scale-105",
                theme === 'light'
                  ? "bg-gray-100/80 border border-gray-200 hover:shadow-md"
                  : "bg-zinc-900/50 border border-white/5 hover:bg-zinc-900/70 hover:shadow-md"
              )}>
                <Users className="w-4 h-4 text-emerald-400" />
                <span className={cn(
                  "font-medium",
                  isFull ? "text-orange-400" : theme === 'light' ? "text-gray-900" : "text-foreground"
                )}>
                  {spotsFilled}
                </span>
              </div>

              {/* Always show sessions stat for alignment */}
              <div className={cn(
                "flex items-center gap-2 px-2.5 py-1.5 rounded-lg backdrop-blur-sm transition-all duration-300 hover:scale-105",
                theme === 'light'
                  ? "bg-gray-100/80 border border-gray-200 hover:shadow-md"
                  : "bg-zinc-900/50 border border-white/5 hover:bg-zinc-900/70 hover:shadow-md"
              )}>
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span className={theme === 'light' ? "text-gray-600" : "text-muted-foreground"}>
                  {pod.total_sessions || 0} {pod.total_sessions === 1 ? "session" : "sessions"}
                </span>
              </div>

              {/* Session status badge - always show for alignment */}
              {pod.next_session_at ? (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/20">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 text-xs font-semibold">Upcoming</span>
                </div>
              ) : (
                <div className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-lg backdrop-blur-sm transition-all duration-300 hover:scale-105",
                  theme === 'light'
                    ? "bg-gray-100/80 border border-gray-200 hover:shadow-md"
                    : "bg-zinc-900/50 border border-white/5 hover:bg-zinc-900/70 hover:shadow-md"
                )}>
                  <Clock className="w-4 h-4 text-muted-foreground/50" />
                  <span className={cn("text-xs", theme === 'light' ? "text-gray-500" : "text-muted-foreground/70")}>
                    No sessions
                  </span>
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
                "relative h-2.5 rounded-full overflow-hidden backdrop-blur-sm",
                theme === 'light'
                  ? "bg-gray-200/80 border border-gray-300"
                  : "bg-zinc-900/50 border border-white/5"
              )}>
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full transition-all duration-500 shadow-lg",
                    fillPercentage >= 90
                      ? "bg-gradient-to-r from-orange-500 via-amber-400 to-orange-300 shadow-orange-500/50"
                      : "bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-500 shadow-emerald-500/50"
                  )}
                  style={{ width: `${fillPercentage}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                </div>
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
            <div className="pt-2 mt-auto">
              {isOwner ? (
                <div className="relative group/btn">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/40 to-yellow-500/40 rounded-lg blur-md opacity-0 group-hover/btn:opacity-70 transition-all duration-500" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="relative w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/20 bg-amber-500/5 backdrop-blur-sm transition-all duration-300 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/20 hover:scale-[1.02]"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowManageModal(true);
                    }}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Pod
                  </Button>
                </div>
              ) : pod.is_member ? (
                <div className="relative group/btn">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/40 to-cyan-500/40 rounded-lg blur-md opacity-30 group-hover/btn:opacity-60 transition-all duration-500" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="relative w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.02]"
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
                  className="w-full border-white/10 opacity-50 cursor-not-allowed backdrop-blur-sm"
                  disabled
                  onClick={(e) => e.preventDefault()}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Pod Full
                </Button>
              ) : (
                <div className="relative group/btn">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg blur-md opacity-60 group-hover/btn:opacity-100 transition-all duration-500" />
                  <Button
                    size="sm"
                    className="relative w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 border-0 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-300 hover:scale-[1.02] font-semibold"
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

      {/* Manage Pod Modal */}
      {isOwner && (
        <ManagePodModal
          isOpen={showManageModal}
          onClose={() => setShowManageModal(false)}
          podId={pod.id}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
}
