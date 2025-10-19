"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  Trophy,
  Calendar,
  Code,
  Award,
  Flame,
  TrendingUp,
  Share2,
  MapPin,
  Briefcase,
  GraduationCap,
  Github,
  Linkedin,
  Globe,
  CheckCircle2
} from "lucide-react";
import { EditProfileDialog } from "@/components/edit-profile-dialog";
import { UserProfile, UserStats, Submission } from "@/types/database";
import RecentSubmissions from "@/components/RecentSubmissions";
import ActivityCalendar from "react-activity-calendar";
import { StudyPlanDetailDialog } from "@/components/study-plans/study-plan-detail-dialog";
import { PrivacyBlurOverlay, PrivacyBadge } from "@/components/privacy-blur-overlay";
import { InteractivePieChart } from "@/components/ui/interactive-pie-chart";
import { processLanguageData, processDifficultyData, getChartSummaryStats } from "@/lib/chart-data-processor";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import DashboardNavbar from "@/components/navigation/dashboard-navbar";
import { RecentActivityCard } from "@/components/social/recent-activity-card";

interface Achievement {
  achievement_id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earned_at: string;
  requirement_type: string;
  requirement_value: number;
}

interface AchievementSummary {
  total_achievements: number;
  latest_achievement_name: string | null;
  latest_achievement_date: string | null;
  achievement_progress: Achievement[];
}

interface ProfileData {
  user?: {
    id: string;
    email: string | undefined;
  };
  profile: UserProfile | null;
  stats: UserStats | null;
  submissions: Submission[];
  achievements: Achievement[];
  achievementSummary: AchievementSummary;
  publicLists?: any[];
  isPrivate?: boolean;
}

