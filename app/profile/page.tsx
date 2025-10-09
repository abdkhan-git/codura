"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import CoduraLogo from "@/components/logos/codura-logo.svg";
import { cn } from "@/lib/utils";
import {
  Trophy,
  Calendar,
  Code,
  Video,
  Users,
  Award,
  Flame,
  Star,
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
  user: {
    id: string;
    email: string | undefined;
  };
  profile: UserProfile | null;
  stats: UserStats | null;
  submissions: Submission[];
  achievements: Achievement[];
  achievementSummary: AchievementSummary;
}

// Convert submissions to format expected by react-activity-calendar
const generateContributionData = (submissions: Submission[]) => {
  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  // Create a map of dates to submission counts
  const submissionsByDate = new Map<string, number>();
  submissions.forEach(sub => {
    const date = new Date(sub.submitted_at).toISOString().split('T')[0];
    submissionsByDate.set(date, (submissionsByDate.get(date) || 0) + 1);
  });

  // Generate array of all days with submission counts
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

// Icon mapping for achievements - emoji fallback
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

export default function ProfilePage() {
  const [showBorder, setShowBorder] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const evaluateScrollPosition = () => {
      setShowBorder(window.pageYOffset >= 24);
    };
    window.addEventListener("scroll", evaluateScrollPosition);
    evaluateScrollPosition();
    return () => window.removeEventListener("scroll", evaluateScrollPosition);
  }, []);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/profile');

      if (!response.ok) {
        throw new Error('Failed to fetch profile data');
      }

      const data = await response.json();
      setProfileData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
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
      <div className="caffeine-theme min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="caffeine-theme min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Trophy className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Failed to load profile</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchProfileData}>Try Again</Button>
        </div>
      </div>
    );
  }

  const { user, profile, stats, submissions, achievements, achievementSummary } = profileData;

  // Generate contribution data from submissions
  const contributionData = generateContributionData(submissions);
  const totalContributions = submissions.length;

  // Get user's initials for avatar
  const getInitials = () => {
    if (profile?.full_name) {
      const names = profile.full_name.split(' ');
      return names.map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.email?.[0]?.toUpperCase() || 'U';
  };

  return (
    <div className="caffeine-theme min-h-screen bg-zinc-950 relative">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-zinc-950" />
        <div className="absolute top-[-10%] right-[20%] w-[500px] h-[500px] bg-brand/8 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-[10%] left-[15%] w-[400px] h-[400px] bg-purple-500/6 rounded-full blur-[80px] animate-float-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] right-[60%] w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[70px] animate-float" style={{ animationDelay: '4s' }} />

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
            <Link className="hover:text-neutral-200 transition-colors" href="/dashboard">
              Dashboard
            </Link>
            <Link className="hover:text-neutral-200 transition-colors" href="/problems">
              Problems
            </Link>
            <Link className="hover:text-neutral-200 transition-colors" href="/mock-interview">
              Interview
            </Link>
            <Link className="hover:text-neutral-200 transition-colors" href="/leaderboards">
              Leaderboards
            </Link>
          </nav>

          <Link href="/dashboard">
            <Button variant="ghost" className="text-sm text-neutral-400 hover:text-neutral-200 hover:bg-white/5">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
        {/* Profile Header */}
        <Card className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden mb-8 shadow-xl">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Avatar & Basic Info */}
              <div className="flex flex-col items-center md:items-start gap-4">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-brand to-orange-300 flex items-center justify-center text-white font-bold text-4xl shadow-xl shadow-brand/20">
                  {getInitials()}
                </div>
                <div className="text-center md:text-left">
                  <h1 className="text-3xl font-bold mb-1">{profile?.full_name || 'Anonymous User'}</h1>
                  <p className="text-muted-foreground">@{profile?.username || 'user'}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-2">
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                  <EditProfileDialog profile={profile} onProfileUpdate={handleProfileUpdate} />
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
                    <a href={`https://github.com/${profile.github_username}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost" className="gap-2 hover:bg-white/5">
                        <Github className="w-4 h-4" />
                        GitHub
                      </Button>
                    </a>
                  )}
                  {profile?.linkedin_username && (
                    <a href={`https://linkedin.com/in/${profile.linkedin_username}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost" className="gap-2 hover:bg-white/5">
                        <Linkedin className="w-4 h-4" />
                        LinkedIn
                      </Button>
                    </a>
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

        {/* GitHub-Style Contribution Grid */}
        <Card className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden mb-8 shadow-xl">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />

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
                light: ['#161618', '#0e4429', '#006d32', '#26a641', '#39d353'],
                dark: ['#161618', '#0e4429', '#006d32', '#26a641', '#39d353'],
              }}
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
              style={{
                color: 'hsl(var(--muted-foreground))',
              }}
            />
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Problem Solving Stats */}
            <Card className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden shadow-xl">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

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

            {/* Recent Submissions */}
            <Card className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden shadow-xl">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  Recent Submissions
                </CardTitle>
              </CardHeader>

              <CardContent>
                <RecentSubmissions submissions={submissions} />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Achievements */}
          <div>
            <Card className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden shadow-xl">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent" />

              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" />
                  Achievements ({achievementSummary.total_achievements})
                </CardTitle>
                {achievementSummary.latest_achievement_name && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Latest: {achievementSummary.latest_achievement_name}
                  </p>
                )}
              </CardHeader>

              <CardContent className="space-y-3">
                {achievements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No achievements yet</p>
                    <p className="text-xs mt-1">Solve problems to unlock achievements!</p>
                  </div>
                ) : (
                  <>
                    {achievements.slice(0, 6).map((achievement) => (
                      <div
                        key={achievement.achievement_id}
                        className="p-3 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/30 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-2xl flex-shrink-0">
                            {iconMap[achievement.icon] || '🏅'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={cn("font-semibold text-sm mb-0.5", achievement.color)}>
                              {achievement.name}
                            </h4>
                            <p className="text-xs text-muted-foreground mb-1">
                              {achievement.description}
                            </p>
                            <p className="text-xs text-muted-foreground/60">
                              {new Date(achievement.earned_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                    {achievements.length > 6 && (
                      <div className="text-center pt-2">
                        <p className="text-xs text-muted-foreground">
                          +{achievements.length - 6} more achievements
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
