"use client";

import { useState, useEffect } from "react";
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
  problemId: number;
  problemTitle: string;
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

  useEffect(() => {
    if (isOpen) {
      fetchDiscussion();
    }
  }, [isOpen, podId, problemId, sort, filter, pagination.page]);

  const fetchDiscussion = async () => {
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

  const loadReplies = async (parentId: string) => {
    setLoadingReplies(prev => ({ ...prev, [parentId]: true }));
    try {
      const response = await fetch(
        `/api/study-pods/${podId}/problems/${problemId}/discussions/comments?parent_id=${parentId}`
      );

      if (response.ok) {
        const data = await response.json();
        setRepliesCache(prev => ({ ...prev, [parentId]: data.replies }));
      }
    } catch (error) {
      toast.error('Failed to load replies');
    } finally {
      setLoadingReplies(prev => ({ ...prev, [parentId]: false }));
    }
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
        "max-w-4xl max-h-[90vh] overflow-hidden flex flex-col",
        theme === 'light' ? "bg-white" : "bg-zinc-900"
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-emerald-500" />
              <span>Discussion: {problemTitle}</span>
            </div>
            {thread && (
              <div className="flex items-center gap-2 text-sm font-normal">
                <Badge variant="outline" className="gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {thread.comment_count} comments
                </Badge>
                <Badge variant="outline" className="gap-1 text-emerald-500 border-emerald-500/30">
                  <Code2 className="w-3 h-3" />
                  {thread.solution_count} solutions
                </Badge>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            {/* Filter */}
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-[140px] h-8">
                <Filter className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="solutions">Solutions</SelectItem>
                <SelectItem value="questions">Questions</SelectItem>
                <SelectItem value="discussions">Discussions</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sort} onValueChange={(v: any) => setSort(v)}>
              <SelectTrigger className="w-[120px] h-8">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="top">Top Voted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => setShowComposer(true)}
            className="bg-gradient-to-r from-emerald-500 to-green-500"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Post
          </Button>
        </div>

        {/* Composer */}
        {showComposer && (
          <div className={cn(
            "p-4 rounded-xl border-2 my-3",
            theme === 'light'
              ? "bg-gray-50 border-gray-200"
              : "bg-white/5 border-white/10"
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
                onUpdate={fetchDiscussion}
                onDelete={fetchDiscussion}
                replies={repliesCache[comment.id] || []}
                onLoadReplies={() => loadReplies(comment.id)}
                loadingReplies={loadingReplies[comment.id]}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-3 border-t border-gray-200 dark:border-white/10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className={cn(
              "text-sm",
              theme === 'light' ? "text-gray-600" : "text-white/60"
            )}>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
