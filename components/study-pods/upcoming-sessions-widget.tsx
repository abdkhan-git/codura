"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  Calendar,
  Clock,
  Users,
  BookOpen,
  Code2,
  MessageSquare,
  Lightbulb,
  Radio,
  ArrowRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface Session {
  id: string;
  pod_id: string;
  title: string;
  session_type: string;
  scheduled_at: string;
  status: string;
  host: {
    user_id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };
  pod: {
    name: string;
    color_scheme: string;
  };
  attendance_count: number;
}

interface UpcomingSessionsWidgetProps {
  limit?: number;
  className?: string;
}

const SESSION_TYPE_CONFIG: Record<string, any> = {
  study: {
    icon: BookOpen,
    label: 'Study',
    color: 'text-emerald-400',
  },
  problem_solving: {
    icon: Code2,
    label: 'Problem Solving',
    color: 'text-blue-400',
  },
  mock_interview: {
    icon: Users,
    label: 'Mock Interview',
    color: 'text-purple-400',
  },
  discussion: {
    icon: MessageSquare,
    label: 'Discussion',
    color: 'text-cyan-400',
  },
  review: {
    icon: Lightbulb,
    label: 'Review',
    color: 'text-amber-400',
  },
};

export function UpcomingSessionsWidget({ limit = 5, className }: UpcomingSessionsWidgetProps) {
  const { theme } = useTheme();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingSessions();
  }, []);

  const fetchUpcomingSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/study-pods/my-sessions?limit=' + limit);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error fetching upcoming sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={cn(
        "border-2",
        theme === 'light' ? "bg-white border-gray-200" : "bg-zinc-900/50 border-white/10",
        className
      )}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" />
            Upcoming Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "border-2 overflow-hidden",
      theme === 'light' ? "bg-white border-gray-200" : "bg-zinc-900/50 border-white/10",
      className
    )}>
      {/* Background gradient */}
      {theme !== 'light' && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.05),transparent_50%)] pointer-events-none" />
      )}

      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-2 rounded-lg border",
              theme === 'light'
                ? "bg-gradient-to-br from-emerald-50 to-cyan-50 border-emerald-200"
                : "bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border-emerald-500/30"
            )}>
              <Calendar className="w-5 h-5 text-emerald-500" />
            </div>
            <CardTitle className={theme === 'light' ? "text-gray-900" : "text-white"}>
              Upcoming Sessions
            </CardTitle>
          </div>
          <Link href="/study-pods">
            <Button variant="ghost" size="sm" className="gap-1">
              View All
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <CardDescription className={theme === 'light' ? "text-gray-600" : "text-white/60"}>
          Your scheduled study pod sessions
        </CardDescription>
      </CardHeader>

      <CardContent className="relative space-y-3">
        {sessions.length === 0 ? (
          <div className={cn(
            "text-center py-8",
            theme === 'light' ? "text-gray-600" : "text-white/60"
          )}>
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No upcoming sessions</p>
            <Link href="/study-pods">
              <Button variant="outline" size="sm" className="mt-4">
                Browse Study Pods
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {sessions.map((session) => {
              const typeConfig = SESSION_TYPE_CONFIG[session.session_type] || SESSION_TYPE_CONFIG.study;
              const TypeIcon = typeConfig.icon;
              const scheduledDate = new Date(session.scheduled_at);
              const isLive = session.status === 'in_progress';
              const timeUntil = formatDistanceToNow(scheduledDate, { addSuffix: true });

              return (
                <Link
                  key={session.id}
                  href={`/study-pods/${session.pod_id}?tab=sessions`}
                  className="block"
                >
                  <div className={cn(
                    "p-3 rounded-lg border transition-all hover:scale-[1.02]",
                    theme === 'light'
                      ? "bg-gray-50/50 border-gray-200 hover:bg-gray-100 hover:border-emerald-300"
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-emerald-500/50",
                    isLive && "ring-2 ring-emerald-500/50"
                  )}>
                    <div className="flex items-start gap-3">
                      {/* Type Icon */}
                      <div className={cn(
                        "p-2 rounded-lg border flex-shrink-0",
                        theme === 'light'
                          ? "bg-white border-gray-200"
                          : "bg-white/5 border-white/10"
                      )}>
                        <TypeIcon className={cn("w-4 h-4", typeConfig.color)} />
                      </div>

                      {/* Session Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className={cn(
                            "font-medium text-sm leading-tight truncate",
                            theme === 'light' ? "text-gray-900" : "text-white"
                          )}>
                            {session.title}
                          </h4>
                          {isLive && (
                            <Badge className="text-xs gap-1 bg-emerald-500 hover:bg-emerald-600 flex-shrink-0">
                              <Radio className="w-3 h-3 animate-pulse" />
                              LIVE
                            </Badge>
                          )}
                        </div>

                        {/* Pod Name */}
                        <p className={cn(
                          "text-xs mb-2 truncate",
                          theme === 'light' ? "text-gray-600" : "text-white/60"
                        )}>
                          {session.pod.name}
                        </p>

                        {/* Time & Attendees */}
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1">
                            <Clock className={cn("w-3 h-3", theme === 'light' ? "text-gray-500" : "text-white/50")} />
                            <span className={cn(
                              "font-medium",
                              isLive
                                ? "text-emerald-500"
                                : theme === 'light'
                                  ? "text-gray-700"
                                  : "text-white/80"
                            )}>
                              {isLive ? 'Live now' : timeUntil}
                            </span>
                          </div>

                          {session.attendance_count > 0 && (
                            <div className="flex items-center gap-1">
                              <Users className={cn("w-3 h-3", theme === 'light' ? "text-gray-500" : "text-white/50")} />
                              <span className={theme === 'light' ? "text-gray-600" : "text-white/60"}>
                                {session.attendance_count}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Host */}
                        <div className="flex items-center gap-2 mt-2">
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={session.host?.avatar_url} alt={session.host?.full_name} />
                            <AvatarFallback className="text-xs bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
                              {session.host?.full_name?.charAt(0) || 'H'}
                            </AvatarFallback>
                          </Avatar>
                          <span className={cn(
                            "text-xs",
                            theme === 'light' ? "text-gray-600" : "text-white/60"
                          )}>
                            {session.host?.full_name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
}
