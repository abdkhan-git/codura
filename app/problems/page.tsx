"use client";
/**
 * This is the problems page where users can browse, search, and filter coding problems.
 * It includes a navbar, problem statistics, search and filter options, and a paginated list of problems.
 * Users can also add problems to their custom lists via a dialog.
 */
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";
import CoduraLogo from "@/components/logos/codura-logo.svg";
import CoduraLogoDark from "@/components/logos/codura-logo-dark.svg";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { AddToListDialog } from "@/components/problems/add-to-list-dialog";
import dynamic from 'next/dynamic';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  X,
} from "lucide-react";

// Theme-aware user name component
function UserNameText({ name, email }: { name: string; email: string }) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? (resolvedTheme === 'dark' || theme === 'dark') : false;

  return (
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold truncate" style={{ color: isDark ? '#F4F4F5' : '#18181B' }}>
        {name}
      </p>
      <p className="text-xs truncate" style={{ color: isDark ? '#A1A1AA' : '#71717A' }}>
        {email}
      </p>
    </div>
  );
}

// Use dynamic imports to avoid build-time type issues with lucide-react
// @ts-ignore
const Search: any = dynamic(() => import('lucide-react').then(mod => mod.Search), { ssr: false });
// @ts-ignore
const Filter: any = dynamic(() => import('lucide-react').then(mod => mod.Filter), { ssr: false });
// @ts-ignore
const CheckCircle2: any = dynamic(() => import('lucide-react').then(mod => mod.CheckCircle2), { ssr: false });
// @ts-ignore
const Circle: any = dynamic(() => import('lucide-react').then(mod => mod.Circle), { ssr: false });
// @ts-ignore
const Lock: any = dynamic(() => import('lucide-react').then(mod => mod.Lock), { ssr: false });
// @ts-ignore
const TrendingUp: any = dynamic(() => import('lucide-react').then(mod => mod.TrendingUp), { ssr: false });
// @ts-ignore
const BarChart3: any = dynamic(() => import('lucide-react').then(mod => mod.BarChart3), { ssr: false });
// @ts-ignore
const Bookmark: any = dynamic(() => import('lucide-react').then(mod => mod.Bookmark), { ssr: false });
// @ts-ignore
const BookmarkPlus: any = dynamic(() => import('lucide-react').then(mod => mod.BookmarkPlus), { ssr: false });
// @ts-ignore
const User: any = dynamic(() => import('lucide-react').then(mod => mod.User), { ssr: false });
// @ts-ignore
const Settings: any = dynamic(() => import('lucide-react').then(mod => mod.Settings), { ssr: false });

interface Problem {
  id: number;
  leetcode_id: number;
  title: string;
  title_slug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  acceptance_rate: number;
  topic_tags: Array<{ name: string; slug: string }>;
  is_premium: boolean;
  has_solution: boolean;
  has_video_solution: boolean;
}

interface ProblemStats {
  total: number;
  byDifficulty: {
    Easy: number;
    Medium: number;
    Hard: number;
  };
}

interface UserData {
  name: string;
  email: string;
  avatar: string;
  username?: string;
}

