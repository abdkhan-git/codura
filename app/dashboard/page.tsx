"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import CoduraLogo from "@/components/logos/codura-logo.svg";
import { cn } from "@/lib/utils";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Video,
  Users,
  Clock,
  Code,
  Trophy,
  Target,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  X,
  Plus,
  MoreVertical,
  User,
  Settings,
  LogOut,
  ChevronDown,
  BarChart3
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"; // Ensure this file exists or update the path to the correct location
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EventDialog } from "@/components/calendar/event-dialog";
import { PlanDialog } from "@/components/study-plans/plan-dialog";

// User data type
interface UserData {
  name: string;
  email: string;
  avatar: string;
  streak: number;
  problemsSolved: number;
  easy: number;
  medium: number;
  hard: number;
}

const chartConfig = {
  problems: {
    label: "Problems Solved",
    color: "var(--brand)",
  },
} satisfies ChartConfig;

// Study plan interface
interface StudyPlan {
  id: string;
  name: string;
  description?: string;
  color: string;
  is_default?: boolean;
  problem_count: number;
}

// Activity and event interfaces
interface Activity {
  id: string | number;
  type: string;
  title: string;
  difficulty?: string;
  time: string;
}

interface UpcomingEvent {
  id: string;
  type: string;
  title: string;
  date: string;
  time: string | null;
}

interface DailyChallenge {
  title: string;
  difficulty: string;
  topics: string[];
  slug?: string;
}

// Calendar Event interface
interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  event_type: 'solve_problem' | 'mock_interview' | 'study_pod' | 'live_stream' | 'other';
  event_date: string;
  start_time?: string;
  end_time?: string;
  is_completed: boolean;
}

