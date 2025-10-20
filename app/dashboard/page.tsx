"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
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
  BarChart3,
  Settings,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"; // Ensure this file exists or update the path to the correct location
import { EventDialog } from "@/components/calendar/event-dialog";
import { PlanDialog } from "@/components/study-plans/plan-dialog";
import { StudyPlanDetailDialog } from "@/components/study-plans/study-plan-detail-dialog";
import QuestionnaireModal from "@/components/QuestionnaireModal";
import OnboardingModal from "@/components/OnboardingModal";
import DashboardNavbar from "@/components/navigation/dashboard-navbar";

// User data type
interface UserData {
  name: string;
  email: string;
  avatar: string;
  username?: string;
  streak: number;
  problemsSolved: number;
  easy: number;
  medium: number;
  hard: number;
  createdAt?: string;
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
  is_public?: boolean;
  problem_count: number;
  solved_count?: number;
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
  id: number;
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
    <Card 
      className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden group hover:border-brand/30 transition-all duration-500 shadow-xl hover:scale-[1.01] shine-effect"
      style={{ '--glow-color': 'var(--brand)' } as React.CSSProperties}
    >
      {/* Animated glow borders */}
      <div className="glow-border-top" />
      <div className="glow-border-bottom" />
      <div className="glow-border-left" />
      <div className="glow-border-right" />
      
