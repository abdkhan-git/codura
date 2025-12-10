"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Users, Radio, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface StreamDescriptionProps {
  problem: {
    title: string;
    difficulty: string;
    topic_tags: Array<{ name: string; slug: string }>;
  } | null;
  streamer: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
  } | null;
  viewerCount: number;
  startedAt: string;
}

export function StreamDescription({
  problem,
  streamer,
  viewerCount,
  startedAt,
}: StreamDescriptionProps) {
  const { theme } = useTheme();

  const getDifficultyConfig = (diff: string) => {
    switch (diff) {
      case "Easy":
        return {
          bg: "bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-green-500/10",
          text: "text-green-400",
          border: "border-green-500/30",
        };
      case "Medium":
        return {
          bg: "bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10",
          text: "text-yellow-400",
          border: "border-yellow-500/30",
        };
      case "Hard":
        return {
          bg: "bg-gradient-to-r from-red-500/10 via-rose-500/10 to-red-500/10",
          text: "text-red-400",
          border: "border-red-500/30",
        };
      default:
        return {
          bg: "bg-muted/10",
          text: "text-muted-foreground",
          border: "border-white/10",
        };
    }
  };

  const difficultyConfig = problem ? getDifficultyConfig(problem.difficulty) : null;
  const streamDuration = formatDistanceToNow(new Date(startedAt), { addSuffix: false });

  return (
    <div className={cn(
      "p-4 rounded-lg border-2",
      theme === 'light'
        ? "bg-white/80 border-gray-200"
        : "bg-zinc-950/50 border-white/10"
    )}>
      <div className="space-y-4">
        {/* Title and Streamer */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className={cn(
              "text-2xl font-bold mb-2 line-clamp-2",
              theme === 'light' ? "text-gray-900" : "text-foreground"
            )}>
              {problem?.title || 'Untitled Problem'}
            </h1>
            {streamer && (
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6 border border-purple-500/30">
                  <AvatarImage src={streamer.avatar_url || ""} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-purple-500 to-violet-500">
                    {streamer.full_name?.charAt(0) || streamer.username?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className={cn(
                  "text-sm font-medium",
                  theme === 'light' ? "text-gray-700" : "text-muted-foreground"
                )}>
                  {streamer.full_name || streamer.username || 'Anonymous'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tags and Stats */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Difficulty Badge */}
          {problem && difficultyConfig && (
            <Badge className={cn(
              "border font-semibold",
              difficultyConfig.bg,
              difficultyConfig.text,
              difficultyConfig.border
            )}>
              {problem.difficulty}
            </Badge>
          )}

          {/* Problem Tags */}
          {problem?.topic_tags?.slice(0, 4).map((tag, idx) => (
            <Badge
              key={idx}
              variant="outline"
              className="bg-purple-500/10 text-purple-400 border-purple-500/30 font-semibold"
            >
              {tag.name || tag.slug}
            </Badge>
          ))}

          {/* Viewer Count */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full",
            theme === 'light'
              ? "bg-red-50 border border-red-200"
              : "bg-red-500/20 border border-red-500/30"
          )}>
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <Users className="w-4 h-4 text-red-400" />
            <span className={cn(
              "text-sm font-semibold",
              theme === 'light' ? "text-red-700" : "text-red-400"
            )}>
              {viewerCount} {viewerCount === 1 ? 'viewer' : 'viewers'}
            </span>
          </div>

          {/* Stream Duration */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full",
            theme === 'light'
              ? "bg-gray-100 border border-gray-200"
              : "bg-zinc-900/50 border border-white/5"
          )}>
            <Clock className="w-4 h-4 text-purple-400" />
            <span className={cn(
              "text-sm font-medium",
              theme === 'light' ? "text-gray-700" : "text-muted-foreground"
            )}>
              Live for {streamDuration}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