export default function ProblemsPage() {
  const { theme: currentTheme } = useTheme();
  const [showBorder, setShowBorder] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [stats, setStats] = useState<ProblemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [availableTopics, setAvailableTopics] = useState<Array<{ name: string; slug: string; count: number }>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddToList, setShowAddToList] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<{ id: number; title: string } | null>(null);
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    const evaluateScrollPosition = () => {
      setShowBorder(window.pageYOffset >= 24);
    };
    window.addEventListener("scroll", evaluateScrollPosition);
    evaluateScrollPosition();
    return () => window.removeEventListener("scroll", evaluateScrollPosition);
  }, []);

  useEffect(() => {
    fetchProblems();
    fetchStats();
    fetchUserData();
  }, [currentPage, selectedDifficulty, searchTerm, selectedTopics]);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/profile');
      if (!response.ok) return;

      const data = await response.json();
      const fullName = data.profile?.full_name || data.user?.email?.split('@')[0] || 'User';
      const initials = fullName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      setUser({
        name: fullName,
        email: data.user?.email || '',
        avatar: data.profile?.avatar_url || initials,
        username: data.profile?.username || '',
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchProblems = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
      });

      if (selectedDifficulty !== 'all') {
        params.append('difficulty', selectedDifficulty);
      }

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      if (selectedTopics.length > 0) {
        params.append('tags', selectedTopics.join(','));
      }

      const response = await fetch(`/api/problems?${params}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load problems');
      }

      const data = await response.json();

      setProblems(data.problems || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching problems:', error);
      setError(error instanceof Error ? error.message : 'Failed to load problems');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/problems/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchTopics = async () => {
    try {
      const response = await fetch('/api/problems/topics');
      const data = await response.json();
      setAvailableTopics(data);
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  };

  // Fetch topics on initial load
  useEffect(() => {
    fetchTopics();
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'text-green-500 border-green-500/30';
      case 'Medium':
        return 'text-yellow-500 border-yellow-500/30';
      case 'Hard':
        return 'text-red-500 border-red-500/30';
      default:
        return 'text-gray-500';
    }
  };

  const toggleTopic = (topicSlug: string) => {
    setSelectedTopics(prev => {
      if (prev.includes(topicSlug)) {
        return prev.filter(slug => slug !== topicSlug);
      } else {
        return [...prev, topicSlug];
      }
    });
    setCurrentPage(1);
  };

  const clearTopics = () => {
    setSelectedTopics([]);
    setCurrentPage(1);
  };

  return (
    <div className="caffeine-theme min-h-screen bg-background relative">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute top-[-10%] right-[20%] w-[500px] h-[500px] bg-brand/5 dark:bg-brand/8 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-[10%] left-[15%] w-[400px] h-[400px] bg-purple-500/3 dark:bg-purple-500/6 rounded-full blur-[80px] animate-float-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Navbar */}
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b border-b-transparent bg-gradient-to-b shadow-none backdrop-blur-none transition-all duration-500",
          showBorder
            ? "border-b-border/50 shadow-xl backdrop-blur-md from-background/80 to-background/50"
            : ""
        )}
      >
        <div className="flex items-center justify-between py-4 max-w-7xl mx-auto px-6">
          <Link href="/" aria-label="Codura homepage" className="flex items-center group">
            <Image
              src={currentTheme === 'light' ? CoduraLogoDark : CoduraLogo}
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
            <Link className="text-brand transition-colors" href="/problems">
              Problems
            </Link>
            <Link className="hover:text-neutral-200 transition-colors" href="/mock-interview">
              Interview
            </Link>
            <Link className="hover:text-neutral-200 transition-colors" href="/leaderboards">
              Leaderboards
            </Link>
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 hover:bg-white/5">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-orange-300 flex items-center justify-center text-white font-semibold text-sm overflow-hidden relative">
                      {user.avatar && user.avatar.startsWith('http') ? (
                        <img
                          src={user.avatar}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm">{user.avatar}</span>
                      )}
                    </div>
                    <span className="hidden sm:inline text-sm text-neutral-400">
                      {user.name.split(' ')[0]}
                    </span>
                    <ChevronDown className="h-4 w-4 text-neutral-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-[280px]"
                >
                  {/* Profile Header - Modern & Elegant */}
                  <div className="px-3 py-3.5 mb-1">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand to-orange-300 flex items-center justify-center text-white font-semibold overflow-hidden ring-1 ring-border/50">
                          {user.avatar && user.avatar.startsWith('http') ? (
                            <img
                              src={user.avatar}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm">{user.avatar}</span>
                          )}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full ring-2 ring-card" />
                      </div>
                      <UserNameText name={user.name} email={user.email} />
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent my-1.5" />

                  {/* Menu Items - Balanced Design */}
                  <div className="py-1 space-y-0.5">
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/profile/${user?.username || ''}`}
                        className="flex items-center gap-2.5 px-3 py-2 cursor-pointer text-sm font-medium group"
                      >
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 dark:from-brand dark:to-orange-400 flex items-center justify-center group-hover:from-blue-600 group-hover:to-blue-700 dark:group-hover:from-brand/90 dark:group-hover:to-orange-500 transition-all shadow-sm">
                          {/* @ts-ignore */}
                          <User className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                        </div>
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link
                        href="/settings"
                        className="flex items-center gap-2.5 px-3 py-2 cursor-pointer text-sm font-medium group"
                      >
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-slate-500 to-slate-600 dark:from-brand dark:to-orange-400 flex items-center justify-center group-hover:from-slate-600 group-hover:to-slate-700 dark:group-hover:from-brand/90 dark:group-hover:to-orange-500 transition-all shadow-sm">
                          {/* @ts-ignore */}
                          <Settings className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                        </div>
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent my-1.5" />

                  {/* Sign Out - Professional Emphasis */}
                  <div className="py-1">
                    <DropdownMenuItem
                      variant="destructive"
                      className="flex items-center gap-2.5 px-3 py-2 cursor-pointer text-sm font-medium group"
                      onClick={async () => {
                        await fetch('/auth/signout', { method: 'POST' });
                        window.location.href = '/';
                      }}
                    >
                      <div className="w-5 h-5 rounded-md bg-gradient-to-br from-red-500 to-red-600 dark:from-red-500/80 dark:to-red-600/80 flex items-center justify-center group-hover:from-red-600 group-hover:to-red-700 dark:group-hover:from-red-500 dark:group-hover:to-red-600 transition-all shadow-sm">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </div>
                      <span className="text-red-600 dark:text-red-400">Sign out</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button variant="ghost" className="text-sm text-neutral-400 hover:text-neutral-200 hover:bg-white/5">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
        {/* Error State */}
        {error && !loading && (
          <Card className="mb-6 border-2 border-destructive/30 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl shadow-xl">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <X className="w-6 h-6 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-destructive mb-1">Failed to Load Problems</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button onClick={fetchProblems} variant="outline" size="sm">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Header with Stats */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground via-foreground to-brand bg-clip-text text-transparent">
            Problem Set
          </h1>
          <p className="text-muted-foreground text-lg">
            Master algorithms and data structures with our curated problems
          </p>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <Card 
                className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden group hover:border-brand/30 transition-all duration-500 shadow-xl hover:scale-[1.02] shine-effect"
                style={{ '--glow-color': 'var(--brand)' } as React.CSSProperties}
              >
                {/* Animated glow borders */}
                <div className="glow-border-top" />
                <div className="glow-border-bottom" />
                <div className="glow-border-left" />
                <div className="glow-border-right" />
                
                {/* Enhanced background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-15 transition-opacity duration-700 pointer-events-none" />
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {/* @ts-ignore */}
                    <BarChart3 className="w-8 h-8 text-brand group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="text-2xl font-bold">{stats.total}</p>
                      <p className="text-xs text-muted-foreground">Total Problems</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="relative border-2 border-green-500/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden group hover:border-green-500/40 transition-all duration-500 shadow-xl hover:scale-[1.02] shine-effect"
                style={{ '--glow-color': '#22c55e' } as React.CSSProperties}
              >
                {/* Animated glow borders */}
                <div className="glow-border-top" />
                <div className="glow-border-bottom" />
                <div className="glow-border-left" />
                <div className="glow-border-right" />
                
                {/* Enhanced background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-15 transition-opacity duration-700 pointer-events-none" />
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="text-green-500 font-bold">E</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-500">{stats.byDifficulty.Easy}</p>
                      <p className="text-xs text-muted-foreground">Easy</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="relative border-2 border-yellow-500/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden group hover:border-yellow-500/40 transition-all duration-500 shadow-xl hover:scale-[1.02] shine-effect"
                style={{ '--glow-color': '#eab308' } as React.CSSProperties}
              >
                {/* Animated glow borders */}
                <div className="glow-border-top" />
                <div className="glow-border-bottom" />
                <div className="glow-border-left" />
                <div className="glow-border-right" />
                
                {/* Enhanced background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-15 transition-opacity duration-700 pointer-events-none" />
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="text-yellow-500 font-bold">M</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-500">{stats.byDifficulty.Medium}</p>
                      <p className="text-xs text-muted-foreground">Medium</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="relative border-2 border-red-500/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden group hover:border-red-500/40 transition-all duration-500 shadow-xl hover:scale-[1.02] shine-effect"
                style={{ '--glow-color': '#ef4444' } as React.CSSProperties}
              >
                {/* Animated glow borders */}
                <div className="glow-border-top" />
                <div className="glow-border-bottom" />
                <div className="glow-border-left" />
                <div className="glow-border-right" />
                
                {/* Enhanced background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-15 transition-opacity duration-700 pointer-events-none" />
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="text-red-500 font-bold">H</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-500">{stats.byDifficulty.Hard}</p>
                      <p className="text-xs text-muted-foreground">Hard</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Filters - Modern Design */}
        <div className="mb-8">
          {/* Search Bar */}
          <div className="relative mb-6">
            <div className="relative group">
              {/* @ts-ignore */}
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-brand transition-colors" />
              <Input
                placeholder="Search by problem name or number..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-12 h-14 text-base text-foreground bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl border-2 border-border/20 hover:border-brand/30 focus:border-brand/50 transition-all duration-300 shadow-lg"
              />
            </div>
          </div>

          {/* Difficulty Filter - Pill Style */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Difficulty:</span>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedDifficulty === 'all' ? 'default' : 'outline'}
                size="lg"
                onClick={() => {
                  setSelectedDifficulty('all');
                  setCurrentPage(1);
                }}
                className={cn(
                  "rounded-full px-6 h-10 font-medium transition-all duration-300",
                  selectedDifficulty === 'all'
                    ? 'bg-gradient-to-r from-brand to-orange-300 hover:from-brand/90 hover:to-orange-300/90 text-brand-foreground shadow-lg shadow-brand/30 scale-105'
                    : 'border-2 hover:border-brand/50 hover:bg-brand/5 text-foreground'
                )}
              >
                All
              </Button>
              <Button
                variant={selectedDifficulty === 'Easy' ? 'default' : 'outline'}
                size="lg"
                onClick={() => {
                  setSelectedDifficulty('Easy');
                  setCurrentPage(1);
                }}
                className={cn(
                  "rounded-full px-6 h-10 font-medium transition-all duration-300",
                  selectedDifficulty === 'Easy'
                    ? 'bg-green-500 hover:bg-green-600 text-white dark:text-white shadow-lg shadow-green-500/30 scale-105'
                    : 'border-2 hover:border-green-500/50 hover:bg-green-500/5 text-foreground'
                )}
              >
                Easy
              </Button>
              <Button
                variant={selectedDifficulty === 'Medium' ? 'default' : 'outline'}
                size="lg"
                onClick={() => {
                  setSelectedDifficulty('Medium');
                  setCurrentPage(1);
                }}
                className={cn(
                  "rounded-full px-6 h-10 font-medium transition-all duration-300",
                  selectedDifficulty === 'Medium'
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white dark:text-white shadow-lg shadow-yellow-500/30 scale-105'
                    : 'border-2 hover:border-yellow-500/50 hover:bg-yellow-500/5 text-foreground'
                )}
              >
                Medium
              </Button>
              <Button
                variant={selectedDifficulty === 'Hard' ? 'default' : 'outline'}
                size="lg"
                onClick={() => {
                  setSelectedDifficulty('Hard');
                  setCurrentPage(1);
                }}
                className={cn(
                  "rounded-full px-6 h-10 font-medium transition-all duration-300",
                  selectedDifficulty === 'Hard'
                    ? 'bg-red-500 hover:bg-red-600 text-white dark:text-white shadow-lg shadow-red-500/30 scale-105'
                    : 'border-2 hover:border-red-500/50 hover:bg-red-500/5 text-foreground'
                )}
              >
                Hard
              </Button>
            </div>
          </div>

          {/* Topic Filter */}
          {availableTopics.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {/* @ts-ignore */}
                  <Filter className="w-5 h-5 text-brand" />
                  <span className="text-sm font-semibold text-foreground">Filter by Topics</span>
                  {selectedTopics.length > 0 && (
                    <Badge variant="secondary" className="bg-brand/10 text-brand border-brand/30">
                      {selectedTopics.length} selected
                    </Badge>
                  )}
                </div>
                {selectedTopics.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearTopics}
                    className="text-xs hover:text-brand hover:bg-brand/10"
                  >
                    Clear all
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {availableTopics.map((topic) => {
                  const isSelected = selectedTopics.includes(topic.slug);
                  return (
                    <Badge
                      key={topic.slug}
                      variant="outline"
                      className={cn(
                        "cursor-pointer transition-all duration-300 px-4 py-2 text-sm font-medium rounded-full",
                        isSelected
                          ? "bg-brand text-white border-brand hover:bg-brand/90 shadow-lg shadow-brand/30 scale-105"
                          : "border-2 border-border/30 hover:border-brand/50 hover:bg-brand/5 hover:scale-105"
                      )}
                      onClick={() => toggleTopic(topic.slug)}
                    >
                      {topic.name} <span className="text-xs opacity-70">({topic.count})</span>
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Problems List */}
        <Card className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden shadow-xl">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand"></div>
              </div>
            ) : problems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No problems found</p>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {problems.map((problem) => (
                  <div
                    key={problem.id}
                    className="group/problem hover:bg-gradient-to-r hover:from-brand/5 hover:to-transparent transition-all duration-300 border-l-2 border-transparent hover:border-brand/50"
                  >
                    <div className="p-4 flex items-center gap-4">
                      {/* Status Icon */}
                      <div className="flex-shrink-0">
                        {/* @ts-ignore */}
                        <Circle className="w-4 h-4 text-muted-foreground" />
                      </div>

                      {/* Problem Number & Title */}
                      <Link
                        href={`/problems/${problem.id}`}
                        className="flex-1 min-w-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground group-hover/problem:text-brand/70 transition-colors">
                            #{problem.leetcode_id}
                          </span>
                          <h3 className="font-medium truncate group-hover/problem:text-brand transition-colors duration-300">
                            {problem.title}
                          </h3>
                          {problem.is_premium && (
                            <>
                              {/* @ts-ignore */}
                              <Lock className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                            </>
                          )}
                        </div>
                      </Link>

                      {/* Tags */}
                      <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
                        {problem.topic_tags?.slice(0, 2).map((tag, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-xs border-border/40"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                        {(problem.topic_tags?.length || 0) > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{(problem.topic_tags?.length || 0) - 2}
                          </span>
                        )}
                      </div>

                      {/* Acceptance Rate */}
                      <div className="hidden md:block text-sm text-muted-foreground flex-shrink-0">
                        {problem.acceptance_rate?.toFixed(1)}%
                      </div>

                      {/* Difficulty */}
                      <div className="flex-shrink-0">
                        <Badge
                          variant="outline"
                          className={cn("text-xs", getDifficultyColor(problem.difficulty))}
                        >
                          {problem.difficulty}
                        </Badge>
                      </div>

                      {/* Add to List Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 opacity-50 group-hover/problem:opacity-100 transition-all hover:bg-brand/10 cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedProblem({ id: problem.id, title: problem.title });
                          setShowAddToList(true);
                        }}
                      >
                        {/* @ts-ignore */}
                        <BookmarkPlus className="w-4 h-4 text-foreground/70 group-hover/problem:text-brand" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="text-foreground cursor-pointer"
            >
              Previous
            </Button>

            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = currentPage <= 3 ? i + 1 : currentPage + i - 2;
                if (pageNum > totalPages) return null;
                return (
                  <Button
                    key={pageNum}
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      'cursor-pointer',
                      pageNum === currentPage
                        ? 'bg-brand hover:bg-brand/90 text-white border-brand'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="text-foreground cursor-pointer"
            >
              Next
            </Button>
          </div>
        )}
      </main>

      {selectedProblem && (
        <AddToListDialog
          open={showAddToList}
          onOpenChange={setShowAddToList}
          problemId={selectedProblem.id}
          problemTitle={selectedProblem.title}
        />
      )}
    </div>
  );
}
