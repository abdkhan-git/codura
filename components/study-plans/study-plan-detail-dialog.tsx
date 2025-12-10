"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import dynamic from 'next/dynamic';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// @ts-ignore
const Target: any = dynamic(() => import('lucide-react').then(mod => mod.Target), { ssr: false });
// @ts-ignore
const Trash2: any = dynamic(() => import('lucide-react').then(mod => mod.Trash2), { ssr: false });
// @ts-ignore
const Edit2: any = dynamic(() => import('lucide-react').then(mod => mod.Edit2), { ssr: false });
// @ts-ignore
const Search: any = dynamic(() => import('lucide-react').then(mod => mod.Search), { ssr: false });
// @ts-ignore
const ArrowUpDown: any = dynamic(() => import('lucide-react').then(mod => mod.ArrowUpDown), { ssr: false });
// @ts-ignore
const ExternalLink: any = dynamic(() => import('lucide-react').then(mod => mod.ExternalLink), { ssr: false });
// @ts-ignore
const Sparkles: any = dynamic(() => import('lucide-react').then(mod => mod.Sparkles), { ssr: false });
// @ts-ignore
const Globe: any = dynamic(() => import('lucide-react').then(mod => mod.Globe), { ssr: false });
// @ts-ignore
const Lock: any = dynamic(() => import('lucide-react').then(mod => mod.Lock), { ssr: false });

interface Problem {
  id: string;
  problem_id: number;
  notes: string | null;
  order_index: number;
  added_at: string;
  problems: {
    id: number;
    leetcode_id: number;
    title: string;
    title_slug: string;
    difficulty: string;
    acceptance_rate: number;
    topic_tags: string[];
  };
}

interface StudyPlanDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  listName: string;
  listColor: string;
  isPublic?: boolean;
  isReadOnly?: boolean;
  onListUpdated: () => void;
}