// Interactive Calendar component
function Calendar({ streak }: { streak: number }) {
  // Use user's local timezone - create date at midnight local time
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [eventDialogDate, setEventDialogDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  // Fetch events when month changes
  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const response = await fetch(`/api/calendar/events?year=${year}&month=${month}`);
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get days with events
  const eventsMap = events.reduce((acc, event) => {
    const day = new Date(event.event_date).getDate();
    if (!acc[day]) acc[day] = [];
    acc[day].push(event);
    return acc;
  }, {} as Record<number, CalendarEvent[]>);

  const activityDays = Object.keys(eventsMap).map(Number);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const handleDayClick = (day: number) => {
    if (activityDays.includes(day)) {
      setSelectedDay(selectedDay === day ? null : day);
    } else {
      // Open event creation dialog for empty days
      const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      setEventDialogDate(clickedDate);
      setShowEventDialog(true);
    }
  };

  const selectedDayEvents = selectedDay ? eventsMap[selectedDay] : null;

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'solve_problem': return Code;
      case 'mock_interview': return Video;
      case 'study_pod': return Users;
      default: return Code;
    }
  };

  return (
    <Card className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden group hover:border-brand/30 transition-all duration-500 shadow-xl">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Activity Calendar</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="text-brand font-semibold">Current Streak: {streak} {streak === 1 ? 'day' : 'days'}</span> 🔥
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-brand/10" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-2 min-w-[120px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-brand/10" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {blanks.map((blank) => (
            <div key={`blank-${blank}`} className="aspect-square" />
          ))}
          {days.map((day) => {
            // Check if this day is today in user's local timezone
            const now = new Date();
            const isToday = day === now.getDate() &&
                           currentDate.getMonth() === now.getMonth() &&
                           currentDate.getFullYear() === now.getFullYear();
            const hasActivity = activityDays.includes(day);
            const isSelected = selectedDay === day;
            const isHovered = hoveredDay === day;

            return (
              <div
                key={day}
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
                className={cn(
                  "relative aspect-square flex items-center justify-center text-sm rounded-lg transition-all duration-300 cursor-pointer",
                  isToday && "bg-brand text-white font-semibold shadow-lg shadow-brand/30",
                  !isToday && hasActivity && !isSelected && "bg-green-500/20 text-green-600 hover:bg-green-500/40",
                  !isToday && !hasActivity && "hover:bg-muted/50",
                  isSelected && "bg-brand/20 ring-2 ring-brand text-brand font-semibold",
                  hasActivity && "hover:scale-110"
                )}
              >
                {day}
                {hasActivity && (isHovered || isSelected) && (
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-brand/30 to-purple-500/30 animate-pulse" />
                )}
                {hasActivity && (
                  <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-500 rounded-full" />
                )}
              </div>
            );
          })}
        </div>

        {/* Activity Details Panel */}
        {selectedDayEvents && (
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-background/60 to-background/40 border border-brand/30 animate-appear">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">
                Events on {monthNames[currentDate.getMonth()]} {selectedDay}
              </h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setSelectedDay(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3">
              {selectedDayEvents.map((event) => {
                const EventIcon = getEventIcon(event.event_type);
                return (
                  <div key={event.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <EventIcon className="w-4 h-4 mt-0.5 text-brand" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                      )}
                      {event.start_time && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {event.start_time} {event.end_time && `- ${event.end_time}`}
                        </p>
                      )}
                    </div>
                    {event.is_completed && (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-green-500/20" />
            <span>Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-brand" />
            <span>Today</span>
          </div>
        </div>
      </CardContent>

      <EventDialog
        open={showEventDialog}
        onOpenChange={setShowEventDialog}
        selectedDate={eventDialogDate}
        onEventCreated={fetchEvents}
      />
    </Card>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBorder, setShowBorder] = useState(false);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [showUpcomingEventDialog, setShowUpcomingEventDialog] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<any>(null);
  const [activityChartData, setActivityChartData] = useState<any[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1M');

  // Fetch user data from Supabase
  useEffect(() => {
    async function fetchUserData() {
      try {
        const response = await fetch('/api/profile');
        if (!response.ok) throw new Error('Failed to fetch profile');

        const data = await response.json();

        // Map API response to UserData format
        const fullName = data.profile?.full_name || data.user?.email?.split('@')[0] || 'User';
        const initials = fullName
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);


          // Set user data
        setUser({
          name: fullName,
          email: data.user?.email || '',
          avatar: data.profile?.avatar_url || initials,
          streak: data.stats?.current_streak || 0,
          problemsSolved: data.stats?.total_solved || 0,
          easy: data.stats?.easy_solved || 0,
          medium: data.stats?.medium_solved || 0,
          hard: data.stats?.hard_solved || 0,
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserData();
    fetchStudyPlans();
    fetchRecentActivity();
    fetchUpcomingEvents();
    fetchDailyChallenge();
    fetchActivityChart();
  }, []);

  // Fetch activity chart when timeframe changes
  useEffect(() => {
    fetchActivityChart();
  }, [selectedTimeframe]);

  // Fetch study plans
  const fetchStudyPlans = async () => {
    try {
      const response = await fetch('/api/study-plans');
      const data = await response.json();
      setStudyPlans(data.userLists || []);
    } catch (error) {
      console.error('Error fetching study plans:', error);
    }
  };

  // Fetch recent activity
  const fetchRecentActivity = async () => {
    try {
      const response = await fetch('/api/dashboard/recent-activity');
      const data = await response.json();
      setRecentActivity(data.activity || []);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  // Fetch upcoming events
  const fetchUpcomingEvents = async () => {
    try {
      const response = await fetch('/api/dashboard/upcoming-events');
      const data = await response.json();
      setUpcomingEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
    }
  };

  // Fetch daily challenge
  const fetchDailyChallenge = async () => {
    try {
      const response = await fetch('/api/dashboard/daily-challenge');
      const data = await response.json();
      setDailyChallenge(data.challenge || null);
    } catch (error) {
      console.error('Error fetching daily challenge:', error);
    }
  };

  // Fetch activity chart
  const fetchActivityChart = async () => {
    try {
      const response = await fetch(`/api/dashboard/activity-chart?timeframe=${selectedTimeframe}`);
      const data = await response.json();
      setActivityChartData(data.data || []);
    } catch (error) {
      console.error('Error fetching activity chart:', error);
    }
  };

  // Handle delete event
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Delete this event?')) return;

    try {
      const response = await fetch(`/api/calendar/events?id=${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete event');

      await fetchUpcomingEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    }
  };

  // Handle create new event from upcoming section
  const handleCreateEventClick = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setEventToEdit(null);
    setShowUpcomingEventDialog(true);
  };

  // Handle edit existing event
  const handleEditEvent = async (eventId: string) => {
    try {
      // Fetch the full event data
      const response = await fetch(`/api/calendar/events?id=${eventId}`);
      if (!response.ok) throw new Error('Failed to fetch event');

      const { event } = await response.json();
      setEventToEdit(event);
      setShowUpcomingEventDialog(true);
    } catch (error) {
      console.error('Error fetching event for edit:', error);
      alert('Failed to load event details');
    }
  };

  React.useEffect(() => {
    const evaluateScrollPosition = () => {
      setShowBorder(window.pageYOffset >= 24);
    };
    window.addEventListener("scroll", evaluateScrollPosition);
    evaluateScrollPosition();
    return () => window.removeEventListener("scroll", evaluateScrollPosition);
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="caffeine-theme min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state if user data failed to load
  if (!user) {
    return (
      <div className="caffeine-theme min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Failed to load user data</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="caffeine-theme min-h-screen bg-zinc-950 relative">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-zinc-950" />

        {/* Floating orbs */}
        <div
          className="absolute top-[-10%] right-[20%] w-[500px] h-[500px] bg-brand/8 rounded-full blur-[100px] animate-pulse-slow"
        />
        <div
          className="absolute bottom-[10%] left-[15%] w-[400px] h-[400px] bg-purple-500/6 rounded-full blur-[80px] animate-float-slow"
          style={{ animationDelay: '2s' }}
        />
        <div
          className="absolute top-[40%] right-[60%] w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[70px] animate-float"
          style={{ animationDelay: '4s' }}
        />

        {/* Beam lines */}
        <div className="absolute inset-0 opacity-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-px bg-gradient-to-b from-transparent via-brand/30 to-transparent animate-pulse"
              style={{
                left: `${15 + i * 14}%`,
                height: '100%',
                animationDelay: `${i * 0.8}s`,
                animationDuration: `${2 + i * 0.3}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Navbar matching landing page */}
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b border-b-transparent bg-gradient-to-b shadow-none backdrop-blur-none transition-all duration-500",
          showBorder
            ? "border-b-white/10 shadow-[0_4px_60px_0_rgba(0,0,0,0.90)] backdrop-blur-md from-neutral-950/80 to-neutral-950/50"
            : ""
        )}
      >
        <div className="flex items-center justify-between py-4 max-w-7xl mx-auto px-6">
          <Link href="/" aria-label="Codura homepage" className="flex items-center group">
            <Image
              src={CoduraLogo}
              alt="Codura logo"
              width={90}
              height={40}
              priority
              className="transition-all duration-200 group-hover:opacity-80"
            />
          </Link>

          <nav className="hidden items-center gap-6 text-base leading-7 font-light text-neutral-400 lg:flex">
            <Link className="hover:text-neutral-200 transition-colors" href="/problems">
              Problems
            </Link>
            <Link className="hover:text-neutral-200 transition-colors" href="/mock-interview">
              Interview
            </Link>
            <Link className="hover:text-neutral-200 transition-colors" href="/study-pods">
              Study Pods
            </Link>
            <Link className="hover:text-neutral-200 transition-colors" href="/leaderboards">
              Leaderboards
            </Link>
            <Link className="hover:text-neutral-200 transition-colors" href="/discuss">
              Discuss
            </Link>
          </nav>


          {/* User Menu */}
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 hover:bg-white/5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand to-orange-300 flex items-center justify-center text-white font-semibold text-sm">
                    {user.avatar}
                  </div>
                  <span className="hidden sm:inline text-sm text-neutral-400">
                    {user.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="h-4 w-4 text-neutral-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-xl border-border/40">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/40" />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/40" />
                <DropdownMenuItem
                  className="cursor-pointer text-red-500 focus:text-red-500"
                  onClick={async () => {
                    await fetch('/auth/signout', { method: 'POST' });
                    window.location.href = '/';
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-foreground via-foreground to-brand bg-clip-text text-transparent">
            Welcome to Codura
          </h1>
          <p className="text-lg text-muted-foreground">
            Continue your interview preparation journey
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Daily Challenge - Featured */}
          <Card className="lg:col-span-2 relative border-2 border-brand/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden group hover:border-brand/40 hover:shadow-2xl hover:shadow-brand/10 transition-all duration-500 shadow-xl hover:scale-[1.01]">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Sparkles className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Daily Challenge</CardTitle>
                    <p className="text-sm text-muted-foreground">Earn bonus points</p>
                  </div>
                </div>
                {dailyChallenge && (
                  <Badge variant="outline" className="border-yellow-500/30 text-yellow-600">
                    {dailyChallenge.difficulty}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {dailyChallenge ? (
                <>
                  <h3 className="font-semibold text-xl mb-3 group-hover:text-brand transition-colors">{dailyChallenge.title}</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {dailyChallenge.topics.map((topic, i) => (
                      <Badge key={i} variant="outline" className="bg-muted/50 hover:bg-brand/10 transition-colors">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                  <Link href={dailyChallenge.slug ? `/problems/${dailyChallenge.slug}` : '/problems'}>
                    <Button className="bg-gradient-to-r from-brand to-orange-300 hover:from-brand/90 hover:to-orange-300/90 text-white hover:scale-105 transition-transform">
                      Start Challenge
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">Loading daily challenge...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden group hover:border-purple-500/30 transition-all duration-500 shadow-xl">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-purple-500" />
                Your Progress
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Solved</span>
                <span className="text-2xl font-bold">{user.problemsSolved}</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-600">Easy</span>
                  <span className="font-semibold">{user.easy}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-yellow-600">Medium</span>
                  <span className="font-semibold">{user.medium}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-red-600">Hard</span>
                  <span className="font-semibold">{user.hard}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current Streak</span>
                  <span className="text-xl font-bold text-brand">{user.streak} {user.streak === 1 ? 'day' : 'days'} 🔥</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Activity Chart */}
            <Card className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden group hover:border-cyan-500/30 transition-all duration-500 shadow-xl hover:scale-[1.01]">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-cyan-500" />
                      Problem Solving Activity
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Track your coding progress
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    {['1D', '1W', '1M', '3M', 'YTD', 'ALL'].map((timeframe) => (
                      <Button
                        key={timeframe}
                        variant={selectedTimeframe === timeframe ? 'default' : 'ghost'}
                        size="sm"
                        className={cn(
                          "h-7 px-2 text-xs",
                          selectedTimeframe === timeframe
                            ? "bg-brand text-white hover:bg-brand/90"
                            : "hover:bg-muted"
                        )}
                        onClick={() => setSelectedTimeframe(timeframe)}
                      >
                        {timeframe}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="h-[300px]">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <AreaChart
                    accessibilityLayer
                    data={activityChartData}
                    margin={{
                      left: 0,
                      right: 0,
                      top: 10,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <defs>
                      <linearGradient id="fillProblems" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="var(--brand)"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--brand)"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <Area
                      dataKey="problems"
                      type="monotone"
                      fill="url(#fillProblems)"
                      fillOpacity={0.4}
                      stroke="var(--brand)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden group hover:border-green-500/30 transition-all duration-500 shadow-xl hover:scale-[1.01]">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />

              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>

              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/50 hover:border-brand/30 transition-all cursor-pointer hover:scale-[1.02]"
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center transition-transform hover:scale-110",
                          activity.type === 'problem' && "bg-green-500/10 text-green-600",
                          activity.type === 'interview' && "bg-purple-500/10 text-purple-600",
                          activity.type === 'study' && "bg-blue-500/10 text-blue-600"
                        )}>
                          {activity.type === 'problem' ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : activity.type === 'interview' ? (
                            <Video className="w-5 h-5" />
                          ) : (
                            <Users className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{activity.title}</p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                        {activity.difficulty && (
                          <Badge variant="outline" className="text-xs">
                            {activity.difficulty}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No recent activity</p>
                    <p className="text-xs mt-1">Start solving problems to see your activity here</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden group hover:border-blue-500/30 transition-all duration-500 shadow-xl">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-blue-500" />
                    Upcoming Events
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 hover:bg-brand/10 hover:text-brand"
                    onClick={handleCreateEventClick}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Create</span>
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {upcomingEvents.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingEvents.map((event) => (
                      <div
                        key={event.id}
                        className="group/event flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            event.type === 'mock' && "bg-purple-500/10 text-purple-600",
                            event.type === 'study' && "bg-blue-500/10 text-blue-600",
                            event.type === 'problem' && "bg-green-500/10 text-green-600",
                            event.type === 'stream' && "bg-red-500/10 text-red-600"
                          )}>
                            {event.type === 'mock' ? (
                              <Video className="w-5 h-5" />
                            ) : event.type === 'study' ? (
                              <Users className="w-5 h-5" />
                            ) : event.type === 'problem' ? (
                              <Code className="w-5 h-5" />
                            ) : (
                              <Trophy className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{event.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {event.date}{event.time && ` • ${event.time}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover/event:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-brand/10 hover:text-brand"
                            onClick={() => handleEditEvent(event.id)}
                            title="Edit event"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-red-500/10 hover:text-red-500"
                            onClick={() => handleDeleteEvent(event.id)}
                            title="Delete event"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No upcoming events</p>
                    <p className="text-xs mt-1">Create events in your calendar to see them here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <Calendar streak={user.streak} />

            {/* Study Plan Progress */}
            <Card className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden group hover:border-green-500/30 transition-all duration-500 shadow-xl hover:scale-[1.01]">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />

              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Target className="w-5 h-5 text-green-500" />
                    Study Plans
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 hover:bg-brand/10 hover:text-brand"
                    onClick={() => setShowPlanDialog(true)}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Create</span>
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {studyPlans.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm mb-4">No study plans yet</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPlanDialog(true)}
                      className="border-brand/30 hover:bg-brand/10 hover:border-brand/50"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Plan
                    </Button>
                  </div>
                ) : (
                  <>
                    {studyPlans.slice(0, 3).map((plan) => {
                      // For now, show problem count as both total and completed (will be updated later with progress tracking)
                      const total = plan.problem_count || 0;
                      const completed = 0; // Will be calculated from user_problem_progress
                      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

                      return (
                        <div
                          key={plan.id}
                          className="group/plan"
                        >
                          <Link href={`/study-plans/${plan.id}`} className="block">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium hover:text-brand transition-colors">{plan.name}</span>
                                {plan.is_default && (
                                  <Badge variant="outline" className="text-xs h-5 border-brand/30">
                                    Default
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">{total} problems</span>
                              </div>
                            </div>
                            <div className="relative w-full bg-muted/30 rounded-full h-2.5 overflow-hidden group-hover/plan:h-3 transition-all">
                              <div
                                className={`bg-gradient-to-r ${plan.color} h-full rounded-full transition-all duration-500 relative`}
                                style={{ width: `${percentage}%` }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                              </div>
                            </div>
                          </Link>
                        </div>
                      );
                    })}

                    {studyPlans.length > 3 && (
                      <Link href="/study-plans" className="block">
                        <Button variant="outline" size="sm" className="w-full border-brand/30 hover:bg-brand/10 hover:border-brand/50">
                          View All Plans ({studyPlans.length})
                        </Button>
                      </Link>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-brand/30 hover:bg-brand/10 hover:border-brand/50"
                      onClick={() => setShowPlanDialog(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Custom Plan
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <PlanDialog
              open={showPlanDialog}
              onOpenChange={setShowPlanDialog}
              onPlanCreated={fetchStudyPlans}
            />

            <EventDialog
              open={showUpcomingEventDialog}
              onOpenChange={setShowUpcomingEventDialog}
              selectedDate={eventToEdit?.event_date ? new Date(eventToEdit.event_date) : new Date()}
              onEventCreated={fetchUpcomingEvents}
              existingEvent={eventToEdit}
            />
          </div>
        </div>
      </main>
    </div>
  );
}