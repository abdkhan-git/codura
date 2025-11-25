"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Trophy, Award, TrendingUp, Shield, Settings } from "lucide-react";
import DashboardNavbar from "@/components/navigation/dashboard-navbar";
import { DefaultAvatar } from "@/components/ui/default-avatar";
import { LeaderboardEntry } from "@/types/database";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import dynamic from 'next/dynamic';

// @ts-ignore
const Info: any = dynamic(() => import('lucide-react').then(mod => mod.Info), { ssr: false });
// @ts-ignore
const XCircle: any = dynamic(() => import('lucide-react').then(mod => mod.XCircle || mod.X), { ssr: false });

interface UserData {
  name: string;
  email: string;
  avatar: string;
  username?: string;
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  userRank: number | null;
  totalUsers: number;
  schoolCode: string | null;
  message: string | null;
}

type FilterType = 'total' | 'easy' | 'medium' | 'hard';

export default function LeaderboardPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse | null>(null);
  const [filter, setFilter] = useState<FilterType>('total');

  useEffect(() => {
    fetchUserAndLeaderboard();
  }, []);

  const fetchUserAndLeaderboard = async () => {
    try {
      setError(null);
      setLoading(true);

      // Fetch user profile
      const profileResponse = await fetch('/api/profile');
      if (!profileResponse.ok) {
        throw new Error('Failed to load profile data');
      }
      const profileData = await profileResponse.json();

      const fullName = profileData.profile?.full_name || profileData.user?.email?.split('@')[0] || 'User';
      const initials = fullName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      const userData = {
        name: fullName,
        email: profileData.user?.email || '',
        avatar: profileData.profile?.avatar_url || initials,
        username: profileData.profile?.username || '',
      };
      setUser(userData);

      // Fetch leaderboard
      const leaderboardResponse = await fetch('/api/leaderboard');
      if (!leaderboardResponse.ok) {
        throw new Error('Failed to load leaderboard data');
      }
      const leaderboard = await leaderboardResponse.json();
      setLeaderboardData(leaderboard);

    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Award className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-xl font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-br from-yellow-500 to-amber-500 shadow-lg shadow-yellow-500/25";
      case 2:
        return "bg-gradient-to-br from-gray-400 to-gray-500 shadow-lg shadow-gray-500/25";
      case 3:
        return "bg-gradient-to-br from-amber-600 to-orange-500 shadow-lg shadow-amber-500/25";
      default:
        return "bg-gradient-to-br from-zinc-500 to-zinc-600 shadow-lg shadow-zinc-500/25";
    }
  };

  // Get filtered and re-ranked leaderboard based on selected filter
  const getFilteredLeaderboard = () => {
    if (!leaderboardData?.leaderboard) return [];

    const leaderboard = [...leaderboardData.leaderboard];

    // Sort based on selected filter
    leaderboard.sort((a, b) => {
      let primarySort = 0;

      switch (filter) {
        case 'easy':
          primarySort = b.easy_solved - a.easy_solved;
          break;
        case 'medium':
          primarySort = b.medium_solved - a.medium_solved;
          break;
        case 'hard':
          primarySort = b.hard_solved - a.hard_solved;
          break;
        case 'total':
        default:
          primarySort = b.total_solved - a.total_solved;
          break;
      }

      // If primary sort is tied, use total_solved as tiebreaker (unless already sorting by total)
      if (primarySort === 0 && filter !== 'total') {
        primarySort = b.total_solved - a.total_solved;
      }

      // If still tied, use total_points
      if (primarySort === 0) {
        primarySort = b.total_points - a.total_points;
      }

      // Final tiebreaker: contest_rating
      if (primarySort === 0) {
        primarySort = b.contest_rating - a.contest_rating;
      }

      return primarySort;
    });

    // Re-assign ranks based on new sort order
    return leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  };

  const filteredLeaderboard = getFilteredLeaderboard();
  const userRankInFiltered = filteredLeaderboard.find(entry => entry.user_id === user?.username)?.rank || null;

  const getFilterLabel = (filterType: FilterType) => {
    switch (filterType) {
      case 'easy': return 'Easy';
      case 'medium': return 'Medium';
      case 'hard': return 'Hard';
      case 'total': return 'Total';
    }
  };

  const getFilterColor = (filterType: FilterType) => {
    switch (filterType) {
      case 'easy': return 'from-green-500 to-emerald-500';
      case 'medium': return 'from-yellow-500 to-amber-500';
      case 'hard': return 'from-red-500 to-rose-500';
      case 'total': return 'from-blue-500 to-purple-500';
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute top-[-10%] right-[20%] w-[500px] h-[500px] bg-amber-500/5 dark:bg-amber-500/8 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-[10%] left-[15%] w-[400px] h-[400px] bg-orange-500/3 dark:bg-orange-500/6 rounded-full blur-[80px] animate-float-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Navbar */}
      {user && <DashboardNavbar user={user} />}

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Trophy className="w-10 h-10 text-amber-500" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground via-foreground to-amber-500 bg-clip-text text-transparent">
              School Leaderboard
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Compete with students from your school and climb the ranks
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <Card className="border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl">
            <CardContent className="flex items-center justify-center p-12">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
                <p className="text-muted-foreground">Loading leaderboard...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card className="border-2 border-destructive/30 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-6 h-6 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-destructive mb-1">Failed to Load Leaderboard</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button onClick={fetchUserAndLeaderboard} variant="outline" size="sm">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* No School Affiliation Message */}
        {!loading && !error && leaderboardData?.message && (
          <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Info className="w-6 h-6 text-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-500 mb-1">No School Affiliation</h3>
                <p className="text-sm text-muted-foreground">{leaderboardData.message}</p>
              </div>
              <Link href="/settings">
                <Button variant="outline" size="sm">
                  Go to Settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Filter Buttons */}
        {!loading && !error && leaderboardData && leaderboardData.leaderboard.length > 0 && (
          <Card className="mb-6 border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Sort By
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Choose how to rank students
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(['total', 'easy', 'medium', 'hard'] as FilterType[]).map((filterType) => (
                    <Button
                      key={filterType}
                      onClick={() => setFilter(filterType)}
                      variant={filter === filterType ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "transition-all",
                        filter === filterType && `bg-gradient-to-r ${getFilterColor(filterType)} text-white border-0`
                      )}
                    >
                      {getFilterLabel(filterType)}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User's Current Rank Card */}
        {!loading && !error && leaderboardData && userRankInFiltered && (
          <Card className="mb-6 border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-card/30 to-transparent backdrop-blur-xl shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center",
                    getRankBadgeColor(userRankInFiltered)
                  )}>
                    {getRankIcon(userRankInFiltered)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Your Rank ({getFilterLabel(filter)})
                    </p>
                    <h3 className="text-3xl font-bold text-foreground">#{userRankInFiltered}</h3>
                    <p className="text-sm text-muted-foreground">out of {filteredLeaderboard.length} students</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-amber-500">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-sm font-medium">Keep climbing!</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard Table */}
        {!loading && !error && leaderboardData && leaderboardData.leaderboard.length > 0 && (
          <Card className="border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl shadow-xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-500" />
                Top Performers
              </CardTitle>
              <CardDescription>
                Students from your school ranked by {filter === 'total' ? 'total problems solved' : `${getFilterLabel(filter).toLowerCase()} problems solved`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border/20">
                    <tr className="text-sm text-muted-foreground">
                      <th className="text-left p-4 font-medium">Rank</th>
                      <th className="text-left p-4 font-medium">Student</th>
                      <th className="text-center p-4 font-medium">Total Solved</th>
                      <th className="text-center p-4 font-medium hidden sm:table-cell">Easy</th>
                      <th className="text-center p-4 font-medium hidden sm:table-cell">Medium</th>
                      <th className="text-center p-4 font-medium hidden sm:table-cell">Hard</th>
                      <th className="text-center p-4 font-medium hidden md:table-cell">Streak</th>
                      <th className="text-center p-4 font-medium hidden lg:table-cell">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaderboard.map((entry) => {
                      const isCurrentUser = entry.user_id === user?.username;
                      return (
                        <tr
                          key={entry.user_id}
                          className={cn(
                            "border-b border-border/10 transition-colors hover:bg-muted/30",
                            isCurrentUser && "bg-amber-500/5"
                          )}
                        >
                          <td className="p-4">
                            <div className="flex items-center justify-center w-12 h-12">
                              {getRankIcon(entry.rank)}
                            </div>
                          </td>
                          <td className="p-4">
                            <Link
                              href={entry.username ? `/profile/${entry.username}` : '#'}
                              className="flex items-center gap-3 group"
                            >
                              <DefaultAvatar
                                src={entry.avatar_url}
                                name={entry.full_name}
                                username={entry.username}
                                size="md"
                                className="ring-2 ring-background"
                              />
                              <div>
                                <p className="font-medium group-hover:text-amber-500 transition-colors">
                                  {entry.full_name || entry.username || 'Anonymous'}
                                  {isCurrentUser && (
                                    <span className="ml-2 text-xs text-amber-500">(You)</span>
                                  )}
                                </p>
                                {entry.username && (
                                  <p className="text-xs text-muted-foreground">@{entry.username}</p>
                                )}
                              </div>
                            </Link>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-center">
                              <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 font-bold">
                                {entry.total_solved}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-center hidden sm:table-cell">
                            <span className="text-green-500 font-medium">{entry.easy_solved}</span>
                          </td>
                          <td className="p-4 text-center hidden sm:table-cell">
                            <span className="text-yellow-500 font-medium">{entry.medium_solved}</span>
                          </td>
                          <td className="p-4 text-center hidden sm:table-cell">
                            <span className="text-red-500 font-medium">{entry.hard_solved}</span>
                          </td>
                          <td className="p-4 text-center hidden md:table-cell">
                            <span className="text-muted-foreground">{entry.current_streak} days</span>
                          </td>
                          <td className="p-4 text-center hidden lg:table-cell">
                            <span className="text-muted-foreground">{entry.total_points.toLocaleString()}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Privacy Notice */}
        {!loading && !error && leaderboardData && leaderboardData.leaderboard.length > 0 && (
          <Card className="mt-6 border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Privacy Information</h3>
                  <p className="text-sm text-muted-foreground">
                    Only public profiles from your school are shown on the leaderboard.
                    You can manage your profile visibility in{' '}
                    <Link href="/settings" className="text-amber-500 hover:underline">
                      Settings
                    </Link>.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && leaderboardData && leaderboardData.leaderboard.length === 0 && !leaderboardData.message && (
          <Card className="border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <Trophy className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Students Yet</h3>
              <p className="text-muted-foreground">
                Be the first from your school to start solving problems!
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