export function StudyPlanDetailDialog({
  open,
  onOpenChange,
  listId,
  listName,
  listColor,
  isPublic = false,
  isReadOnly = false,
  onListUpdated,
}: StudyPlanDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblems, setSelectedProblems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'added_at' | 'difficulty' | 'title'>('added_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(listName);
  const [currentListName, setCurrentListName] = useState(listName);
  const [isListPublic, setIsListPublic] = useState(isPublic);

  useEffect(() => {
    if (open && listId) {
      fetchProblems();
      setSelectedProblems(new Set());
      setCurrentListName(listName);
      setEditedName(listName);
      setIsListPublic(isPublic);
    }
  }, [open, listId, listName, isPublic]);

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

  const handleDeleteSelected = async () => {
    if (selectedProblems.size === 0) return;

    if (!confirm(`Delete ${selectedProblems.size} problem(s) from this list?`)) return;

    setLoading(true);
    try {
      const deletePromises = Array.from(selectedProblems).map(id =>
        fetch(`/api/study-plans/problems?id=${id}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);
      await fetchProblems();
      setSelectedProblems(new Set());
      toast.success('Problems deleted successfully');
      onListUpdated();
    } catch (error) {
      console.error('Error deleting problems:', error);
      toast.error('Failed to delete problems');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedProblems.size === filteredAndSortedProblems.length) {
      setSelectedProblems(new Set());
    } else {
      setSelectedProblems(new Set(filteredAndSortedProblems.map(p => p.id)));
    }
  };

  const toggleSelectProblem = (problemId: string) => {
    const newSelected = new Set(selectedProblems);
    if (newSelected.has(problemId)) {
      newSelected.delete(problemId);
    } else {
      newSelected.add(problemId);
    }
    setSelectedProblems(newSelected);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'text-green-600 bg-green-500/10 border-green-500/30';
      case 'medium': return 'text-yellow-600 bg-yellow-500/10 border-yellow-500/30';
      case 'hard': return 'text-red-600 bg-red-500/10 border-red-500/30';
      default: return 'text-gray-600 bg-gray-500/10 border-gray-500/30';
    }
  };

  // Filter and sort problems
  const filteredAndSortedProblems = problems
    .filter(p => {
      if (!searchQuery) return true;
      return p.problems.title.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'added_at') {
        comparison = new Date(a.added_at).getTime() - new Date(b.added_at).getTime();
      } else if (sortBy === 'difficulty') {
        const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
        comparison = (difficultyOrder[a.problems.difficulty.toLowerCase() as keyof typeof difficultyOrder] || 0) -
                     (difficultyOrder[b.problems.difficulty.toLowerCase() as keyof typeof difficultyOrder] || 0);
      } else if (sortBy === 'title') {
        comparison = a.problems.title.localeCompare(b.problems.title);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const cycleSortBy = () => {
    if (sortBy === 'added_at') {
      setSortBy('difficulty');
    } else if (sortBy === 'difficulty') {
      setSortBy('title');
    } else {
      setSortBy('added_at');
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleEditName = async () => {
    if (!editedName.trim() || editedName === currentListName) {
      setIsEditingName(false);
      setEditedName(currentListName);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/study-plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: listId, name: editedName.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to update list name');
      }

      // Update local state immediately
      setCurrentListName(editedName.trim());
      setIsEditingName(false);
      toast.success('List name updated successfully');
      onListUpdated();
    } catch (error) {
      console.error('Error updating list name:', error);
      toast.error('Failed to update list name');
      setEditedName(currentListName);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublic = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/study-plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: listId, is_public: !isListPublic }),
      });

      if (!response.ok) {
        throw new Error('Failed to update list visibility');
      }

      setIsListPublic(!isListPublic);
      toast.success('List visibility updated successfully');
      onListUpdated();
    } catch (error) {
      console.error('Error updating list visibility:', error);
      toast.error('Failed to update list visibility');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteList = async () => {
    if (!confirm(`Are you sure you want to delete "${currentListName}"? This will remove all problems from this list.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/study-plans?id=${listId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete list');
      }

      toast.success('Study plan deleted successfully');
      onListUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error deleting list:', error);
      toast.error(error.message || 'Failed to delete list');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] bg-gradient-to-br from-card/60 via-card/40 to-card/60 backdrop-blur-2xl border-2 border-border/20 p-0 overflow-hidden shadow-2xl">
        {/* Decorative gradient orbs */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-brand/20 via-purple-500/10 to-transparent rounded-full blur-3xl opacity-40 pointer-events-none animate-pulse-slow" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-gradient-to-tr from-blue-500/10 via-brand/10 to-transparent rounded-full blur-3xl opacity-30 pointer-events-none animate-pulse-slow" style={{ animationDelay: '1s' }} />

        {/* Top gradient line */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand/60 to-transparent" />

        <DialogHeader className="relative px-8 pt-8 pb-6 border-b border-border/20 bg-gradient-to-b from-background/50 to-transparent backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${listColor} flex items-center justify-center shadow-lg shadow-brand/20 flex-shrink-0 group-hover:scale-110 transition-transform relative overflow-hidden`}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                <Target className="w-7 h-7 text-white relative z-10" />
              </div>
              <div className="flex-1 min-w-0">
                {isEditingName ? (
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditName();
                        if (e.key === 'Escape') {
                          setIsEditingName(false);
                          setEditedName(currentListName);
                        }
                      }}
                      className="text-2xl font-bold bg-background/60 backdrop-blur-sm border border-brand/40 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-brand/50 w-full max-w-md"
                      autoFocus
                      disabled={loading}
                    />
                    <Button
                      size="sm"
                      onClick={handleEditName}
                      disabled={loading || !editedName.trim()}
                      className="bg-brand hover:bg-brand/90 shrink-0"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsEditingName(false);
                        setEditedName(currentListName);
                      }}
                      disabled={loading}
                      className="shrink-0"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <DialogTitle className="text-2xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    {currentListName}
                  </DialogTitle>
                )}
                <DialogDescription className="flex items-center gap-3 text-base">
                  <span className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                    {problems.length} problem{problems.length !== 1 ? 's' : ''}
                  </span>
                  {selectedProblems.size > 0 && (
                    <>
                      <span className="text-muted-foreground/50">•</span>
                      <span className="text-brand font-medium animate-pulse">{selectedProblems.size} selected</span>
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>
            {!isReadOnly && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTogglePublic}
                  disabled={loading}
                  className="gap-2 hover:bg-brand/10 hover:border-brand/50 transition-all hover:scale-105 border-border/40 bg-background/30 backdrop-blur-sm"
                  title={isListPublic ? "Make list private" : "Make list public"}
                >
                  {isListPublic ? (
                    <>
                      <Globe className="w-4 h-4" />
                      <span className="hidden sm:inline">Public</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span className="hidden sm:inline">Private</span>
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingName(true)}
                  disabled={loading || isEditingName}
                  className="gap-2 hover:bg-brand/10 hover:border-brand/50 transition-all hover:scale-105 border-border/40 bg-background/30 backdrop-blur-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteList}
                  disabled={loading}
                  className="gap-2 text-red-500 hover:bg-red-500/10 hover:border-red-500/50 transition-all hover:scale-105 border-border/40 bg-background/30 backdrop-blur-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Toolbar */}
        <div className="relative px-8 py-5 border-b border-border/20 space-y-3 bg-background/20 backdrop-blur-sm">
          {/* Search and Sort */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search problems..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-background/60 backdrop-blur-sm border border-border/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 transition-all placeholder:text-muted-foreground/60"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={cycleSortBy}
              className="gap-2 min-w-[160px] bg-background/60 backdrop-blur-sm border-border/40 hover:bg-brand/10 hover:border-brand/50 transition-all"
            >
              <ArrowUpDown className="w-4 h-4" />
              Sort by {sortBy === 'added_at' ? 'Date' : sortBy === 'difficulty' ? 'Difficulty' : 'Title'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSortOrder}
              className="gap-2 bg-background/60 backdrop-blur-sm border-border/40 hover:bg-brand/10 hover:border-brand/50 transition-all px-4"
            >
              {sortOrder === 'asc' ? '↑' : '↓'} {sortOrder.toUpperCase()}
            </Button>
          </div>

          {/* Multi-select actions */}
          {!isReadOnly && selectedProblems.size > 0 && (
            <div className="relative group/delete-bar animate-appear">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-red-500/10 to-red-500/20 rounded-2xl blur-xl opacity-60" />
              <div className="relative flex items-center justify-between p-4 bg-gradient-to-r from-red-500/10 via-red-500/5 to-red-500/10 backdrop-blur-md rounded-2xl border border-red-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-red-400" />
                  </div>
                  <span className="text-sm font-semibold text-red-100">
                    {selectedProblems.size} problem{selectedProblems.size !== 1 ? 's' : ''} selected
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={loading}
                  className="gap-2 bg-red-500 hover:bg-red-600 text-white border-0 shadow-lg shadow-red-500/20 hover:shadow-red-500/30 hover:scale-105 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Selected
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Problems List */}
        <div className="relative px-8 py-6 overflow-y-auto max-h-[calc(90vh-320px)]">
          {loading ? (
            <div className="text-center py-16">
              <div className="relative w-12 h-12 mx-auto mb-4">
                <div className="absolute inset-0 border-4 border-brand/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-brand border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground">Loading problems...</p>
            </div>
          ) : filteredAndSortedProblems.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <Target className="w-10 h-10 text-muted-foreground opacity-50" />
              </div>
              <p className="text-base font-medium text-foreground/70 mb-1">
                {searchQuery ? 'No problems match your search' : 'No problems in this list yet'}
              </p>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Try adjusting your search terms' : 'Add problems from the problems page'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Select All */}
              {!isReadOnly && (
                <div className="relative group/select-all">
                  <div className="absolute inset-0 bg-gradient-to-r from-brand/5 via-purple-500/5 to-brand/5 rounded-2xl blur-xl opacity-0 group-hover/select-all:opacity-100 transition-opacity" />
                  <div className="relative flex items-center gap-4 p-4 rounded-2xl border border-border/10 bg-gradient-to-br from-muted/20 via-background/30 to-muted/20 backdrop-blur-md hover:border-brand/20 hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={toggleSelectAll}
                  >
                    <Checkbox
                      checked={selectedProblems.size === filteredAndSortedProblems.length && filteredAndSortedProblems.length > 0}
                      onCheckedChange={toggleSelectAll}
                      className="data-[state=checked]:bg-brand data-[state=checked]:border-brand h-5 w-5"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-semibold">Select All</span>
                      <span className="text-xs text-muted-foreground ml-2">({filteredAndSortedProblems.length} problems)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Problem Items */}
              <div className="space-y-2">
                {filteredAndSortedProblems.map((problem, index) => (
                  <div
                    key={problem.id}
                    className="group/problem relative"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    {/* Glow effect on hover */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-brand/20 via-purple-500/20 to-brand/20 rounded-2xl blur-lg opacity-0 group-hover/problem:opacity-100 transition-all duration-500" />

                    <div className="relative flex items-center gap-4 p-4 rounded-2xl border border-border/10 bg-gradient-to-br from-background/60 via-background/40 to-background/60 backdrop-blur-md hover:border-brand/30 hover:shadow-xl hover:shadow-brand/5 transition-all duration-300 hover:-translate-y-0.5">
                      {/* Checkbox */}
                      {!isReadOnly && (
                        <Checkbox
                          checked={selectedProblems.has(problem.id)}
                          onCheckedChange={() => toggleSelectProblem(problem.id)}
                          className="data-[state=checked]:bg-brand data-[state=checked]:border-brand h-5 w-5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}

                      {/* Problem Number Badge */}
                      <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 backdrop-blur-sm flex items-center justify-center border border-border/10 group-hover/problem:border-brand/30 transition-all">
                        <span className="text-xs font-bold text-muted-foreground group-hover/problem:text-brand transition-colors">
                          #{problem.problems.leetcode_id}
                        </span>
                      </div>

                      {/* Problem Content */}
                      <Link
                        href={`/problems/${problem.problems.title_slug}`}
                        className="flex-1 flex items-center justify-between gap-4 min-w-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-base group-hover/problem:text-brand transition-colors truncate">
                              {problem.problems.title}
                            </h4>
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover/problem:opacity-100 transition-all shrink-0" />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="hidden sm:inline">Added {new Date(problem.added_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </div>

                        {/* Difficulty Badge */}
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-semibold px-3 py-1 text-xs transition-all shrink-0",
                            getDifficultyColor(problem.problems.difficulty)
                          )}
                        >
                          {problem.problems.difficulty}
                        </Badge>
                      </Link>

                      {/* Delete Button */}
                      {!isReadOnly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-xl opacity-0 group-hover/problem:opacity-100 hover:bg-red-500/10 hover:text-red-500 hover:border hover:border-red-500/30 transition-all shrink-0"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (confirm('Remove this problem from the list?')) {
                              try {
                                await fetch(`/api/study-plans/problems?id=${problem.id}`, {
                                  method: 'DELETE',
                                });
                                await fetchProblems();
                                toast.success('Problem removed successfully');
                                onListUpdated();
                              } catch (error) {
                                console.error('Error removing problem:', error);
                                toast.error('Failed to remove problem');
                              }
                            }
                          }}
                          title="Remove from list"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
