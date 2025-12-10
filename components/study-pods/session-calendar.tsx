"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  BookOpen,
  Code2,
  MessageSquare,
  Lightbulb,
  Radio,
  Grid3x3,
  List,
} from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  addWeeks,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";

interface Session {
  id: string;
  title: string;
  session_type: string;
  scheduled_at: string;
  status: string;
  host: any;
  attendance_count: number;
}

interface SessionCalendarProps {
  podId: string;
  sessions: Session[];
  onSessionClick?: (session: Session) => void;
  className?: string;
}

const SESSION_TYPE_CONFIG: Record<string, any> = {
  study: { icon: BookOpen, color: 'bg-emerald-500' },
  problem_solving: { icon: Code2, color: 'bg-blue-500' },
  mock_interview: { icon: Users, color: 'bg-purple-500' },
  discussion: { icon: MessageSquare, color: 'bg-cyan-500' },
  review: { icon: Lightbulb, color: 'bg-amber-500' },
};

export function SessionCalendar({
  podId,
  sessions,
  onSessionClick,
  className,
}: SessionCalendarProps) {
  const { theme } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');

  // Group sessions by date
  const sessionsByDate: Record<string, Session[]> = {};
  sessions.forEach(session => {
    const date = format(parseISO(session.scheduled_at), 'yyyy-MM-dd');
    if (!sessionsByDate[date]) {
      sessionsByDate[date] = [];
    }
    sessionsByDate[date].push(session);
  });

  // Get calendar days
  const getCalendarDays = () => {
    const start = view === 'month'
      ? startOfWeek(startOfMonth(currentDate))
      : startOfWeek(currentDate);
    const end = view === 'month'
      ? endOfWeek(endOfMonth(currentDate))
      : endOfWeek(currentDate);

    const days = [];
    let day = start;

    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  };

  const days = getCalendarDays();

  const handlePrevious = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, -1));
    } else {
      setCurrentDate(addWeeks(currentDate, -1));
    }
  };

  const handleNext = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <Card className={cn(
      "p-6 border-2",
      theme === 'light' ? "bg-white border-gray-200" : "bg-zinc-900/50 border-white/10",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h3 className={cn(
            "text-2xl font-bold",
            theme === 'light' ? "text-gray-900" : "text-white"
          )}>
            {format(currentDate, 'MMMM yyyy')}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="text-xs"
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className={cn(
            "flex items-center rounded-lg border p-1",
            theme === 'light' ? "bg-gray-100 border-gray-200" : "bg-white/5 border-white/10"
          )}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('month')}
              className={cn(
                "h-7 px-3 text-xs",
                view === 'month' && (theme === 'light' ? "bg-white shadow-sm" : "bg-white/10")
              )}
            >
              <Grid3x3 className="w-3.5 h-3.5 mr-1.5" />
              Month
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('week')}
              className={cn(
                "h-7 px-3 text-xs",
                view === 'week' && (theme === 'light' ? "bg-white shadow-sm" : "bg-white/10")
              )}
            >
              <List className="w-3.5 h-3.5 mr-1.5" />
              Week
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div>
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div
              key={day}
              className={cn(
                "text-center text-xs font-semibold py-2",
                theme === 'light' ? "text-gray-600" : "text-white/60"
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const daySessions = sessionsByDate[dateKey] || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);

            return (
              <div
                key={index}
                className={cn(
                  "min-h-[100px] p-2 rounded-lg border transition-all",
                  theme === 'light'
                    ? "bg-gray-50/50 border-gray-200 hover:bg-gray-100"
                    : "bg-white/5 border-white/10 hover:bg-white/10",
                  !isCurrentMonth && "opacity-40",
                  isTodayDate && "ring-2 ring-emerald-500/50"
                )}
              >
                {/* Date */}
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "text-sm font-medium",
                    isTodayDate
                      ? "text-emerald-500"
                      : theme === 'light'
                        ? "text-gray-900"
                        : "text-white"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {daySessions.length > 0 && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs",
                        theme === 'light' ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/20 text-emerald-400"
                      )}
                    >
                      {daySessions.length}
                    </Badge>
                  )}
                </div>

                {/* Sessions */}
                <div className="space-y-1">
                  {daySessions.slice(0, 3).map((session) => {
                    const typeConfig = SESSION_TYPE_CONFIG[session.session_type] || SESSION_TYPE_CONFIG.study;
                    const TypeIcon = typeConfig.icon;
                    const isLive = session.status === 'in_progress';
                    const sessionTime = parseISO(session.scheduled_at);

                    return (
                      <button
                        key={session.id}
                        onClick={() => onSessionClick?.(session)}
                        className={cn(
                          "w-full text-left p-1.5 rounded border transition-all hover:scale-105",
                          theme === 'light'
                            ? "bg-white border-gray-200 hover:border-emerald-300"
                            : "bg-white/10 border-white/20 hover:border-emerald-500/50",
                          isLive && "ring-1 ring-emerald-500/50"
                        )}
                      >
                        <div className="flex items-start gap-1.5">
                          <div className={cn(
                            "w-1 h-full rounded-full flex-shrink-0 mt-0.5",
                            typeConfig.color
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-xs font-medium line-clamp-1",
                              theme === 'light' ? "text-gray-900" : "text-white"
                            )}>
                              {session.title}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Clock className={cn(
                                "w-2.5 h-2.5",
                                theme === 'light' ? "text-gray-500" : "text-white/50"
                              )} />
                              <span className={cn(
                                "text-xs",
                                isLive
                                  ? "text-emerald-500 font-medium"
                                  : theme === 'light'
                                    ? "text-gray-600"
                                    : "text-white/60"
                              )}>
                                {isLive ? 'Live' : format(sessionTime, 'h:mm a')}
                              </span>
                            </div>
                          </div>
                          {isLive && (
                            <Radio className="w-3 h-3 text-emerald-500 animate-pulse flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {/* Show "more" indicator */}
                  {daySessions.length > 3 && (
                    <button
                      className={cn(
                        "w-full text-xs text-center py-1 rounded hover:bg-white/5",
                        theme === 'light' ? "text-gray-600" : "text-white/60"
                      )}
                    >
                      +{daySessions.length - 3} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-6 pt-4 border-t border-white/10">
        <span className={cn(
          "text-xs font-medium",
          theme === 'light' ? "text-gray-600" : "text-white/60"
        )}>
          Session Types:
        </span>
        <div className="flex items-center flex-wrap gap-3">
          {Object.entries(SESSION_TYPE_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <div key={key} className="flex items-center gap-1.5">
                <div className={cn("w-2 h-2 rounded-full", config.color)} />
                <span className={cn(
                  "text-xs capitalize",
                  theme === 'light' ? "text-gray-600" : "text-white/60"
                )}>
                  {key.replace('_', ' ')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
