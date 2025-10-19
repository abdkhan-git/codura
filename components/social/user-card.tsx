"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import Link from "next/link";
import {
  Users,
  MapPin,
  Briefcase,
  GraduationCap,
  Trophy,
  Flame,
  UserPlus,
  UserCheck,
  Clock,
  UserX,
  Shield,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import type { UserSearchResult } from "@/types/database";

interface UserCardProps {
  user: UserSearchResult & { suggestion_reasons?: string[], suggestion_score?: number };
  onConnect?: (userId: string) => void;
  onCancel?: (userId: string) => void;
  onAccept?: (userId: string) => void;
  onDecline?: (userId: string) => void;
  onFeedback?: (userId: string, feedback: 'positive' | 'negative') => void;
  isLoading?: boolean;
  showSuggestionReasons?: boolean;
}

export function UserCard({ user, onConnect, onCancel, onAccept, onDecline, onFeedback, isLoading, showSuggestionReasons }: UserCardProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useState(() => {
    setMounted(true);
  });

  const currentTheme = mounted ? (resolvedTheme || theme) : 'light';

  // Get initials for avatar fallback
  const getInitials = () => {
    if (!user.full_name) return user.username?.[0]?.toUpperCase() || 'U';
    return user.full_name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Render action button based on connection status
  const renderActionButton = () => {
    if (user.connection_status === 'connected') {
      return (
        <Button
          size="sm"
          variant="ghost"
          className={cn(
            "gap-2 transition-all duration-300",
            currentTheme === 'light'
              ? "text-green-600 hover:bg-green-50 hover:text-green-700"
              : "text-green-400 hover:bg-green-500/10 hover:text-green-300"
          )}
          disabled
        >
          <UserCheck className="w-4 h-4" />
          Connected
        </Button>
      );
    }

    if (user.connection_status === 'pending_sent') {
      return (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onCancel?.(user.user_id)}
          disabled={isLoading}
          className={cn(
            "gap-2 transition-all duration-300",
            currentTheme === 'light'
              ? "text-amber-600 hover:bg-amber-50 hover:text-amber-700"
              : "text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
          )}
        >
          <Clock className="w-4 h-4" />
          Pending
        </Button>
      );
    }

    if (user.connection_status === 'pending_received') {
      return (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onAccept?.(user.user_id)}
            disabled={isLoading}
            className={cn(
              "gap-2 bg-gradient-to-r transition-all duration-300 shadow-lg",
              currentTheme === 'light'
                ? "from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-green-500/25"
                : "from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-green-500/25"
            )}
          >
            <UserCheck className="w-4 h-4" />
            Accept
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDecline?.(user.user_id)}
            disabled={isLoading}
            className={cn(
              "transition-all duration-300",
              currentTheme === 'light'
                ? "text-red-600 hover:bg-red-50"
                : "text-red-400 hover:bg-red-500/10"
            )}
          >
            <UserX className="w-4 h-4" />
          </Button>
        </div>
      );
    }

    if (user.connection_status === 'blocked') {
      return (
        <Button size="sm" variant="ghost" disabled className="gap-2 text-muted-foreground">
          <UserX className="w-4 h-4" />
          Blocked
        </Button>
      );
    }

    // Default: not connected
    return (
      <Button
        size="sm"
        onClick={() => onConnect?.(user.user_id)}
        disabled={isLoading}
        className={cn(
          "gap-2 bg-gradient-to-r transition-all duration-300 shadow-lg hover:scale-105",
          currentTheme === 'light'
            ? "from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-blue-500/25"
            : "from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-blue-500/25"
        )}
      >
        <UserPlus className="w-4 h-4" />
        Connect
      </Button>
    );
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-500 hover:scale-[1.02]",
        "border-2 backdrop-blur-xl h-[480px] flex flex-col", // Increased height for better content fit
        currentTheme === 'light'
          ? "bg-white/80 border-black/5 hover:border-blue-500/30 shadow-lg hover:shadow-xl hover:shadow-blue-500/10"
          : "bg-zinc-950/80 border-white/5 hover:border-blue-500/30 shadow-lg hover:shadow-xl hover:shadow-blue-500/20"
      )}
    >
      {/* Liquid glass overlay */}
      <div
        className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
          currentTheme === 'light'
            ? "bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50"
            : "bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5"
        )}
      />

      {/* Underglow effect */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl pointer-events-none -z-10",
        currentTheme === 'light'
          ? "bg-gradient-to-r from-blue-200/50 to-purple-200/50"
          : "bg-gradient-to-r from-blue-500/30 to-purple-500/30"
      )} />

      <div className="relative z-10 p-6 flex flex-col h-full">
        {/* Top Content */}
        <div className="flex-1">
          {/* Header: Avatar + Name + Action */}
          <div className="flex items-start gap-4 mb-4">
          {/* Avatar */}
          <Link href={`/profile/${user.username}`} className="flex-shrink-0 group/avatar">
            <div
              className={cn(
                "w-16 h-16 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-xl overflow-hidden relative transition-all duration-300 group-hover/avatar:scale-110",
                "from-brand to-orange-300 shadow-lg shadow-brand/20 ring-2",
                currentTheme === 'light' ? "ring-white/50" : "ring-zinc-900/50"
              )}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name || user.username || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitials()
              )}
            </div>
          </Link>

          {/* Name + Username */}
          <div className="flex-1 min-w-0">
            <Link href={`/profile/${user.username}`} className="group/name">
              <h3
                className={cn(
                  "font-semibold text-lg truncate transition-colors duration-200",
                  currentTheme === 'light'
                    ? "text-zinc-900 group-hover/name:text-blue-600"
                    : "text-white group-hover/name:text-blue-400"
                )}
              >
                {user.full_name || user.username || 'Anonymous'}
              </h3>
            </Link>
            <p className={cn(
              "text-sm truncate",
              currentTheme === 'light' ? "text-zinc-600" : "text-zinc-400"
            )}>
              @{user.username || 'user'}
            </p>
          </div>

          {/* Action Button */}
          <div className="flex-shrink-0">
            {renderActionButton()}
          </div>
        </div>

        {/* Bio - Always show something for consistent height */}
        <div className="mb-4 min-h-[2.5rem] flex items-center">
          {user.bio && (user.is_public || user.connection_status === 'connected') ? (
            <p className={cn(
              "text-sm line-clamp-2",
              currentTheme === 'light' ? "text-zinc-700" : "text-zinc-300"
            )}>
              {user.bio}
            </p>
          ) : (
            <p className={cn(
              "text-sm italic",
              currentTheme === 'light' ? "text-zinc-400" : "text-zinc-500"
            )}>
              {!user.is_public && user.connection_status !== 'connected' 
                ? "Connect to view bio" 
                : "No bio available"
              }
            </p>
          )}
        </div>

        {/* Private Profile Notice */}
        {!user.is_public && user.connection_status !== 'connected' && (
          <div className={cn(
            "p-3 rounded-lg mb-4 border-2",
            currentTheme === 'light' 
              ? "bg-amber-50 border-amber-200 text-amber-800" 
              : "bg-amber-500/10 border-amber-500/20 text-amber-300"
          )}>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">Private Profile</span>
            </div>
            <p className="text-xs mt-1">
              Connect to view more details
            </p>
          </div>
        )}

        {/* Info Grid - Always show both for consistent height */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* University */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
              currentTheme === 'light'
                ? "bg-blue-100 text-blue-600"
                : "bg-blue-500/10 text-blue-400"
            )}>
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              {user.university && (user.is_public || user.connection_status === 'connected') ? (
                <>
                  <p className={cn(
                    "text-xs font-medium truncate",
                    currentTheme === 'light' ? "text-zinc-900" : "text-white"
                  )}>
                    {user.university}
                  </p>
                  {user.graduation_year && (
                    <p className={cn(
                      "text-xs",
                      currentTheme === 'light' ? "text-zinc-500" : "text-zinc-500"
                    )}>
                      Class of {user.graduation_year}
                    </p>
                  )}
                </>
              ) : (
                <p className={cn(
                  "text-xs italic",
                  currentTheme === 'light' ? "text-zinc-400" : "text-zinc-500"
                )}>
                  {!user.is_public && user.connection_status !== 'connected' 
                    ? "Connect to view" 
                    : "No university"
                  }
                </p>
              )}
            </div>
          </div>

          {/* Job Title */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
              currentTheme === 'light'
                ? "bg-purple-100 text-purple-600"
                : "bg-purple-500/10 text-purple-400"
            )}>
              <Briefcase className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              {user.job_title && (user.is_public || user.connection_status === 'connected') ? (
                <p className={cn(
                  "text-xs font-medium truncate",
                  currentTheme === 'light' ? "text-zinc-900" : "text-white"
                )}>
                  {user.job_title}
                </p>
              ) : (
                <p className={cn(
                  "text-xs italic",
                  currentTheme === 'light' ? "text-zinc-400" : "text-zinc-500"
                )}>
                  {!user.is_public && user.connection_status !== 'connected' 
                    ? "Connect to view" 
                    : "No job title"
                  }
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className={cn(
          "flex items-center justify-between pt-4 border-t",
          currentTheme === 'light' ? "border-zinc-200" : "border-zinc-800"
        )}>
          {/* Problems Solved */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              currentTheme === 'light'
                ? "bg-green-100 text-green-600"
                : "bg-green-500/10 text-green-400"
            )}>
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <p className={cn(
                "text-sm font-semibold",
                currentTheme === 'light' ? "text-zinc-900" : "text-white"
              )}>
                {user.is_public || user.connection_status === 'connected' ? user.total_solved : '***'}
              </p>
              <p className={cn(
                "text-xs",
                currentTheme === 'light' ? "text-zinc-500" : "text-zinc-500"
              )}>
                Solved
              </p>
            </div>
          </div>

          {/* Current Streak */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              currentTheme === 'light'
                ? "bg-orange-100 text-orange-600"
                : "bg-orange-500/10 text-orange-400"
            )}>
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <p className={cn(
                "text-sm font-semibold",
                currentTheme === 'light' ? "text-zinc-900" : "text-white"
              )}>
                {user.is_public || user.connection_status === 'connected' ? user.current_streak : '***'}
              </p>
              <p className={cn(
                "text-xs",
                currentTheme === 'light' ? "text-zinc-500" : "text-zinc-500"
              )}>
                Streak
              </p>
            </div>
          </div>

          {/* Mutual Connections */}
          {user.mutual_connections_count > 0 && (
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                currentTheme === 'light'
                  ? "bg-indigo-100 text-indigo-600"
                  : "bg-indigo-500/10 text-indigo-400"
              )}>
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className={cn(
                  "text-sm font-semibold",
                  currentTheme === 'light' ? "text-zinc-900" : "text-white"
                )}>
                  {user.mutual_connections_count}
                </p>
                <p className={cn(
                  "text-xs",
                  currentTheme === 'light' ? "text-zinc-500" : "text-zinc-500"
                )}>
                  Mutual
                </p>
              </div>
            </div>
          )}
        </div>


        </div>

        {/* Bottom Content - Always visible for suggestions */}
        {showSuggestionReasons && (
          <div className="mt-4 pt-4 border-t">
            {/* Suggestion Reasons - Fixed height with scroll */}
            {user.suggestion_reasons && user.suggestion_reasons.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className={cn(
                    "w-4 h-4",
                    currentTheme === 'light' ? "text-purple-500" : "text-purple-400"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    currentTheme === 'light' ? "text-zinc-700" : "text-zinc-300"
                  )}>
                    Why suggested
                  </span>
                </div>
                <div className={cn(
                  "flex flex-wrap gap-1 max-h-16 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 scrollbar-track-transparent",
                  currentTheme === 'light' 
                    ? "scrollbar-thumb-zinc-300" 
                    : "scrollbar-thumb-zinc-600"
                )}>
                  {user.suggestion_reasons.map((reason, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className={cn(
                        "text-xs px-2 py-1 flex-shrink-0",
                        currentTheme === 'light' 
                          ? "bg-purple-100 text-purple-700 hover:bg-purple-200" 
                          : "bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
                      )}
                    >
                      {reason}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback Buttons - Always show for suggestions */}
            {onFeedback && (
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-xs",
                  currentTheme === 'light' ? "text-zinc-500" : "text-zinc-400"
                )}>
                  Help us improve suggestions
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onFeedback(user.user_id, 'positive')}
                    className={cn(
                      "h-8 w-8 p-0",
                      currentTheme === 'light' 
                        ? "hover:bg-green-100 text-green-600" 
                        : "hover:bg-green-500/10 text-green-400"
                    )}
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onFeedback(user.user_id, 'negative')}
                    className={cn(
                      "h-8 w-8 p-0",
                      currentTheme === 'light' 
                        ? "hover:bg-red-100 text-red-600" 
                        : "hover:bg-red-500/10 text-red-400"
                    )}
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
