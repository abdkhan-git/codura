"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Video, Users, Radio } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface StreamCardProps {
  stream: any;
  className?: string;
}

export function StreamCard({ stream, className }: StreamCardProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const problem = stream.problems;
  const streamer = stream.streamer;
  const tags = problem?.topic_tags || [];
  const difficulty = problem?.difficulty || 'Medium';

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

  const difficultyConfig = getDifficultyConfig(difficulty);

  const handleJoinStream = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/live-streams/${stream.id}`);
  };

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glow effect on hover */}
      <div className={cn(
        "absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 via-violet-500/20 to-purple-500/20 rounded-2xl blur transition-all duration-300",
        isHovered ? "opacity-40" : "opacity-0"
      )} />

      <Card className={cn(
        "relative p-6 border-2 backdrop-blur-xl transition-all duration-300 overflow-hidden",
        theme === 'light'
          ? "bg-white/90 border-gray-200/50 hover:border-purple-500/30"
          : "bg-gradient-to-br from-zinc-950/80 via-zinc-900/50 to-zinc-950/80 border-white/10",
        isHovered
          ? "border-purple-500/30 transform scale-[1.02]"
          : "",
        className
      )}>
        {/* Background patterns */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(168,85,247,0.1),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(139,92,246,0.1),transparent_50%)]" />
        </div>

        {/* Live indicator */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/50 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-semibold text-red-400">LIVE</span>
          </div>
        </div>

        <div className="relative z-10 space-y-4">
          {/* Header */}
          <div className="space-y-2">
            <h3 className={cn(
              "text-xl font-bold line-clamp-2 transition-colors pr-20",
              theme === 'light'
                ? "text-gray-900 group-hover:text-purple-600"
                : "group-hover:text-purple-400"
            )}>
              {problem?.title || 'Untitled Problem'}
            </h3>
          </div>

          {/* Streamer info */}
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8 border-2 border-purple-500/30">
              <AvatarImage src={streamer?.avatar_url || ""} />
              <AvatarFallback className="text-xs bg-gradient-to-br from-purple-500 to-violet-500">
                {streamer?.full_name?.charAt(0) || streamer?.username?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium truncate",
                theme === 'light' ? "text-gray-900" : "text-foreground"
              )}>
                {streamer?.full_name || streamer?.username || 'Anonymous'}
              </p>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge className={cn(
              "border font-semibold",
              difficultyConfig.bg,
              difficultyConfig.text,
              difficultyConfig.border
            )}>
              {difficulty}
            </Badge>
            {tags.slice(0, 2).map((tag: any, idx: number) => (
              <Badge
                key={idx}
                variant="outline"
                className="bg-purple-500/10 text-purple-400 border-purple-500/30 font-semibold"
              >
                {tag.name || tag.slug}
              </Badge>
            ))}
            {tags.length > 2 && (
              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 font-semibold">
                +{tags.length - 2}
              </Badge>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className={cn(
              "flex items-center gap-2 px-2.5 py-1.5 rounded-lg",
              theme === 'light'
                ? "bg-gray-100 border border-gray-200"
                : "bg-zinc-900/50 border border-white/5"
            )}>
              <Users className="w-4 h-4 text-purple-400" />
              <span className={cn(
                "font-medium",
                theme === 'light' ? "text-gray-900" : "text-foreground"
              )}>
                {stream.viewer_count} {stream.viewer_count === 1 ? 'viewer' : 'viewers'}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <div className="relative group/btn">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/30 to-violet-500/30 rounded-lg blur opacity-50 group-hover/btn:opacity-75 transition duration-300" />
              <Button
                size="sm"
                className="relative w-full bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 border-0"
                onClick={handleJoinStream}
              >
                <Video className="w-4 h-4 mr-2" />
                Join Stream
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

