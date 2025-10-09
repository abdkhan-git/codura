"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";
import CoduraLogo from "@/components/logos/codura-logo.svg";
import { cn } from "@/lib/utils";
import { AddToListDialog } from "@/components/problems/add-to-list-dialog";
import dynamic from 'next/dynamic';

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

export default function ProblemsPage() {
  const [showBorder, setShowBorder] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [stats, setStats] = useState<ProblemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddToList, setShowAddToList] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<{ id: number; title: string } | null>(null);

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
  }, [currentPage, selectedDifficulty, searchTerm]);

  const fetchProblems = async () => {
    setLoading(true);
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

      const response = await fetch(`/api/problems?${params}`);
      const data = await response.json();

      setProblems(data.problems || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching problems:', error);
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

  return (
    <div className="caffeine-theme min-h-screen bg-zinc-950 relative">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-zinc-950" />
        <div className="absolute top-[-10%] right-[20%] w-[500px] h-[500px] bg-brand/8 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-[10%] left-[15%] w-[400px] h-[400px] bg-purple-500/6 rounded-full blur-[80px] animate-float-slow" style={{ animationDelay: '2s' }} />
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

          <Link href="/profile">
            <Button variant="ghost" className="text-sm text-neutral-400 hover:text-neutral-200 hover:bg-white/5">
              Profile
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
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
              <Card className="bg-card/50 backdrop-blur border-border/40">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-8 h-8 text-brand" />
                    <div>
                      <p className="text-2xl font-bold">{stats.total}</p>
                      <p className="text-xs text-muted-foreground">Total Problems</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur border-green-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <span className="text-green-500 font-bold">E</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-500">{stats.byDifficulty.Easy}</p>
                      <p className="text-xs text-muted-foreground">Easy</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur border-yellow-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <span className="text-yellow-500 font-bold">M</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-500">{stats.byDifficulty.Medium}</p>
                      <p className="text-xs text-muted-foreground">Medium</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur border-red-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
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

        {/* Filters */}
        <Card className="mb-6 border-border/40 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search problems..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 bg-background/50"
                />
              </div>

              {/* Difficulty Filter */}
              <div className="flex gap-2">
                <Button
                  variant={selectedDifficulty === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedDifficulty('all');
                    setCurrentPage(1);
                  }}
                  className={selectedDifficulty === 'all' ? 'bg-brand' : ''}
                >
                  All
                </Button>
                <Button
                  variant={selectedDifficulty === 'Easy' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedDifficulty('Easy');
                    setCurrentPage(1);
                  }}
                  className={selectedDifficulty === 'Easy' ? 'bg-green-500 hover:bg-green-600' : ''}
                >
                  Easy
                </Button>
                <Button
                  variant={selectedDifficulty === 'Medium' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedDifficulty('Medium');
                    setCurrentPage(1);
                  }}
                  className={selectedDifficulty === 'Medium' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                >
                  Medium
                </Button>
                <Button
                  variant={selectedDifficulty === 'Hard' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedDifficulty('Hard');
                    setCurrentPage(1);
                  }}
                  className={selectedDifficulty === 'Hard' ? 'bg-red-500 hover:bg-red-600' : ''}
                >
                  Hard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Problems List */}
        <Card className="border-border/40 bg-card/50 backdrop-blur">
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
                    className="group/problem hover:bg-muted/30 transition-colors"
                  >
                    <div className="p-4 flex items-center gap-4">
                      {/* Status Icon */}
                      <div className="flex-shrink-0">
                        <Circle className="w-4 h-4 text-muted-foreground" />
                      </div>

                      {/* Problem Number & Title */}
                      <Link
                        href={`/problems/${problem.title_slug}`}
                        className="flex-1 min-w-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            #{problem.leetcode_id}
                          </span>
                          <h3 className="font-medium truncate hover:text-brand transition-colors">
                            {problem.title}
                          </h3>
                          {problem.is_premium && (
                            <Lock className="w-4 h-4 text-yellow-500 flex-shrink-0" />
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
                        className="flex-shrink-0 opacity-0 group-hover/problem:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedProblem({ id: problem.id, title: problem.title });
                          setShowAddToList(true);
                        }}
                      >
                        <BookmarkPlus className="w-4 h-4" />
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
                    variant={pageNum === currentPage ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className={pageNum === currentPage ? 'bg-brand' : ''}
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