      {/* Enhanced background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-12 transition-opacity duration-700 pointer-events-none" />

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
                  isToday && "bg-brand text-brand-foreground font-semibold shadow-lg shadow-brand/30",
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
  const { theme: currentTheme } = useTheme();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [showUpcomingEventDialog, setShowUpcomingEventDialog] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<any>(null);
  const [activityChartData, setActivityChartData] = useState<any[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1M');
  const [selectedStudyPlan, setSelectedStudyPlan] = useState<{ id: string; name: string; color: string; is_public?: boolean } | null>(null);
  const [showStudyPlanDialog, setShowStudyPlanDialog] = useState(false);
  
  // Onboarding and Questionnaire modal state
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [hasSchoolCode, setHasSchoolCode] = useState(true);
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);
  const [questionnaireData, setQuestionnaireData] = useState<any>(null);
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(true);

  // OPTIMIZED: Fetch ALL dashboard data in ONE API call
  useEffect(() => {
    async function fetchAllDashboardData() {
      try {
        setIsLoading(true);
        setError(null);

        // Single unified API call instead of 6 separate calls!
        const response = await fetch('/api/dashboard');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch dashboard data');
        }

        const data = await response.json();

        // Set all state at once
        setUser(data.user);
        setStudyPlans(data.studyPlans || []);
        setRecentActivity(data.recentActivity || []);
        setUpcomingEvents(data.upcomingEvents || []);
        setDailyChallenge(data.dailyChallenge);
        setActivityChartData(data.activityChartData || []);
        
        // Check onboarding and questionnaire status
        if (data.user) {
          const code = data.user.federalSchoolCode;
          const codeStr = code === null || code === undefined ? "" : String(code).trim();
          const hasCode = codeStr.length > 0 && codeStr !== "no_school";
          
          setHasSchoolCode(hasCode || codeStr === "no_school");
          
          // Priority 1: Show onboarding if no school code at all
          if (!hasCode && codeStr !== "no_school") {
            setShowOnboardingModal(true);
          } 
          // Priority 2: Show questionnaire if has code but not completed
          else if (data.user.questionnaireCompleted === false) {
            setQuestionnaireCompleted(false);
            fetchQuestionnaireData();
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchAllDashboardData();
  }, []);

  // Fetch activity chart when timeframe changes
  useEffect(() => {
    async function fetchActivityChart() {
      try {
        const response = await fetch(`/api/dashboard/activity-chart?timeframe=${selectedTimeframe}`);
        const data = await response.json();
        setActivityChartData(data.data || []);
      } catch (error) {
        console.error('Error fetching activity chart:', error);
      }
    }

    fetchActivityChart();
  }, [selectedTimeframe]);

  // Fetch questionnaire data
  const fetchQuestionnaireData = async () => {
    try {
      const response = await fetch('/api/questionnaire');
      if (!response.ok) throw new Error('Failed to fetch questionnaire');
      const data = await response.json();
      setQuestionnaireData(data);
      setQuestionnaireCompleted(false);
      setShowQuestionnaireModal(true);
    } catch (error) {
      console.error('Error fetching questionnaire:', error);
    }
  };

  // Handle onboarding completion - show questionnaire next
  const handleOnboardingComplete = () => {
    setShowOnboardingModal(false);
    setHasSchoolCode(true);
    // Now show questionnaire modal
    fetchQuestionnaireData();
  };

  // Handle questionnaire completion
  const handleQuestionnaireComplete = () => {
    setShowQuestionnaireModal(false);
    setQuestionnaireCompleted(true);
    // Refresh dashboard data
    refetchDashboard();
  };

  // Refetch function for when data needs to be refreshed
  const refetchDashboard = async () => {
    try {
      setError(null);
      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch dashboard data');
      }
      const data = await response.json();
      setUser(data.user);
      setStudyPlans(data.studyPlans || []);
      setRecentActivity(data.recentActivity || []);
      setUpcomingEvents(data.upcomingEvents || []);
      setDailyChallenge(data.dailyChallenge);
      setActivityChartData(data.activityChartData || []);
    } catch (error) {
      console.error('Error refetching dashboard:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
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

      await refetchDashboard(); // OPTIMIZED: Use unified refetch
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


  // Show loading state
  if (isLoading) {
    return (
      <div className="caffeine-theme min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state if data failed to load
  if (error || !user) {
    return (
      <div className="caffeine-theme min-h-screen bg-background relative flex items-center justify-center p-6">
        {/* Background effects */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-background" />
          <div className="absolute top-[-10%] right-[20%] w-[500px] h-[500px] bg-brand/5 rounded-full blur-[100px] animate-pulse-slow" />
        </div>

        <Card className="relative z-10 max-w-lg w-full border-2 border-destructive/30 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <X className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-destructive">Unable to Load Dashboard</CardTitle>
            <CardDescription className="text-base mt-2">
              {error || 'Failed to load user data. Please try again.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            <Button 
              onClick={refetchDashboard} 
              className="w-full"
              size="lg"
            >
              Try Again
            </Button>
            <Button 
              onClick={() => window.location.href = '/'} 
              variant="outline"
              className="w-full"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // TypeScript: After this point, user is guaranteed to be non-null

  return (
    <div className="caffeine-theme min-h-screen bg-background relative">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-background" />

        {/* Floating orbs */}
        <div
          className="absolute top-[-10%] right-[20%] w-[500px] h-[500px] bg-brand/5 dark:bg-brand/8 rounded-full blur-[100px] animate-pulse-slow"
        />
        <div
          className="absolute bottom-[10%] left-[15%] w-[400px] h-[400px] bg-purple-500/3 dark:bg-purple-500/6 rounded-full blur-[80px] animate-float-slow"
          style={{ animationDelay: '2s' }}
        />
        <div
          className="absolute top-[40%] right-[60%] w-[300px] h-[300px] bg-blue-500/3 dark:bg-blue-500/5 rounded-full blur-[70px] animate-float"
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

      {/* New Liquid Glass Navbar */}
      <DashboardNavbar user={user} />

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
        <div className="mb-12 relative">
          {/* Decorative gradient orb behind text */}
          <div className="absolute -top-8 -left-8 w-64 h-64 bg-gradient-to-br from-brand/10 via-purple-500/5 to-transparent rounded-full blur-[120px] opacity-40 animate-pulse-slow pointer-events-none" />

          <div className="relative">
            <h1 className="text-4xl md:text-5xl font-bold mb-3 relative">
              <span className="bg-gradient-to-r from-foreground via-brand to-purple-400 bg-clip-text text-transparent animate-gradient-x">
                {(() => {
                  const firstName = user.name.split(' ')[0];
                  // Capitalize first letter
                  const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
                  const isNewUser = user.createdAt ?
                    new Date().getTime() - new Date(user.createdAt).getTime() < 24 * 60 * 60 * 1000 :
                    false;
                  return isNewUser
                    ? `Welcome to Codura, ${capitalizedName}`
                    : `Welcome back, ${capitalizedName}`;
                })()}
              </span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Continue your interview preparation journey
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Daily Challenge - Featured */}
          <Card 
            className="lg:col-span-2 relative border-2 border-brand/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden group hover:border-brand/40 hover:shadow-2xl hover:shadow-brand/10 transition-all duration-500 shadow-xl hover:scale-[1.01] shine-effect"
            style={{ '--glow-color': 'var(--brand)' } as React.CSSProperties}
          >
            {/* Animated glow borders - top visible, others on hover */}
            <div className="glow-border-top" />
            <div className="glow-border-bottom" />
            <div className="glow-border-left" />
            <div className="glow-border-right" />
            
            {/* Enhanced background gradient with animation */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-brand/3 to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-tl from-orange-500/5 to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-700 delay-100 pointer-events-none" />

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
                    {Array.isArray(dailyChallenge.topics) && dailyChallenge.topics.map((topic, i) => (
                      <Badge key={i} variant="outline" className="bg-muted/50 hover:bg-brand/10 transition-colors">
                        {typeof topic === 'string' ? topic : (topic as any).name || (topic as any).slug}
                      </Badge>
                    ))}
                  </div>
                  <Link href={dailyChallenge.id ? `/problems/${dailyChallenge.id}` : '/problems'}>
                    <Button className="bg-gradient-to-r from-brand to-orange-300 hover:from-brand/90 hover:to-orange-300/90 text-brand-foreground hover:scale-105 transition-transform premium-button-hover">
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
          <Card 
            className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden group hover:border-purple-500/30 transition-all duration-500 shadow-xl hover:scale-[1.01] shine-effect"
            style={{ '--glow-color': '#a855f7' } as React.CSSProperties}
          >
            {/* Animated glow borders */}
            <div className="glow-border-top" />
            <div className="glow-border-bottom" />
            <div className="glow-border-left" />
            <div className="glow-border-right" />
            
            {/* Enhanced background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-15 transition-opacity duration-700 pointer-events-none" />

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
            <Card 
              className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden group hover:border-cyan-500/30 transition-all duration-500 shadow-xl hover:scale-[1.01] shine-effect"
              style={{ '--glow-color': '#06b6d4' } as React.CSSProperties}
            >
              {/* Animated glow borders */}
              <div className="glow-border-top" />
              <div className="glow-border-bottom" />
              <div className="glow-border-left" />
              <div className="glow-border-right" />
              
              {/* Enhanced background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-15 transition-opacity duration-700 pointer-events-none" />

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
                            ? "bg-brand text-brand-foreground hover:bg-brand/90"
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
            <Card 
              className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden group hover:border-green-500/30 transition-all duration-500 shadow-xl hover:scale-[1.01] shine-effect"
              style={{ '--glow-color': '#22c55e' } as React.CSSProperties}
            >
              {/* Animated glow borders */}
              <div className="glow-border-top" />
              <div className="glow-border-bottom" />
              <div className="glow-border-left" />
              <div className="glow-border-right" />
              
              {/* Enhanced background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-15 transition-opacity duration-700 pointer-events-none" />

              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Recent Activity
                </CardTitle>
                <CardDescription className="text-xs">
                  Last 7 days
                </CardDescription>
              </CardHeader>

              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-2">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg border border-border/40 hover:bg-muted/50 hover:border-brand/30 transition-all cursor-pointer hover:scale-[1.01] activity-card-hover"
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-transform hover:scale-110 flex-shrink-0",
                          activity.type === 'problem' && "bg-green-500/10 text-green-600",
                          activity.type === 'interview' && "bg-purple-500/10 text-purple-600",
                          activity.type === 'study' && "bg-blue-500/10 text-blue-600"
                        )}>
                          {activity.type === 'problem' ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : activity.type === 'interview' ? (
                            <Video className="w-4 h-4" />
                          ) : (
                            <Users className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{activity.title}</p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                        {activity.difficulty && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {activity.difficulty}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">No recent activity</p>
                    <p className="text-xs mt-1">Solve problems in the last 7 days to see activity</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card 
              className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden group hover:border-blue-500/30 transition-all duration-500 shadow-xl hover:scale-[1.01] shine-effect"
              style={{ '--glow-color': '#3b82f6' } as React.CSSProperties}
            >
              {/* Animated glow borders */}
              <div className="glow-border-top" />
              <div className="glow-border-bottom" />
              <div className="glow-border-left" />
              <div className="glow-border-right" />
              
              {/* Enhanced background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-15 transition-opacity duration-700 pointer-events-none" />

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
                        className="group/event flex items-center justify-between p-3 rounded-lg border border-border/30 hover:bg-muted/30 transition-colors"
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
            <Card 
              className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden group hover:border-green-500/30 transition-all duration-500 shadow-xl hover:scale-[1.01] shine-effect"
              style={{ '--glow-color': '#22c55e' } as React.CSSProperties}
            >
              {/* Animated glow borders */}
              <div className="glow-border-top" />
              <div className="glow-border-bottom" />
              <div className="glow-border-left" />
              <div className="glow-border-right" />
              
              {/* Enhanced background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-15 transition-opacity duration-700 pointer-events-none" />

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
                      // Calculate progress stats
                      const total = plan.problem_count || 0;
                      const completed = plan.solved_count || 0; // Will be real data from API
                      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

                      return (
                        <div
                          key={plan.id}
                          className="group/plan cursor-pointer"
                          onClick={() => {
                            setSelectedStudyPlan({ id: plan.id, name: plan.name, color: plan.color, is_public: plan.is_public });
                            setShowStudyPlanDialog(true);
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground hover:text-brand transition-colors">{plan.name}</span>
                              {plan.is_default && (
                                <Badge variant="outline" className="text-xs h-5 border-brand/30">
                                  Default
                                </Badge>
                              )}
                              {plan.is_public && (
                                <Badge variant="outline" className="text-xs h-5 bg-green-500/10 text-green-500 border-green-500/30">
                                  Public
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {completed}/{total} solved ({percentage}%)
                              </span>
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
              onPlanCreated={refetchDashboard}
            />

            <EventDialog
              open={showUpcomingEventDialog}
              onOpenChange={setShowUpcomingEventDialog}
              selectedDate={eventToEdit?.event_date ? new Date(eventToEdit.event_date) : new Date()}
              onEventCreated={refetchDashboard}
              existingEvent={eventToEdit}
            />

            {selectedStudyPlan && (
              <StudyPlanDetailDialog
                open={showStudyPlanDialog}
                onOpenChange={setShowStudyPlanDialog}
                listId={selectedStudyPlan.id}
                listName={selectedStudyPlan.name}
                listColor={selectedStudyPlan.color}
                isPublic={selectedStudyPlan.is_public}
                onListUpdated={refetchDashboard}
              />
            )}

            {/* Onboarding Modal - Shows for users without school code */}
            {showOnboardingModal && !hasSchoolCode && (
              <OnboardingModal onComplete={handleOnboardingComplete} />
            )}

            {/* Questionnaire Modal - Shows after onboarding or for users with school code but incomplete questionnaire */}
            {showQuestionnaireModal && questionnaireData && !questionnaireCompleted && !showOnboardingModal && (
              <QuestionnaireModal
                items={questionnaireData.items}
                onComplete={handleQuestionnaireComplete}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}