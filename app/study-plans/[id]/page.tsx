"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";
import CoduraLogo from "@/components/logos/codura-logo.svg";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  X,
  Check,
} from "lucide-react";
import dynamic from 'next/dynamic';

// Dynamic imports to avoid TypeScript issues with lucide-react type definitions
// @ts-ignore - lucide-react has incomplete type definitions
const Search = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Search as any })), { ssr: false });
// @ts-ignore
const Trash2 = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Trash2 as any })), { ssr: false });
// @ts-ignore
const Edit2 = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Edit2 as any })), { ssr: false });

interface ListProblem {
  id: string;
  problem_id: number;
  notes?: string;
  added_at: string;
  problems: {
    id: number;
    leetcode_id: number;
    title: string;
    title_slug: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    acceptance_rate: number;
    topic_tags: Array<{ name: string }>;
  };
}

interface StudyPlan {
  id: string;
  name: string;
  description?: string;
  color: string;
  problem_count: number;
}

export default function StudyPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listId = params.id as string;

  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [problems, setProblems] = useState<ListProblem[]>([]);
  const [filteredProblems, setFilteredProblems] = useState<ListProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    fetchPlan();
    fetchProblems();
  }, [listId]);

  useEffect(() => {
    filterProblems();
  }, [problems, searchTerm, selectedDifficulty]);

  const fetchPlan = async () => {
    try {
      const response = await fetch('/api/study-plans');
      const data = await response.json();
      const currentPlan = data.userLists.find((l: StudyPlan) => l.id === listId);
      if (currentPlan) {
        setPlan(currentPlan);
        setEditName(currentPlan.name);
      }
    } catch (error) {
      console.error('Error fetching plan:', error);
    }
  };

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/study-plans/problems?listId=${listId}`);
      const data = await response.json();
      setProblems(data.problems || []);
    } catch (error) {
      console.error('Error fetching problems:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProblems = () => {
    let filtered = [...problems];

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.problems.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(p => p.problems.difficulty === selectedDifficulty);
    }

    setFilteredProblems(filtered);
  };

  const handleDeleteProblem = async (problemId: string) => {
    if (!confirm('Remove this problem from the list?')) return;

    try {
      const response = await fetch(`/api/study-plans/problems?id=${problemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete problem');

      await fetchProblems();
      await fetchPlan(); // Refresh to update count
    } catch (error) {
      console.error('Error deleting problem:', error);
      alert('Failed to delete problem');
    }
  };

  const handleDeleteList = async () => {
    if (!confirm(`Delete "${plan?.name}" list? This cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/study-plans?id=${listId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete list');
      }

      router.push('/dashboard');
    } catch (error: any) {
      console.error('Error deleting list:', error);
      alert(error.message || 'Failed to delete list');
    }
  };

  const handleUpdateName = async () => {
    if (!editName.trim() || editName === plan?.name) {
      setIsEditing(false);
      return;
    }

    try {
      const response = await fetch('/api/study-plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: listId, name: editName }),
      });

      if (!response.ok) throw new Error('Failed to update list name');

      await fetchPlan();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating list name:', error);
      alert('Failed to update list name');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-500 border-green-500/30';
      case 'Medium': return 'text-yellow-500 border-yellow-500/30';
      case 'Hard': return 'text-red-500 border-red-500/30';
      default: return 'text-gray-500';
    }
  };

  if (!plan) {
    return (
      <div className="caffeine-theme min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <div className="caffeine-theme min-h-screen bg-zinc-950 relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-zinc-950" />
        <div className="absolute top-[-10%] right-[20%] w-[500px] h-[500px] bg-brand/8 rounded-full blur-[100px] animate-pulse-slow" />
      </div>

      {/* Navbar */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-b-white/10 bg-neutral-950/80 backdrop-blur-md">
        <div className="flex items-center justify-between py-4 max-w-7xl mx-auto px-6">
          <Link href="/" className="flex items-center group">
            <Image src={CoduraLogo} alt="Codura logo" width={90} height={40} priority />
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost">Back to Dashboard</Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-brand transition-colors mb-4">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Back to Dashboard</span>
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${plan.color} flex items-center justify-center`}>
                <span className="text-white text-xl font-bold">{plan.name[0]}</span>
              </div>
              <div>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
                      className="max-w-xs"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" onClick={handleUpdateName}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => {
                      setIsEditing(false);
                      setEditName(plan.name);
                    }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-4xl font-bold">{plan.name}</h1>
                    <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <p className="text-muted-foreground mt-1">{plan.problem_count} problems</p>
              </div>
            </div>

            <Button
              variant="outline"
              className="border-red-500/30 text-red-500 hover:bg-red-500/10"
              onClick={handleDeleteList}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete List
            </Button>
          </div>
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
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background/50"
                />
              </div>

              {/* Difficulty Filter */}
              <div className="flex gap-2">
                <Button
                  variant={selectedDifficulty === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDifficulty('all')}
                  className={selectedDifficulty === 'all' ? 'bg-brand' : ''}
                >
                  All
                </Button>
                <Button
                  variant={selectedDifficulty === 'Easy' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDifficulty('Easy')}
                  className={selectedDifficulty === 'Easy' ? 'bg-green-500 hover:bg-green-600' : ''}
                >
                  Easy
                </Button>
                <Button
                  variant={selectedDifficulty === 'Medium' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDifficulty('Medium')}
                  className={selectedDifficulty === 'Medium' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                >
                  Medium
                </Button>
                <Button
                  variant={selectedDifficulty === 'Hard' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDifficulty('Hard')}
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
            ) : filteredProblems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>{problems.length === 0 ? 'No problems in this list yet' : 'No problems match your filters'}</p>
                {problems.length === 0 && (
                  <Link href="/problems">
                    <Button className="mt-4">Browse Problems</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {filteredProblems.map((item) => (
                  <div
                    key={item.id}
                    className="group/problem hover:bg-muted/30 transition-colors"
                  >
                    <div className="p-4 flex items-center gap-4">
                      {/* Problem Number & Title */}
                      <Link
                        href={`/problems/${item.problems.title_slug}`}
                        className="flex-1 min-w-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            #{item.problems.leetcode_id}
                          </span>
                          <h3 className="font-medium truncate hover:text-brand transition-colors">
                            {item.problems.title}
                          </h3>
                        </div>
                      </Link>

                      {/* Tags */}
                      <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
                        {item.problems.topic_tags?.slice(0, 2).map((tag, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-xs border-border/40"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>

                      {/* Acceptance Rate */}
                      <div className="hidden md:block text-sm text-muted-foreground flex-shrink-0">
                        {item.problems.acceptance_rate?.toFixed(1)}%
                      </div>

                      {/* Difficulty */}
                      <div className="flex-shrink-0">
                        <Badge
                          variant="outline"
                          className={cn("text-xs", getDifficultyColor(item.problems.difficulty))}
                        >
                          {item.problems.difficulty}
                        </Badge>
                      </div>

                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 opacity-0 group-hover/problem:opacity-100 transition-opacity hover:bg-red-500/20"
                        onClick={() => handleDeleteProblem(item.id)}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}