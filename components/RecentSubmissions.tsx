"use client";

import { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import dynamic from 'next/dynamic';

// @ts-ignore
const ChevronDown: any = dynamic(() => import('lucide-react').then(mod => mod.ChevronDown), { ssr: false });
// @ts-ignore
const ChevronRight: any = dynamic(() => import('lucide-react').then(mod => mod.ChevronRight), { ssr: false });
// @ts-ignore
const Clock: any = dynamic(() => import('lucide-react').then(mod => mod.Clock), { ssr: false });
// @ts-ignore
const Code2: any = dynamic(() => import('lucide-react').then(mod => mod.Code2), { ssr: false });
// @ts-ignore
const CheckCircle: any = dynamic(() => import('lucide-react').then(mod => mod.CheckCircle2), { ssr: false });
// @ts-ignore
const XCircle: any = dynamic(() => import('lucide-react').then(mod => mod.XCircle), { ssr: false });

interface Submission {
  id: string;
  problem_id: number;
  problem_title: string;
  difficulty: string;
  status: string;
  language: string;
  submitted_at: string;
  runtime?: number | null;
  memory?: number | null;
}

interface RecentSubmissionsProps {
  submissions: Submission[];
  compact?: boolean;
  isOwnProfile?: boolean;
}

export default function RecentSubmissions({ submissions, compact = true, isOwnProfile = true }: RecentSubmissionsProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);

  // Show last 7 days by default
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const recentSubmissions = submissions.filter(sub =>
    new Date(sub.submitted_at) >= oneWeekAgo
  );

  const displaySubmissions = expanded ? submissions : recentSubmissions;

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const submitted = new Date(date);
    const diffMs = now.getTime() - submitted.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return submitted.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusIcon = (status: string) => {
    if (status === 'Accepted') return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Code2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No submissions yet</p>
        <p className="text-xs mt-1">
          {isOwnProfile
            ? "Start solving problems to see your history"
            : "This user hasn't submitted any solutions yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with expand/collapse */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            {expanded ? 'All Submissions' : 'This Week'}
          </h4>
          <Badge variant="outline" className="text-xs">
            {expanded ? submissions.length : recentSubmissions.length}
          </Badge>
        </div>

        {submissions.length > recentSubmissions.length && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
          >
            {expanded ? (
              <>
                <ChevronDown className="w-3 h-3" />
                Show Less
              </>
            ) : (
              <>
                <ChevronRight className="w-3 h-3" />
                Show All ({submissions.length})
              </>
            )}
          </button>
        )}
      </div>

      {/* Submissions List */}
      <div className={cn(
        "space-y-2 transition-all duration-300",
        expanded ? "max-h-[600px]" : "max-h-[400px]",
        "overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
      )}>
        {displaySubmissions.map((submission) => (
          <div
            key={submission.id}
            className={cn(
              "group relative border rounded-lg transition-all duration-200 cursor-pointer",
              selectedSubmission === submission.id
                ? "border-brand/50 bg-brand/5"
                : "border-border/40 hover:border-border/60 hover:bg-muted/30"
            )}
            onClick={() => setSelectedSubmission(
              selectedSubmission === submission.id ? null : submission.id
            )}
          >
            {/* Main submission info */}
            <div className="p-3">
              <div className="flex items-start justify-between gap-3">
                {/* Left: Problem info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(submission.status)}
                    <h5 className="font-medium text-sm truncate">
                      {submission.problem_title}
                    </h5>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs flex-shrink-0",
                        submission.difficulty === "Easy" && "border-green-500/30 text-green-600",
                        submission.difficulty === "Medium" && "border-yellow-500/30 text-yellow-600",
                        submission.difficulty === "Hard" && "border-red-500/30 text-red-600"
                      )}
                    >
                      {submission.difficulty}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Code2 className="w-3 h-3" />
                      {submission.language}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(submission.submitted_at)}
                    </span>
                  </div>
                </div>

                {/* Right: Status badge */}
                <Badge
                  variant="outline"
                  className={cn(
                    "flex-shrink-0",
                    submission.status === "Accepted"
                      ? "border-green-500/30 bg-green-500/10 text-green-600"
                      : "border-red-500/30 bg-red-500/10 text-red-600"
                  )}
                >
                  {submission.status}
                </Badge>
              </div>

              {/* Expanded details */}
              {selectedSubmission === submission.id && (
                <div className="mt-3 pt-3 border-t border-border/30 space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {submission.runtime !== undefined && (
                      <div className="flex items-center justify-between p-2 rounded bg-muted/20">
                        <span className="text-muted-foreground">Runtime</span>
                        <span className="font-mono font-medium">{submission.runtime}ms</span>
                      </div>
                    )}
                    {submission.memory !== undefined && (
                      <div className="flex items-center justify-between p-2 rounded bg-muted/20">
                        <span className="text-muted-foreground">Memory</span>
                        <span className="font-mono font-medium">{submission.memory}KB</span>
                      </div>
                    )}
                  </div>

                  {/* Placeholder for future features */}
                  <div className="flex gap-2 pt-2">
                    <button className="flex-1 py-2 px-3 text-xs rounded-md bg-muted/30 hover:bg-muted/50 transition-colors text-muted-foreground hover:text-white">
                      View Code
                    </button>
                    <button className="flex-1 py-2 px-3 text-xs rounded-md bg-muted/30 hover:bg-muted/50 transition-colors text-muted-foreground hover:text-white">
                      Retry Problem
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Hover indicator */}
            <div className="absolute inset-0 -z-10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-brand/5 to-orange-500/5 pointer-events-none" />
          </div>
        ))}
      </div>

      {/* Stats summary at bottom */}
      {displaySubmissions.length > 0 && (
        <div className="flex items-center justify-between pt-3 border-t border-border/30 text-xs text-muted-foreground">
          <span>
            {displaySubmissions.filter(s => s.status === 'Accepted').length} accepted
          </span>
          <span>•</span>
          <span>
            {displaySubmissions.filter(s => s.status !== 'Accepted').length} failed
          </span>
          <span>•</span>
          <span>
            {new Set(displaySubmissions.map(s => s.problem_id)).size} unique problems
          </span>
        </div>
      )}
    </div>
  );
}
