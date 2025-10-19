"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Search, X, Filter, GraduationCap, Trophy, Briefcase, TrendingUp, ArrowUpDown } from "lucide-react";

interface UserSearchFiltersProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  university: string;
  setUniversity: (value: string) => void;
  graduationYear: string;
  setGraduationYear: (value: string) => void;
  company: string;
  setCompany: (value: string) => void;
  minSolved: number;
  setMinSolved: (value: number) => void;
  maxSolved: number;
  setMaxSolved: (value: number) => void;
  minRating: number;
  setMinRating: (value: number) => void;
  maxRating: number;
  setMaxRating: (value: number) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  onReset: () => void;
  isLoading?: boolean;
}

export function UserSearchFilters({
  searchQuery,
  setSearchQuery,
  university,
  setUniversity,
  graduationYear,
  setGraduationYear,
  company,
  setCompany,
  minSolved,
  setMinSolved,
  maxSolved,
  setMaxSolved,
  minRating,
  setMinRating,
  maxRating,
  setMaxRating,
  sortBy,
  setSortBy,
  onReset,
  isLoading,
}: UserSearchFiltersProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useState(() => {
    setMounted(true);
  });

  const currentTheme = mounted ? (resolvedTheme || theme) : 'light';

  const hasActiveFilters = university || graduationYear || company ||
                          minSolved > 0 || maxSolved < 1000 ||
                          minRating > 0 || maxRating < 3000;

  const activeFilterCount = [
    university, graduationYear, company,
    minSolved > 0, maxSolved < 1000,
    minRating > 0, maxRating < 3000
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <Card
        className={cn(
          "p-4 border-2 backdrop-blur-xl transition-all duration-300",
          currentTheme === 'light'
            ? "bg-white/80 border-black/5 hover:border-blue-500/20 shadow-lg"
            : "bg-zinc-950/80 border-white/5 hover:border-blue-500/20 shadow-lg"
        )}
      >
        <div className="flex gap-3">
          <div className="relative flex-1">
            <svg className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none",
              currentTheme === 'light' ? "text-zinc-400" : "text-zinc-500"
            )} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input
              type="text"
              placeholder="Search by name, username, university, company, or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isLoading}
              className={cn(
                "pl-10 h-11 border-2 transition-all duration-300",
                currentTheme === 'light'
                  ? "bg-white border-zinc-200 focus:border-blue-500 focus:ring-blue-500/20"
                  : "bg-zinc-900 border-zinc-800 focus:border-blue-500 focus:ring-blue-500/20"
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={cn(
                  "absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center transition-all",
                  currentTheme === 'light'
                    ? "hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600"
                    : "hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300"
                )}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            size="lg"
            className={cn(
              "gap-2 border-2 transition-all duration-300 relative",
              currentTheme === 'light'
                ? "bg-white border-zinc-200 hover:border-blue-500 hover:bg-blue-50"
                : "bg-zinc-900 border-zinc-800 hover:border-blue-500 hover:bg-blue-500/10",
              showFilters && "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full ring-2 ring-background flex items-center justify-center font-semibold">
                {activeFilterCount}
              </div>
            )}
          </Button>

          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger
              className={cn(
                "w-[160px] h-11 border-2 gap-2",
                currentTheme === 'light'
                  ? "bg-white border-zinc-200 hover:border-blue-500"
                  : "bg-zinc-900 border-zinc-800 hover:border-blue-500"
              )}
            >
              <ChevronDown className="w-4 h-4" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="activity">Most Active</SelectItem>
              <SelectItem value="connections">Most Connections</SelectItem>
              <SelectItem value="rating_high">Highest Rating</SelectItem>
              <SelectItem value="rating_low">Lowest Rating</SelectItem>
              <SelectItem value="problems_high">Most Solved</SelectItem>
              <SelectItem value="problems_low">Least Solved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Real-time search indicator */}
        {isLoading && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="animate-spin rounded-full h-3 w-3 border-b border-brand"></div>
            <span>Searching...</span>
          </div>
        )}
      </Card>

      {/* Advanced Filters */}
      {showFilters && (
        <Card
          className={cn(
            "p-6 border-2 backdrop-blur-xl animate-in fade-in-0 slide-in-from-top-2 duration-300",
            currentTheme === 'light'
              ? "bg-white/80 border-black/5 shadow-lg"
              : "bg-zinc-950/80 border-white/5 shadow-lg"
          )}
        >
          {/* Liquid glass overlay */}
          <div
            className={cn(
              "absolute inset-0 rounded-xl opacity-50 pointer-events-none",
              currentTheme === 'light'
                ? "bg-gradient-to-br from-white/60 to-transparent"
                : "bg-gradient-to-br from-white/5 to-transparent"
            )}
          />

          <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn(
                "font-semibold flex items-center gap-2",
                currentTheme === 'light' ? "text-zinc-900" : "text-white"
              )}>
                <SlidersHorizontal className="w-4 h-4" />
                Advanced Filters
              </h3>
              {hasActiveFilters && (
                <Button
                  onClick={onReset}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "gap-2 text-xs",
                    currentTheme === 'light'
                      ? "text-red-600 hover:bg-red-50"
                      : "text-red-400 hover:bg-red-500/10"
                  )}
                >
                  <X className="w-3 h-3" />
                  Clear all
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* University */}
              <div className="space-y-2">
                <Label className={cn(
                  "flex items-center gap-2 text-sm font-medium",
                  currentTheme === 'light' ? "text-zinc-700" : "text-zinc-300"
                )}>
                  <GraduationCap className="w-4 h-4" />
                  University
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. MIT, Stanford, Berkeley"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  disabled={isLoading}
                  className={cn(
                    "border-2 transition-all duration-300",
                    currentTheme === 'light'
                      ? "bg-white border-zinc-200 focus:border-blue-500"
                      : "bg-zinc-900 border-zinc-800 focus:border-blue-500"
                  )}
                />
              </div>

              {/* Graduation Year */}
              <div className="space-y-2">
                <Label className={cn(
                  "flex items-center gap-2 text-sm font-medium",
                  currentTheme === 'light' ? "text-zinc-700" : "text-zinc-300"
                )}>
                  <GraduationCap className="w-4 h-4" />
                  Graduation Year
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. 2024, 2025, 2026"
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  disabled={isLoading}
                  className={cn(
                    "border-2 transition-all duration-300",
                    currentTheme === 'light'
                      ? "bg-white border-zinc-200 focus:border-blue-500"
                      : "bg-zinc-900 border-zinc-800 focus:border-blue-500"
                  )}
                />
              </div>

              {/* Company */}
              <div className="space-y-2 md:col-span-2">
                <Label className={cn(
                  "flex items-center gap-2 text-sm font-medium",
                  currentTheme === 'light' ? "text-zinc-700" : "text-zinc-300"
                )}>
                  <Briefcase className="w-4 h-4" />
                  Company / Job Title
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Google, Meta, Software Engineer"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  disabled={isLoading}
                  className={cn(
                    "border-2 transition-all duration-300",
                    currentTheme === 'light'
                      ? "bg-white border-zinc-200 focus:border-blue-500"
                      : "bg-zinc-900 border-zinc-800 focus:border-blue-500"
                  )}
                />
              </div>
            </div>

            {/* Problems Solved Range */}
            <div className="space-y-4">
              <Label className={cn(
                "flex items-center gap-2 text-sm font-medium",
                currentTheme === 'light' ? "text-zinc-700" : "text-zinc-300"
              )}>
                <Trophy className="w-4 h-4" />
                Problems Solved: {minSolved} - {maxSolved === 1000 ? '1000+' : maxSolved}
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Min: {minSolved}</span>
                  </div>
                  <Slider
                    value={[minSolved]}
                    onValueChange={([value]) => setMinSolved(value)}
                    max={1000}
                    step={10}
                    disabled={isLoading}
                    className="cursor-pointer"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Max: {maxSolved === 1000 ? '1000+' : maxSolved}</span>
                  </div>
                  <Slider
                    value={[maxSolved]}
                    onValueChange={([value]) => setMaxSolved(value)}
                    max={1000}
                    step={10}
                    disabled={isLoading}
                    className="cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Contest Rating Range */}
            <div className="space-y-4">
              <Label className={cn(
                "flex items-center gap-2 text-sm font-medium",
                currentTheme === 'light' ? "text-zinc-700" : "text-zinc-300"
              )}>
                <TrendingUp className="w-4 h-4" />
                Contest Rating: {minRating} - {maxRating === 3000 ? '3000+' : maxRating}
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Min: {minRating}</span>
                  </div>
                  <Slider
                    value={[minRating]}
                    onValueChange={([value]) => setMinRating(value)}
                    max={3000}
                    step={50}
                    disabled={isLoading}
                    className="cursor-pointer"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Max: {maxRating === 3000 ? '3000+' : maxRating}</span>
                  </div>
                  <Slider
                    value={[maxRating]}
                    onValueChange={([value]) => setMaxRating(value)}
                    max={3000}
                    step={50}
                    disabled={isLoading}
                    className="cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}