const generateContributionData = (submissions: Submission[]) => {
  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  const submissionsByDate = new Map<string, number>();
  submissions.forEach(sub => {
    const date = new Date(sub.submitted_at).toISOString().split('T')[0];
    submissionsByDate.set(date, (submissionsByDate.get(date) || 0) + 1);
  });

  const data: Array<{ date: string; count: number; level: number }> = [];
  const currentDate = new Date(oneYearAgo);

  while (currentDate <= today) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const count = submissionsByDate.get(dateStr) || 0;

    data.push({
      date: dateStr,
      count,
      level: count === 0 ? 0 : count <= 2 ? 1 : count <= 4 ? 2 : count <= 6 ? 3 : 4
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return data;
};

const iconMap: Record<string, string> = {
  'Code': '💻',
  'CheckCircle': '✅',
  'Flame': '🔥',
  'Fire': '🔥',
  'Zap': '⚡',
  'Target': '🎯',
  'TrendingUp': '📈',
  'Award': '🏆',
  'Trophy': '🏆',
  'Crown': '👑',
  'Star': '⭐',
  'Sparkles': '✨',
  'Check': '✔️',
  'Video': '🎥',
  'Users': '👥',
};

export default function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const resolvedParams = React.use(params);
  const username = resolvedParams.username;
  const { theme } = useTheme();

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'submissions' | 'lists'>('submissions');
  const [userLists, setUserLists] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState<any | null>(null);
  const [showListDialog, setShowListDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    try {
      setLoading(true);

      // Check if viewing own profile
      const currentUserResponse = await fetch('/api/profile');
      let isOwn = false;

      if (currentUserResponse.ok) {
        const currentUserData = await currentUserResponse.json();
        isOwn = currentUserData?.profile?.username === username;
        setIsOwnProfile(isOwn);

        // Set current user for navbar
        setCurrentUser({
          name: currentUserData.profile?.full_name || currentUserData.user?.email?.split('@')[0] || 'User',
          email: currentUserData.user?.email || '',
          avatar: currentUserData.profile?.avatar_url || currentUserData.profile?.full_name?.charAt(0).toUpperCase() || 'U',
          username: currentUserData.profile?.username || '',
        });

        if (isOwn) {
          // Viewing own profile - get all lists
          const listsResponse = await fetch('/api/study-plans');
          let userListsData = [];
          if (listsResponse.ok) {
            const listsData = await listsResponse.json();
            userListsData = listsData.userLists || [];
          }

          setProfileData({
            user: currentUserData.user,
            profile: currentUserData.profile,
            stats: currentUserData.stats,
            submissions: currentUserData.submissions,
            achievements: currentUserData.achievements,
            achievementSummary: currentUserData.achievementSummary,
          });
          setUserLists(userListsData);
          setLoading(false);
          return;
        }
      }

      // Viewing someone else's profile - get public data only
      const response = await fetch(`/api/profile/public/${username}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('User not found');
        }
        throw new Error('Failed to fetch profile data');
      }

      const data = await response.json();
      setProfileData(data);
      setUserLists(data.publicLists || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyProfileLink = () => {
    const profileUrl = `${window.location.origin}/profile/${username}`;
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
    if (profileData) {
      setProfileData({
        ...profileData,
        profile: updatedProfile,
      });
    }
  };

  if (loading) {
    return (
      <div className="caffeine-theme min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="caffeine-theme min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <Trophy className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Failed to load profile</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { profile, stats, submissions, achievements, achievementSummary } = profileData;
  const contributionData = generateContributionData(submissions);
  const totalContributions = submissions.length;

  const getInitials = () => {
    if (profile?.full_name) {
      const names = profile.full_name.split(' ');
      return names.map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return profile?.username?.[0]?.toUpperCase() || 'U';
  };

  return (
    <TooltipProvider>
    <div className="caffeine-theme min-h-screen bg-background relative">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute top-[-10%] right-[20%] w-[500px] h-[500px] bg-brand/5 dark:bg-brand/8 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-[10%] left-[15%] w-[400px] h-[400px] bg-purple-500/3 dark:bg-purple-500/6 rounded-full blur-[80px] animate-float-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] right-[60%] w-[300px] h-[300px] bg-blue-500/3 dark:bg-blue-500/5 rounded-full blur-[70px] animate-float" style={{ animationDelay: '4s' }} />

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

      {/* Navbar */}
      {currentUser && <DashboardNavbar user={currentUser} />}

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
        {/* Profile Header */}
        <Card 
          className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden mb-8 shadow-xl shine-effect group hover:border-brand/40 transition-all duration-500 hover:scale-[1.01]"
          style={{ '--glow-color': 'var(--brand)' } as React.CSSProperties}
        >
          {/* Animated glow borders */}
          <div className="glow-border-top" />
          <div className="glow-border-bottom" />
          <div className="glow-border-left" />
          <div className="glow-border-right" />
          
          {/* Enhanced background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-12 transition-opacity duration-700 pointer-events-none" />

          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Avatar & Basic Info */}
              <div className="flex flex-col items-center md:items-start gap-4">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-brand to-orange-300 flex items-center justify-center text-white font-bold text-4xl shadow-xl shadow-brand/20 overflow-hidden relative">
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.full_name || 'User avatar'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    getInitials()
                  )}
                </div>
                <div className="text-center md:text-left">
                  <h1 className="text-3xl font-bold mb-1">{profile?.full_name || 'Anonymous User'}</h1>
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <p className="text-muted-foreground">@{profile?.username || 'user'}</p>
                    {!isOwnProfile && profile && (
                      <PrivacyBadge isPublic={profile.is_public ?? true} />
                    )}
                  </div>
                  {profile?.created_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-2 cursor-pointer" onClick={handleCopyProfileLink}>
                        <Share2 className="w-4 h-4" />
                        {copied ? 'Copied!' : 'Share'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy profile link to clipboard</p>
                    </TooltipContent>
                  </Tooltip>
                  {isOwnProfile && <EditProfileDialog profile={profile} onProfileUpdate={handleProfileUpdate} />}
                </div>
              </div>

              {/* Bio & Details */}
              <div className="flex-1">
                <p className="text-muted-foreground mb-6">{profile?.bio || 'No bio yet.'}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {profile?.university && (
                    <div className="flex items-center gap-2 text-sm">
                      <GraduationCap className="w-4 h-4 text-brand" />
                      <span>{profile.university} {profile.graduation_year ? `'${profile.graduation_year.slice(-2)}` : ''}</span>
                    </div>
                  )}
                  {profile?.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-brand" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                  {profile?.job_title && (
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="w-4 h-4 text-brand" />
                      <span>{profile.job_title}</span>
                    </div>
                  )}
                  {profile?.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="w-4 h-4 text-brand" />
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="hover:text-brand transition-colors">
                        Portfolio
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  {profile?.github_username && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a href={`https://github.com/${profile.github_username}`} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost" className="gap-2 hover:bg-white/5 dark:hover:bg-white/5 hover:bg-muted cursor-pointer">
                            <Github className="w-4 h-4" />
                            GitHub
                          </Button>
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View GitHub profile</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {profile?.linkedin_username && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a href={`https://linkedin.com/in/${profile.linkedin_username}`} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost" className="gap-2 hover:bg-white/5 dark:hover:bg-white/5 hover:bg-muted cursor-pointer">
                            <Linkedin className="w-4 h-4" />
                            LinkedIn
                          </Button>
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View LinkedIn profile</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/20 border border-border/30">
                  <div className="text-2xl font-bold text-brand">#{stats?.university_rank || '-'}</div>
                  <div className="text-xs text-muted-foreground">University Rank</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/20 border border-border/30">
                  <div className="text-2xl font-bold">{stats?.total_points || 0}</div>
                  <div className="text-xs text-muted-foreground">Total Points</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/20 border border-border/30">
                  <div className="text-2xl font-bold">{stats?.contest_rating || 0}</div>
                  <div className="text-xs text-muted-foreground">Contest Rating</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/20 border border-border/30">
                  <div className="text-2xl font-bold text-brand">{stats?.current_streak || 0} 🔥</div>
                  <div className="text-xs text-muted-foreground">Day Streak</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GitHub-Style Contribution Grid - Only show for public profiles or own profile */}
        {(isOwnProfile || !(profileData?.isPrivate ?? false)) && (
        <Card 
          className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden mb-8 shadow-xl shine-effect group hover:border-green-500/40 transition-all duration-500 hover:scale-[1.01]"
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
              <div>
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-500" />
                  {totalContributions} submissions in {new Date().getFullYear()}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Longest streak: {stats?.longest_streak || 0} {stats?.longest_streak === 1 ? 'day' : 'days'} • Current streak: {stats?.current_streak || 0} {stats?.current_streak === 1 ? 'day' : 'days'}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <ActivityCalendar
              data={contributionData}
              theme={{
                light: ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'],
                dark: ['#161618', '#0e4429', '#006d32', '#26a641', '#39d353'],
              }}
              colorScheme={theme === 'dark' ? 'dark' : 'light'}
              blockSize={12}
              blockMargin={4}
              fontSize={14}
              hideColorLegend={false}
              hideMonthLabels={false}
              hideTotalCount={true}
              showWeekdayLabels={true}
              labels={{
                totalCount: '{{count}} submissions in {{year}}',
              }}
              renderBlock={(block, activity) => (
                <>
                  {block}
                  <title>
                    {activity.count} {activity.count === 1 ? 'submission' : 'submissions'} on {new Date(activity.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </title>
                </>
              )}
              style={{
                color: 'hsl(var(--muted-foreground))',
              }}
            />
          </CardContent>
        </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Problem Solving Stats */}
            <Card 
              className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden shadow-xl shine-effect group hover:border-brand/40 transition-all duration-500 hover:scale-[1.01]"
              style={{ '--glow-color': 'var(--brand)' } as React.CSSProperties}
            >
              {/* Animated glow borders */}
              <div className="glow-border-top" />
              <div className="glow-border-bottom" />
              <div className="glow-border-left" />
              <div className="glow-border-right" />
              
              {/* Enhanced background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-15 transition-opacity duration-700 pointer-events-none" />

              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-brand" />
                  Problem Solving
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Solved</span>
                    <span className="text-3xl font-bold">{stats?.total_solved || 0}</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full" />
                        <span className="text-sm">Easy</span>
                      </div>
                      <span className="text-sm font-semibold">{stats?.easy_solved || 0}</span>
                    </div>
                    <div className="w-full bg-muted/30 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${((stats?.easy_solved || 0) / 100) * 100}%` }} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                        <span className="text-sm">Medium</span>
                      </div>
                      <span className="text-sm font-semibold">{stats?.medium_solved || 0}</span>
                    </div>
                    <div className="w-full bg-muted/30 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full transition-all" style={{ width: `${((stats?.medium_solved || 0) / 100) * 100}%` }} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full" />
                        <span className="text-sm">Hard</span>
                      </div>
                      <span className="text-sm font-semibold">{stats?.hard_solved || 0}</span>
                    </div>
                    <div className="w-full bg-muted/30 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full transition-all" style={{ width: `${((stats?.hard_solved || 0) / 100) * 100}%` }} />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Acceptance Rate</span>
                      <span className="text-lg font-semibold text-brand">{stats?.acceptance_rate || 0}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity Card */}
            {profile?.user_id && (
              <RecentActivityCard
                userId={profile.user_id}
                username={profile.username || undefined}
                className="mt-6"
              />
            )}

            {/* Tabbed Section: Recent Submissions & Lists */}
            <Card 
              className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden shadow-xl shine-effect group hover:border-purple-500/40 transition-all duration-500 hover:scale-[1.01]"
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
                <div className="flex items-center gap-4 border-b border-border/20 pb-3">
                  <button
                    onClick={() => setActiveTab('submissions')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
                      activeTab === 'submissions'
                        ? "bg-brand/10 text-brand border border-brand/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Recent Submissions
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('lists')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
                      activeTab === 'lists'
                        ? "bg-brand/10 text-brand border border-brand/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      Lists ({userLists.length})
                    </div>
                  </button>
                </div>
              </CardHeader>

              <CardContent>
                {activeTab === 'submissions' ? (
                  <PrivacyBlurOverlay
                    isPrivate={!isOwnProfile && (profileData?.isPrivate ?? false)}
                    title="Submissions are Private"
                    description={`Connect with ${profile?.full_name || profile?.username || 'this user'} to view their detailed submission activity and progress`}
                    showConnectButton={true}
                  >
                    <RecentSubmissions submissions={submissions} isOwnProfile={isOwnProfile} />
                  </PrivacyBlurOverlay>
                ) : (
                  <div className="space-y-3">
                    {userLists.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Code className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No {isOwnProfile ? '' : 'public '}study plan lists yet</p>
                        {isOwnProfile && <p className="text-xs mt-1">Create a list from your dashboard!</p>}
                      </div>
                    ) : (
                      userLists.map((list) => {
                        const totalProblems = list.problem_count || 0;
                        const solvedProblems = list.solved_count || 0;
                        const progressPercent = totalProblems > 0 ? Math.round((solvedProblems / totalProblems) * 100) : 0;

                        return (
                          <div
                            key={list.id}
                            onClick={() => {
                              setSelectedList(list);
                              setShowListDialog(true);
                            }}
                            className="group p-4 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/30 transition-all cursor-pointer hover:border-brand/30 relative overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-brand/5 via-purple-500/5 to-brand/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="relative flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold">{list.name}</h4>
                                  {list.is_public && (
                                    <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
                                      Public
                                    </Badge>
                                  )}
                                  {!list.is_public && isOwnProfile && (
                                    <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-500 border-gray-500/30">
                                      Private
                                    </Badge>
                                  )}
                                </div>
                                {list.description && (
                                  <p className="text-sm text-muted-foreground mb-3">{list.description}</p>
                                )}

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Progress</span>
                                    <span className="font-semibold">
                                      {solvedProblems}/{totalProblems} solved ({progressPercent}%)
                                    </span>
                                  </div>

                                  <div className="w-full bg-muted/30 rounded-full h-2">
                                    <div
                                      className="bg-gradient-to-r from-brand to-purple-500 h-2 rounded-full transition-all"
                                      style={{ width: `${progressPercent}%` }}
                                    />
                                  </div>

                                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                                    <span>{totalProblems} problems</span>
                                    <span>•</span>
                                    <span>Created {new Date(list.created_at).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                              <div className={cn("w-12 h-12 rounded-lg bg-gradient-to-br", list.color, "flex items-center justify-center flex-shrink-0 shadow-lg")}>
                                <Code className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Achievements */}
          <div>
            <Card 
              className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden shadow-xl shine-effect group hover:border-yellow-500/40 transition-all duration-500 hover:scale-[1.01]"
              style={{ '--glow-color': '#eab308' } as React.CSSProperties}
            >
              {/* Animated glow borders */}
              <div className="glow-border-top" />
              <div className="glow-border-bottom" />
              <div className="glow-border-left" />
              <div className="glow-border-right" />
              
              {/* Enhanced background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-15 transition-opacity duration-700 pointer-events-none" />

              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Award className="w-5 h-5 text-yellow-500" />
                      Achievements
                      <span className="ml-1 text-sm font-normal text-muted-foreground">
                        ({achievementSummary.total_achievements})
                      </span>
                    </CardTitle>
                    {achievementSummary.latest_achievement_name && (
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                        <span className="text-yellow-500">⭐</span>
                        Latest: {achievementSummary.latest_achievement_name}
                      </p>
                    )}
                  </div>
                  {!isOwnProfile && (profileData?.isPrivate ?? false) && achievementSummary.total_achievements > 3 && (
                    <div className="px-2.5 py-1 rounded-full bg-muted/50 border border-border/30 text-[11px] font-medium text-muted-foreground">
                      {achievementSummary.total_achievements - 3} locked
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-2.5">
                {achievements.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">No achievements yet</p>
                    <p className="text-xs mt-1.5">Solve problems to unlock achievements!</p>
                  </div>
                ) : (
                  <>
                    {/* Always show top 3 achievements for private profiles, or all for public */}
                    {achievements.map((achievement) => (
                      <div
                        key={achievement.achievement_id}
                        className="group p-3.5 rounded-lg border border-border/40 bg-gradient-to-br from-muted/10 to-muted/20 hover:from-muted/20 hover:to-muted/30 transition-all duration-200 hover:border-brand/30 hover:shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-2xl flex-shrink-0 transition-transform group-hover:scale-110">
                            {iconMap[achievement.icon] || '🏅'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={cn("font-semibold text-sm mb-0.5 group-hover:text-brand transition-colors", achievement.color)}>
                              {achievement.name}
                            </h4>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">
                              {achievement.description}
                            </p>
                            <p className="text-[11px] text-muted-foreground/70 font-medium">
                              {new Date(achievement.earned_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <CheckCircle2 className="w-4.5 h-4.5 text-green-500 flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                    
                    {/* Show blur overlay for remaining achievements on private profiles */}
                    {!isOwnProfile && (profileData?.isPrivate ?? false) && achievementSummary.total_achievements > 3 && (
                      <PrivacyBlurOverlay
                        isPrivate={true}
                        title={`${achievementSummary.total_achievements - 3} More Achievement${achievementSummary.total_achievements - 3 > 1 ? 's' : ''} Locked`}
                        description={`Connect with ${profile?.full_name?.split(' ')[0] || profile?.username || 'this user'} to view all ${achievementSummary.total_achievements} achievements`}
                        showConnectButton={true}
                        className="min-h-[200px] mt-3"
                      >
                        <div className="space-y-2.5 pt-1">
                          {Array.from({ length: Math.min(2, achievementSummary.total_achievements - 3) }).map((_, i) => (
                            <div key={i} className="p-3 rounded-lg border border-border/30 bg-muted/10 backdrop-blur-sm">
                              <div className="flex items-start gap-3">
                                <div className="text-2xl flex-shrink-0 opacity-60">🏆</div>
                                <div className="flex-1 space-y-1.5">
                                  <div className="h-3.5 bg-muted/60 rounded w-2/3 animate-pulse"></div>
                                  <div className="h-2.5 bg-muted/40 rounded w-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                                  <div className="h-2 bg-muted/30 rounded w-1/2 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                                <div className="w-5 h-5 rounded-full bg-muted/50 flex-shrink-0"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </PrivacyBlurOverlay>
                    )}
                    
                    {/* For public profiles, show count if more than shown */}
                    {(isOwnProfile || !(profileData?.isPrivate ?? false)) && achievementSummary.total_achievements > achievements.length && (
                      <div className="text-center pt-1 pb-0.5">
                        <p className="text-xs text-muted-foreground/80 font-medium">
                          +{achievementSummary.total_achievements - achievements.length} more {achievementSummary.total_achievements - achievements.length === 1 ? 'achievement' : 'achievements'}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Interactive Pie Chart - Show for all profiles, but blur for private profiles */}
            {submissions.length > 0 && (
              <div className="mt-6">
                <PrivacyBlurOverlay
                  isPrivate={!isOwnProfile && (profileData?.isPrivate ?? false)}
                  title="Analytics are Private"
                  description={`Connect with ${profile?.full_name || profile?.username || 'this user'} to view their coding analytics and language distribution`}
                  showConnectButton={true}
                >
                  <InteractivePieChart
                    languageData={processLanguageData(submissions)}
                    difficultyData={processDifficultyData(submissions)}
                    totalSolved={stats?.total_solved || 0}
                    totalSubmissions={submissions.length}
                  />
                </PrivacyBlurOverlay>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Study Plan Detail Dialog */}
      {selectedList && (
        <StudyPlanDetailDialog
          open={showListDialog}
          onOpenChange={setShowListDialog}
          listId={selectedList.id}
          listName={selectedList.name}
          listColor={selectedList.color}
          isPublic={selectedList.is_public}
          isReadOnly={!isOwnProfile}
          onListUpdated={fetchProfile}
        />
      )}
    </div>
    </TooltipProvider>
  );
}
