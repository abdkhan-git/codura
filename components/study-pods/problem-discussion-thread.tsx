"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Lightbulb,
  HelpCircle,
  Code2,
  Loader2,
  Plus,
  Filter,
  ArrowUpDown,
  X,
  Send,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import { DiscussionCommentCard } from "./discussion-comment-card";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Thread {
  id: string;
  pod_id: string;
  problem_id: number;
  comment_count: number;
  solution_count: number;
  last_activity_at: string;
  is_pinned: boolean;
  is_locked: boolean;
  problem?: {
    id: number;
    leetcode_id: number;
    title: string;
    title_slug: string;
    difficulty: string;
  };
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  comment_type: 'discussion' | 'solution' | 'question' | 'hint';
  code_snippet?: string;
  code_language?: string;
  approach_title?: string;
  time_complexity?: string;
  space_complexity?: string;
  upvotes: number;
  downvotes: number;
  reply_count: number;
  is_edited: boolean;
  is_accepted_solution: boolean;
  created_at: string;
  user: any;
  user_vote: number | null;
  is_bookmarked: boolean;
}

interface ProblemDiscussionThreadProps {
  podId: string;
  problemId: number | string;
  problemTitle?: string;
  currentUserId: string;
  isAdmin: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
];

export function ProblemDiscussionThread({
  podId,
  problemId,
  problemTitle,
  currentUserId,
  isAdmin,
  isOpen,
  onClose,
}: ProblemDiscussionThreadProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [thread, setThread] = useState<Thread | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Filters
  const [sort, setSort] = useState<'newest' | 'oldest' | 'top'>('newest');
  const [filter, setFilter] = useState<'all' | 'solutions' | 'questions' | 'discussions'>('all');

  // Composer
  const [showComposer, setShowComposer] = useState(false);
  const [composerType, setComposerType] = useState<'discussion' | 'solution' | 'question' | 'hint'>('discussion');
  const [composerContent, setComposerContent] = useState('');
  const [composerCode, setComposerCode] = useState('');
  const [composerLanguage, setComposerLanguage] = useState('javascript');
  const [composerApproach, setComposerApproach] = useState('');
  const [composerTimeComplexity, setComposerTimeComplexity] = useState('');
  const [composerSpaceComplexity, setComposerSpaceComplexity] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Replies cache
  const [repliesCache, setRepliesCache] = useState<Record<string, Comment[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  // Real-time polling
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [newCommentsCount, setNewCommentsCount] = useState(0);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const lastCommentCountRef = useRef<number>(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const POLL_INTERVAL = 30000; // 30 seconds

  // Check for new comments silently (for indicator)
  const checkForNewComments = useCallback(async () => {
    if (!isOpen || !thread) return;

    try {
      const response = await fetch(
        `/api/study-pods/${podId}/problems/${problemId}/discussions?sort=${sort}&filter=${filter}&page=1&limit=1`
      );

      if (response.ok) {
        const data = await response.json();
        const currentCount = data.thread?.comment_count || 0;

        if (lastCommentCountRef.current > 0 && currentCount > lastCommentCountRef.current) {
          const newCount = currentCount - lastCommentCountRef.current;
          setNewCommentsCount(prev => prev + newCount);
        }

        lastCommentCountRef.current = currentCount;
      }
    } catch (error) {
      // Silent fail for polling
    }
  }, [isOpen, thread, podId, problemId, sort, filter]);

  // Set up polling interval
  useEffect(() => {
    if (isOpen && pollingEnabled) {
      pollIntervalRef.current = setInterval(checkForNewComments, POLL_INTERVAL);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isOpen, pollingEnabled, checkForNewComments]);

  // Reset new comments count when refreshing
  const handleRefresh = () => {
    setNewCommentsCount(0);
    fetchDiscussion();
  };

  useEffect(() => {
    if (isOpen) {
      fetchDiscussion();
      setNewCommentsCount(0);
    }
  }, [isOpen, podId, problemId, sort, filter, pagination.page]);

  const fetchDiscussion = async (preserveExpanded = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sort,
        filter,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      const response = await fetch(
        `/api/study-pods/${podId}/problems/${problemId}/discussions?${params}`
      );

      if (response.ok) {
        const data = await response.json();
        setThread(data.thread);
        setComments(data.comments);
        setPagination(data.pagination);
        // Update the ref for polling comparison
        lastCommentCountRef.current = data.thread?.comment_count || 0;

        // Auto-load replies for comments that have replies
        const commentsWithReplies = (data.comments || []).filter(
          (c: Comment) => c.reply_count > 0
        );

        // If not preserving expanded state, expand all comments with replies
        if (!preserveExpanded) {
          const newExpanded = new Set<string>();
          commentsWithReplies.forEach((c: Comment) => newExpanded.add(c.id));
          setExpandedComments(newExpanded);
        }

        // Load replies for all comments that have them
        for (const comment of commentsWithReplies) {
          // Only load if not already cached or if we're refreshing
          if (!repliesCache[comment.id] || !preserveExpanded) {
            loadRepliesForComment(comment.id);
          }
        }
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to load discussion');
      }
    } catch (error) {
      toast.error('Failed to load discussion');
    } finally {
      setLoading(false);
    }
  };

  const loadRepliesForComment = async (parentId: string) => {
    setLoadingReplies(prev => ({ ...prev, [parentId]: true }));
    try {
      const response = await fetch(
        `/api/study-pods/${podId}/problems/${problemId}/discussions/comments?parent_id=${parentId}`
      );

      if (response.ok) {
        const data = await response.json();
        setRepliesCache(prev => ({ ...prev, [parentId]: data.replies || [] }));
      }
    } catch (error) {
      console.error('Failed to load replies for', parentId);
    } finally {
      setLoadingReplies(prev => ({ ...prev, [parentId]: false }));
    }
  };

  const loadReplies = async (parentId: string) => {
    // Add to expanded set
    setExpandedComments(prev => new Set(prev).add(parentId));
    await loadRepliesForComment(parentId);
  };

  const toggleExpanded = (commentId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
        // Load replies if not cached
        if (!repliesCache[commentId]) {
          loadRepliesForComment(commentId);
        }
      }
      return newSet;
    });
  };

  const handleCommentDeleted = (deletedCommentId: string, parentId?: string) => {
    if (parentId) {
      // Remove from replies cache
      setRepliesCache(prev => ({
        ...prev,
        [parentId]: (prev[parentId] || []).filter(r => r.id !== deletedCommentId),
      }));
    }
    // Refresh to get updated counts
    fetchDiscussion(true);
  };

  const handleSubmit = async () => {
    if (!composerContent.trim()) {
      toast.error('Please enter some content');
      return;
    }

    setSubmitting(true);
    try {
      const body: any = {
        content: composerContent,
        comment_type: composerType,
        parent_id: replyingTo,
      };

      if (composerCode.trim()) {
        body.code_snippet = composerCode;
        body.code_language = composerLanguage;
      }

      if (composerType === 'solution') {
        if (composerApproach) body.approach_title = composerApproach;
        if (composerTimeComplexity) body.time_complexity = composerTimeComplexity;
        if (composerSpaceComplexity) body.space_complexity = composerSpaceComplexity;
      }

      const response = await fetch(
        `/api/study-pods/${podId}/problems/${problemId}/discussions/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (response.ok) {
        toast.success('Posted successfully');
        resetComposer();
        fetchDiscussion();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to post');
      }
    } catch (error) {
      toast.error('Failed to post');
    } finally {
      setSubmitting(false);
    }
  };

  const resetComposer = () => {
    setShowComposer(false);
    setComposerType('discussion');
    setComposerContent('');
    setComposerCode('');
    setComposerLanguage('javascript');
    setComposerApproach('');
    setComposerTimeComplexity('');
    setComposerSpaceComplexity('');
    setReplyingTo(null);
  };

  const handleReply = (parentId: string) => {
    setReplyingTo(parentId);
    setShowComposer(true);
    setComposerType('discussion');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'solution': return <Code2 className="w-4 h-4" />;
      case 'question': return <HelpCircle className="w-4 h-4" />;
      case 'hint': return <Lightbulb className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className={cn(
        "max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0 rounded-2xl border-0",
        theme === 'light'
          ? "bg-white shadow-2xl shadow-black/10"
          : "bg-zinc-900/98 backdrop-blur-2xl shadow-2xl shadow-black/50"
      )}>
        {/* Modern Header with glass morphism effect */}
        <div className={cn(
          "relative px-6 py-6 border-b overflow-hidden",
          theme === 'light'
            ? "bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-gray-200/50"
            : "bg-gradient-to-br from-emerald-500/15 via-green-500/10 to-teal-500/5 border-white/10"
        )}>
          {/* Decorative background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className={cn(
              "absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl",
              theme === 'light' ? "bg-emerald-200/40" : "bg-emerald-500/10"
            )} />
            <div className={cn(
              "absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-2xl",
              theme === 'light' ? "bg-teal-200/30" : "bg-teal-500/10"
            )} />
          </div>

          <DialogHeader className="p-0 relative z-10">
            <DialogTitle className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-3 rounded-2xl shadow-lg",
                    theme === 'light'
                      ? "bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-200"
                      : "bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-900/50"
                  )}>
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className={cn(
                      "text-xl font-bold tracking-tight",
                      theme === 'light' ? "text-gray-900" : "text-white"
                    )}>
                      {problemTitle}
                    </span>
                    <span className={cn(
                      "text-sm font-medium",
                      theme === 'light' ? "text-gray-500" : "text-white/50"
                    )}>
                      Problem Discussion Thread
                    </span>
                  </div>
                </div>
              </div>
              {thread && (
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full border",
                    theme === 'light'
                      ? "bg-white/80 border-gray-200/50 shadow-sm"
                      : "bg-white/5 border-white/10"
                  )}>
                    <MessageSquare className={cn(
                      "w-4 h-4",
                      theme === 'light' ? "text-gray-500" : "text-white/60"
                    )} />
                    <span className={cn(
                      "text-sm font-semibold tabular-nums",
                      theme === 'light' ? "text-gray-700" : "text-white/80"
                    )}>
                      {thread.comment_count}
                    </span>
                    <span className={cn(
                      "text-xs",
                      theme === 'light' ? "text-gray-400" : "text-white/40"
                    )}>
                      comments
                    </span>
                  </div>
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full border",
                    theme === 'light'
                      ? "bg-emerald-50/80 border-emerald-200/50 shadow-sm"
                      : "bg-emerald-500/10 border-emerald-500/20"
                  )}>
                    <Code2 className="w-4 h-4 text-emerald-500" />
                    <span className={cn(
                      "text-sm font-semibold tabular-nums text-emerald-600",
                      theme === 'light' ? "text-emerald-600" : "text-emerald-400"
                    )}>
                      {thread.solution_count}
                    </span>
                    <span className={cn(
                      "text-xs",
                      theme === 'light' ? "text-emerald-500/70" : "text-emerald-400/60"
                    )}>
                      solutions
                    </span>
                  </div>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 flex-1 overflow-hidden flex flex-col">

        {/* New Comments Indicator */}
        {newCommentsCount > 0 && (
          <div
            onClick={handleRefresh}
            className={cn(
              "flex items-center justify-center gap-2 py-3 px-4 rounded-xl cursor-pointer transition-all mt-4",
              theme === 'light'
                ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 border border-blue-200/50 hover:from-blue-100 hover:to-indigo-100 shadow-sm"
                : "bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-400 border border-blue-500/20 hover:from-blue-500/15 hover:to-indigo-500/15"
            )}
          >
            <div className="relative">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500" />
            </div>
            <span className="font-semibold text-sm">
              {newCommentsCount} new {newCommentsCount === 1 ? 'comment' : 'comments'}
            </span>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              theme === 'light' ? "bg-white/60" : "bg-white/10"
            )}>
              Click to refresh
            </span>
          </div>
        )}

        {/* Modern Toolbar */}
        <div className={cn(
          "flex items-center justify-between py-4 border-b",
          theme === 'light' ? "border-gray-100" : "border-white/5"
        )}>
          <div className="flex items-center gap-2">
            {/* Filter Pills */}
            <div className={cn(
              "flex items-center p-1 rounded-xl",
              theme === 'light' ? "bg-gray-100" : "bg-white/5"
            )}>
              {[
                { value: 'all', label: 'All' },
                { value: 'solutions', label: 'Solutions' },
                { value: 'questions', label: 'Questions' },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value as any)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    filter === f.value
                      ? theme === 'light'
                        ? "bg-white text-gray-900 shadow-sm"
                        : "bg-white/10 text-white"
                      : theme === 'light'
                        ? "text-gray-500 hover:text-gray-700"
                        : "text-white/50 hover:text-white/70"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <Select value={sort} onValueChange={(v: any) => setSort(v)}>
              <SelectTrigger className={cn(
                "w-[130px] h-8 text-xs rounded-lg border-0",
                theme === 'light' ? "bg-gray-100 text-gray-600" : "bg-white/5 text-white/60"
              )}>
                <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="top">Top Voted</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className={cn(
                "h-8 w-8 p-0 rounded-lg",
                theme === 'light' ? "hover:bg-gray-100" : "hover:bg-white/10"
              )}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            </Button>
          </div>

          <Button
            onClick={() => setShowComposer(true)}
            className={cn(
              "h-9 px-4 rounded-xl font-medium text-sm gap-2",
              "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600",
              "shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
            )}
          >
            <Plus className="w-4 h-4" />
            New Post
          </Button>
        </div>

        {/* Modern Composer */}
        {showComposer && (
          <div className={cn(
            "p-5 rounded-2xl border my-4 transition-all",
            theme === 'light'
              ? "bg-gradient-to-br from-gray-50 to-white border-gray-200/50 shadow-lg shadow-black/5"
              : "bg-gradient-to-br from-white/5 to-transparent border-white/10"
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {replyingTo ? (
                  <span className={cn(
                    "text-sm",
                    theme === 'light' ? "text-gray-600" : "text-white/60"
                  )}>
                    Replying to comment
                  </span>
                ) : (
                  <div className="flex gap-1">
                    {(['discussion', 'solution', 'question', 'hint'] as const).map((type) => (
                      <Button
                        key={type}
                        variant={composerType === type ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setComposerType(type)}
                        className={cn(
                          "gap-1.5 capitalize",
                          composerType === type && type === 'solution' && "bg-emerald-500",
                          composerType === type && type === 'question' && "bg-blue-500",
                          composerType === type && type === 'hint' && "bg-amber-500",
                        )}
                      >
                        {getTypeIcon(type)}
                        {type}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={resetComposer}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Solution-specific fields */}
            {composerType === 'solution' && !replyingTo && (
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <Label className="text-xs">Approach Name</Label>
                  <Input
                    value={composerApproach}
                    onChange={(e) => setComposerApproach(e.target.value)}
                    placeholder="e.g., Two Pointers"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Time Complexity</Label>
                  <Input
                    value={composerTimeComplexity}
                    onChange={(e) => setComposerTimeComplexity(e.target.value)}
                    placeholder="e.g., O(n)"
                    className="h-8 text-sm font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs">Space Complexity</Label>
                  <Input
                    value={composerSpaceComplexity}
                    onChange={(e) => setComposerSpaceComplexity(e.target.value)}
                    placeholder="e.g., O(1)"
                    className="h-8 text-sm font-mono"
                  />
                </div>
              </div>
            )}

            {/* Content */}
            <Textarea
              value={composerContent}
              onChange={(e) => setComposerContent(e.target.value)}
              placeholder={
                composerType === 'solution'
                  ? "Explain your approach..."
                  : composerType === 'question'
                    ? "What's your question?"
                    : composerType === 'hint'
                      ? "Share a helpful hint..."
                      : "Share your thoughts..."
              }
              className={cn(
                "min-h-[100px] mb-3",
                theme === 'light' ? "bg-white" : "bg-white/5"
              )}
            />

            {/* Code snippet */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5" />
                  Code Snippet (optional)
                </Label>
                <Select value={composerLanguage} onValueChange={setComposerLanguage}>
                  <SelectTrigger className="w-[130px] h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(lang => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={composerCode}
                onChange={(e) => setComposerCode(e.target.value)}
                placeholder="Paste your code here..."
                className={cn(
                  "font-mono text-sm min-h-[120px]",
                  theme === 'light' ? "bg-white" : "bg-white/5"
                )}
              />
              {composerCode && (
                <div className="mt-2 rounded-lg overflow-hidden">
                  <SyntaxHighlighter
                    language={composerLanguage}
                    style={theme === 'light' ? oneLight : oneDark}
                    customStyle={{ margin: 0, borderRadius: '0.5rem', fontSize: '0.75rem' }}
                  >
                    {composerCode}
                  </SyntaxHighlighter>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={submitting || !composerContent.trim()}
                className="bg-gradient-to-r from-emerald-500 to-green-500"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <Send className="w-4 h-4 mr-1.5" />
                )}
                Post {composerType}
              </Button>
            </div>
          </div>
        )}

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto space-y-3 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : comments.length === 0 ? (
            <div className={cn(
              "text-center py-12 rounded-xl border-2",
              theme === 'light' ? "bg-gray-50 border-gray-200" : "bg-white/5 border-white/10"
            )}>
              <MessageSquare className={cn(
                "w-12 h-12 mx-auto mb-4",
                theme === 'light' ? "text-gray-300" : "text-white/20"
              )} />
              <p className={cn(
                "text-lg font-medium mb-2",
                theme === 'light' ? "text-gray-900" : "text-white"
              )}>
                No {filter !== 'all' ? filter : 'discussions'} yet
              </p>
              <p className={cn(
                "text-sm mb-4",
                theme === 'light' ? "text-gray-500" : "text-white/50"
              )}>
                Be the first to share your thoughts!
              </p>
              <Button
                onClick={() => setShowComposer(true)}
                className="bg-gradient-to-r from-emerald-500 to-green-500"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Start Discussion
              </Button>
            </div>
          ) : (
            comments.map((comment) => (
              <DiscussionCommentCard
                key={comment.id}
                comment={comment}
                podId={podId}
                problemId={problemId.toString()}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onReply={handleReply}
                onUpdate={() => fetchDiscussion(true)}
                onDelete={() => handleCommentDeleted(comment.id)}
                replies={repliesCache[comment.id] || []}
                onLoadReplies={() => loadReplies(comment.id)}
                loadingReplies={loadingReplies[comment.id]}
                isExpanded={expandedComments.has(comment.id)}
                onToggleExpanded={() => toggleExpanded(comment.id)}
                onReplyDeleted={(replyId) => handleCommentDeleted(replyId, comment.id)}
                allRepliesCache={repliesCache}
                allLoadingReplies={loadingReplies}
                allExpandedComments={expandedComments}
                onToggleAnyExpanded={toggleExpanded}
                onLoadAnyReplies={loadReplies}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className={cn(
            "flex items-center justify-center gap-3 py-4 border-t",
            theme === 'light' ? "border-gray-200" : "border-white/10"
          )}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
              disabled={pagination.page === 1}
              className="h-9"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <span className={cn(
              "text-sm px-4 py-1.5 rounded-lg",
              theme === 'light' ? "bg-gray-100 text-gray-600" : "bg-white/5 text-white/60"
            )}>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
              className="h-9"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
