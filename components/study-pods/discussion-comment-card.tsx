"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DefaultAvatar } from "@/components/ui/default-avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Bookmark,
  BookmarkCheck,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  X,
  Clock,
  Zap,
  Code2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Reply,
  Copy,
  CheckCheck,
  Sparkles,
  Bot,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import ReactMarkdown from "react-markdown";

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
  edited_at?: string;
  is_accepted_solution: boolean;
  created_at: string;
  metadata?: {
    ai_review?: {
      content: string;
      generated_at: string;
    };
  };
  user: {
    user_id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  } | null;
  user_vote: number | null;
  is_bookmarked: boolean;
}

interface ReactionUser {
  id: string;
  name: string;
  avatar?: string;
}

interface Reaction {
  count: number;
  users: ReactionUser[];
  userReacted: boolean;
}

interface DiscussionCommentCardProps {
  comment: Comment;
  podId: string;
  problemId: string;
  currentUserId: string;
  isAdmin: boolean;
  onReply?: (parentId: string) => void;
  onUpdate?: () => void;
  onDelete?: () => void;
  showReplies?: boolean;
  replies?: Comment[];
  onLoadReplies?: () => void;
  loadingReplies?: boolean;
  depth?: number;
  // New props for proper state management
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
  onReplyDeleted?: (replyId: string) => void;
  // Props for nested replies
  allRepliesCache?: Record<string, Comment[]>;
  allLoadingReplies?: Record<string, boolean>;
  allExpandedComments?: Set<string>;
  onToggleAnyExpanded?: (commentId: string) => void;
  onLoadAnyReplies?: (commentId: string) => void;
}

const TYPE_COLORS = {
  solution: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  question: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  hint: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  discussion: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

const TYPE_LABELS = {
  solution: 'Solution',
  question: 'Question',
  hint: 'Hint',
  discussion: 'Discussion',
};

const REACTION_EMOJIS: Record<string, string> = {
  thumbs_up: '👍',
  thumbs_down: '👎',
  heart: '❤️',
  rocket: '🚀',
  eyes: '👀',
  tada: '🎉',
  thinking: '🤔',
  fire: '🔥',
};

export function DiscussionCommentCard({
  comment,
  podId,
  problemId,
  currentUserId,
  isAdmin,
  onReply,
  onUpdate,
  onDelete,
  showReplies = true,
  replies = [],
  onLoadReplies,
  loadingReplies = false,
  depth = 0,
  isExpanded,
  onToggleExpanded,
  onReplyDeleted,
  allRepliesCache,
  allLoadingReplies,
  allExpandedComments,
  onToggleAnyExpanded,
  onLoadAnyReplies,
}: DiscussionCommentCardProps) {
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [voting, setVoting] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [showCode, setShowCode] = useState(true);
  const [localUpvotes, setLocalUpvotes] = useState(comment.upvotes);
  const [localDownvotes, setLocalDownvotes] = useState(comment.downvotes);
  const [localVote, setLocalVote] = useState(comment.user_vote);
  const [localBookmarked, setLocalBookmarked] = useState(comment.is_bookmarked);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reactions, setReactions] = useState<Record<string, Reaction>>({});
  const [loadingReactions, setLoadingReactions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [aiReview, setAiReview] = useState<string | null>(comment.metadata?.ai_review?.content || null);
  const [loadingAiReview, setLoadingAiReview] = useState(false);
  const [showAiReview, setShowAiReview] = useState(false);
  const [voters, setVoters] = useState<{
    upvoters: Array<{ id: string; name: string; avatar?: string }>;
    downvoters: Array<{ id: string; name: string; avatar?: string }>;
  }>({ upvoters: [], downvoters: [] });

  // Use controlled expanded state if provided, otherwise use local state
  const [localExpanded, setLocalExpanded] = useState(false);
  const showRepliesExpanded = isExpanded !== undefined ? isExpanded : localExpanded;

  const isAuthor = comment.user_id === currentUserId;
  const canEdit = isAuthor || isAdmin;
  const canDelete = isAuthor || isAdmin;

  // Fetch reactions and voters on mount
  useEffect(() => {
    fetchReactions();
    fetchVoters();
  }, [comment.id]);

  const fetchVoters = async () => {
    try {
      const response = await fetch(
        `/api/study-pods/${podId}/problems/${problemId}/discussions/comments/${comment.id}/vote`
      );
      if (response.ok) {
        const data = await response.json();
        setVoters({
          upvoters: data.upvoters || [],
          downvoters: data.downvoters || [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch voters');
    }
  };

  const fetchReactions = async () => {
    try {
      const response = await fetch(
        `/api/study-pods/${podId}/problems/${problemId}/discussions/comments/${comment.id}/reactions`
      );
      if (response.ok) {
        const data = await response.json();
        setReactions(data.reactions || {});
      }
    } catch (error) {
      console.error('Failed to fetch reactions');
    }
  };

  const handleCopyCode = async () => {
    if (!comment.code_snippet) return;

    try {
      await navigator.clipboard.writeText(comment.code_snippet);
      setCopied(true);
      toast.success('Code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  const handleReaction = async (reactionType: string) => {
    setLoadingReactions(true);
    try {
      const response = await fetch(
        `/api/study-pods/${podId}/problems/${problemId}/discussions/comments/${comment.id}/reactions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reaction: reactionType }),
        }
      );

      if (response.ok) {
        fetchReactions();
        setShowReactionPicker(false);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to react');
      }
    } catch (error) {
      toast.error('Failed to react');
    } finally {
      setLoadingReactions(false);
    }
  };

  const handleGetAiReview = async () => {
    if (!comment.code_snippet) {
      toast.error('No code to review');
      return;
    }

    setLoadingAiReview(true);
    try {
      const response = await fetch(
        `/api/study-pods/${podId}/problems/${problemId}/discussions/comments/${comment.id}/ai-review`,
        { method: 'POST' }
      );

      if (response.ok) {
        const data = await response.json();
        setAiReview(data.review);
        setShowAiReview(true);
        toast.success('AI review generated');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to get AI review');
      }
    } catch (error) {
      toast.error('Failed to get AI review');
    } finally {
      setLoadingAiReview(false);
    }
  };

  const handleVote = async (voteType: 1 | -1) => {
    if (voting || isAuthor) return;

    setVoting(true);
    try {
      const response = await fetch(
        `/api/study-pods/${podId}/problems/${problemId}/discussions/comments/${comment.id}/vote`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vote_type: voteType }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLocalUpvotes(data.upvotes);
        setLocalDownvotes(data.downvotes);
        setLocalVote(data.vote);
        // Refresh voters list
        fetchVoters();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to vote');
      }
    } catch (error) {
      toast.error('Failed to vote');
    } finally {
      setVoting(false);
    }
  };

  const handleBookmark = async () => {
    if (bookmarking) return;

    setBookmarking(true);
    try {
      const response = await fetch(
        `/api/study-pods/${podId}/problems/${problemId}/discussions/comments/${comment.id}/bookmark`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLocalBookmarked(data.is_bookmarked);
        toast.success(data.message);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to bookmark');
      }
    } catch (error) {
      toast.error('Failed to bookmark');
    } finally {
      setBookmarking(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        `/api/study-pods/${podId}/problems/${problemId}/discussions/comments/${comment.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: editContent }),
        }
      );

      if (response.ok) {
        toast.success('Comment updated');
        setIsEditing(false);
        onUpdate?.();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update comment');
      }
    } catch (error) {
      toast.error('Failed to update comment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `/api/study-pods/${podId}/problems/${problemId}/discussions/comments/${comment.id}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        toast.success('Comment deleted');
        onDelete?.();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete comment');
      }
    } catch (error) {
      toast.error('Failed to delete comment');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleReplies = () => {
    if (onToggleExpanded) {
      // Use controlled state
      onToggleExpanded();
    } else {
      // Use local state
      if (!localExpanded && replies.length === 0 && comment.reply_count > 0) {
        onLoadReplies?.();
      }
      setLocalExpanded(!localExpanded);
    }
  };

  // Get reaction counts for display
  const reactionList = Object.entries(reactions).filter(([_, r]) => r.count > 0);

  return (
    <div className={cn("relative", depth > 0 && "mt-3")}>
      {/* Threading line for replies */}
      {depth > 0 && (
        <div className={cn(
          "absolute left-2.5 top-0 bottom-0 w-0.5 rounded-full",
          theme === 'light' ? "bg-gradient-to-b from-emerald-200 to-transparent" : "bg-gradient-to-b from-emerald-500/30 to-transparent"
        )} />
      )}
      <div
        className={cn(
          "group rounded-xl border-2 transition-all",
          depth > 0 && "ml-6",
          comment.is_accepted_solution
            ? theme === 'light'
              ? "bg-emerald-50/50 border-emerald-300 shadow-sm shadow-emerald-100"
              : "bg-emerald-500/5 border-emerald-500/30"
            : theme === 'light'
              ? "bg-white border-gray-200 hover:border-gray-300 hover:shadow-md transition-shadow"
              : "bg-white/5 border-white/10 hover:border-white/20"
        )}
      >
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <DefaultAvatar
              src={comment.user?.avatar_url}
              name={comment.user?.full_name || comment.user?.username || 'User'}
              size="sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-medium text-sm",
                  theme === 'light' ? "text-gray-900" : "text-white"
                )}>
                  {comment.user?.full_name || comment.user?.username || 'Unknown User'}
                </span>
                <Badge variant="outline" className={cn("text-xs", TYPE_COLORS[comment.comment_type])}>
                  {TYPE_LABELS[comment.comment_type]}
                </Badge>
                {comment.is_accepted_solution && (
                  <Badge className="bg-emerald-500 text-white text-xs gap-1">
                    <Check className="w-3 h-3" />
                    Accepted
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn(
                  "text-xs",
                  theme === 'light' ? "text-gray-500" : "text-white/50"
                )}>
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
                {comment.is_edited && (
                  <span className={cn(
                    "text-xs italic",
                    theme === 'light' ? "text-gray-400" : "text-white/40"
                  )}>
                    (edited)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* AI Review Button (for solutions with code) */}
            {comment.comment_type === 'solution' && comment.code_snippet && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={aiReview ? "default" : "outline"}
                      size="sm"
                      onClick={handleGetAiReview}
                      disabled={loadingAiReview}
                      className={cn(
                        "gap-1.5 px-3 h-8 transition-all",
                        aiReview
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-md shadow-purple-500/20"
                          : theme === 'light'
                            ? "border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300"
                            : "border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                      )}
                    >
                      {loadingAiReview ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Bot className="w-4 h-4" />
                          <Sparkles className="w-3 h-3" />
                        </>
                      )}
                      <span className="text-xs font-medium">
                        {aiReview ? 'AI Review' : 'Get AI Review'}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Get AI-powered code review and suggestions</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "transition-opacity",
                      theme === 'light'
                        ? "opacity-50 hover:opacity-100"
                        : "opacity-40 hover:opacity-100"
                    )}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  {canDelete && (
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-red-500"
                      disabled={deleting}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Solution metadata */}
        {comment.comment_type === 'solution' && comment.approach_title && (
          <h4 className={cn(
            "font-semibold mt-3",
            theme === 'light' ? "text-gray-900" : "text-white"
          )}>
            {comment.approach_title}
          </h4>
        )}

        {/* Complexity badges */}
        {comment.comment_type === 'solution' && (comment.time_complexity || comment.space_complexity) && (
          <div className="flex items-center gap-3 mt-2">
            {comment.time_complexity && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span className={cn(
                  "text-xs font-mono",
                  theme === 'light' ? "text-gray-600" : "text-white/70"
                )}>
                  Time: {comment.time_complexity}
                </span>
              </div>
            )}
            {comment.space_complexity && (
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span className={cn(
                  "text-xs font-mono",
                  theme === 'light' ? "text-gray-600" : "text-white/70"
                )}>
                  Space: {comment.space_complexity}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-2">
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className={cn(
                "min-h-[100px]",
                theme === 'light' ? "bg-gray-50" : "bg-white/5"
              )}
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={saving}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(comment.content);
                }}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className={cn(
            "prose prose-sm max-w-none",
            theme === 'light' ? "prose-gray" : "prose-invert"
          )}>
            <ReactMarkdown>{comment.content}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Code snippet */}
      {comment.code_snippet && !isEditing && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setShowCode(!showCode)}
              className={cn(
                "flex items-center gap-2 text-xs font-medium",
                theme === 'light' ? "text-gray-600 hover:text-gray-900" : "text-white/60 hover:text-white"
              )}
            >
              <Code2 className="w-4 h-4" />
              {showCode ? 'Hide Code' : 'Show Code'}
              {showCode ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showCode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyCode}
                className="gap-1.5 h-7 px-2"
              >
                {copied ? (
                  <>
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs text-emerald-500">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-xs">Copy</span>
                  </>
                )}
              </Button>
            )}
          </div>
          {showCode && (
            <div className="rounded-lg overflow-hidden text-sm relative">
              <SyntaxHighlighter
                language={comment.code_language || 'javascript'}
                style={theme === 'light' ? oneLight : oneDark}
                customStyle={{
                  margin: 0,
                  borderRadius: '0.5rem',
                  fontSize: '0.8rem',
                }}
              >
                {comment.code_snippet}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
      )}

      {/* AI Review */}
      {aiReview && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowAiReview(!showAiReview)}
            className={cn(
              "flex items-center gap-2 text-xs font-medium mb-2",
              "text-purple-500 hover:text-purple-600"
            )}
          >
            <Bot className="w-4 h-4" />
            <Sparkles className="w-3 h-3" />
            AI Code Review
            {showAiReview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showAiReview && (
            <div className={cn(
              "p-4 rounded-lg border-2",
              theme === 'light'
                ? "bg-purple-50/50 border-purple-200"
                : "bg-purple-500/5 border-purple-500/20"
            )}>
              <div className={cn(
                "prose prose-sm max-w-none",
                theme === 'light' ? "prose-gray" : "prose-invert"
              )}>
                <ReactMarkdown>{aiReview}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reactions */}
      {reactionList.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          <TooltipProvider>
            {reactionList.map(([type, data]) => (
              <Tooltip key={type}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleReaction(type)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all hover:scale-105",
                      data.userReacted
                        ? theme === 'light'
                          ? "bg-blue-100 border-blue-300 text-blue-700 shadow-sm shadow-blue-100"
                          : "bg-blue-500/20 border-blue-500/40 text-blue-400"
                        : theme === 'light'
                          ? "bg-gray-100 border-gray-200 hover:bg-gray-200"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                    )}
                  >
                    <span className="text-sm">{REACTION_EMOJIS[type]}</span>
                    <span className="font-semibold">{data.count}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className={cn(
                    "max-w-[250px] p-2",
                    theme === 'light' ? "bg-white border-gray-200" : "bg-zinc-900 border-white/10"
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-base">{REACTION_EMOJIS[type]}</span>
                    <span className={cn(
                      "font-medium text-xs",
                      theme === 'light' ? "text-gray-900" : "text-white"
                    )}>
                      {type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className={cn(
                    "text-xs",
                    theme === 'light' ? "text-gray-600" : "text-white/70"
                  )}>
                    {data.users.slice(0, 8).map((u, i) => (
                      <span key={u.id}>
                        {u.name}
                        {i < Math.min(data.users.length - 1, 7) ? ', ' : ''}
                      </span>
                    ))}
                    {data.users.length > 8 && (
                      <span className="opacity-70"> and {data.users.length - 8} more</span>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      )}

      {/* Actions */}
      <div className={cn(
        "px-4 py-3 flex items-center justify-between border-t",
        theme === 'light' ? "border-gray-100" : "border-white/5"
      )}>
        <div className="flex items-center gap-2">
          {/* Vote buttons with score */}
          <TooltipProvider>
            <div className={cn(
              "flex items-center rounded-lg border overflow-hidden",
              theme === 'light' ? "border-gray-200 bg-gray-50" : "border-white/10 bg-white/5"
            )}>
              {/* Upvote */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVote(1)}
                    disabled={voting || isAuthor}
                    className={cn(
                      "gap-1 px-2.5 h-8 rounded-none border-r",
                      theme === 'light' ? "border-gray-200" : "border-white/10",
                      localVote === 1 && "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                    )}
                  >
                    {voting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ThumbsUp className={cn("w-3.5 h-3.5", localVote === 1 && "fill-emerald-500")} />
                    )}
                    <span className="text-xs font-semibold">{localUpvotes}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className={cn(
                    "max-w-[250px] p-2",
                    theme === 'light' ? "bg-white border-gray-200" : "bg-zinc-900 border-white/10"
                  )}
                >
                  {isAuthor ? (
                    <p className="text-xs">You can't vote on your own comment</p>
                  ) : voters.upvoters.length > 0 ? (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />
                        <span className={cn(
                          "font-medium text-xs",
                          theme === 'light' ? "text-gray-900" : "text-white"
                        )}>
                          Upvoted by
                        </span>
                      </div>
                      <div className={cn(
                        "text-xs",
                        theme === 'light' ? "text-gray-600" : "text-white/70"
                      )}>
                        {voters.upvoters.slice(0, 8).map((u, i) => (
                          <span key={u.id}>
                            {u.name}
                            {i < Math.min(voters.upvoters.length - 1, 7) ? ', ' : ''}
                          </span>
                        ))}
                        {voters.upvoters.length > 8 && (
                          <span className="opacity-70"> and {voters.upvoters.length - 8} more</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs">Upvote this comment</p>
                  )}
                </TooltipContent>
              </Tooltip>

              {/* Net score */}
              <div className={cn(
                "px-2.5 h-8 flex items-center justify-center min-w-[40px] border-r",
                theme === 'light' ? "border-gray-200" : "border-white/10",
                (localUpvotes - localDownvotes) > 0 && "text-emerald-600",
                (localUpvotes - localDownvotes) < 0 && "text-red-500"
              )}>
                <span className="text-xs font-bold">
                  {(localUpvotes - localDownvotes) > 0 ? '+' : ''}{localUpvotes - localDownvotes}
                </span>
              </div>

              {/* Downvote */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVote(-1)}
                    disabled={voting || isAuthor}
                    className={cn(
                      "gap-1 px-2.5 h-8 rounded-none",
                      localVote === -1 && "text-red-500 bg-red-50 dark:bg-red-500/10"
                    )}
                  >
                    <ThumbsDown className={cn("w-3.5 h-3.5", localVote === -1 && "fill-red-500")} />
                    <span className="text-xs font-semibold">{localDownvotes}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className={cn(
                    "max-w-[250px] p-2",
                    theme === 'light' ? "bg-white border-gray-200" : "bg-zinc-900 border-white/10"
                  )}
                >
                  {isAuthor ? (
                    <p className="text-xs">You can't vote on your own comment</p>
                  ) : voters.downvoters.length > 0 ? (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <ThumbsDown className="w-3.5 h-3.5 text-red-500" />
                        <span className={cn(
                          "font-medium text-xs",
                          theme === 'light' ? "text-gray-900" : "text-white"
                        )}>
                          Downvoted by
                        </span>
                      </div>
                      <div className={cn(
                        "text-xs",
                        theme === 'light' ? "text-gray-600" : "text-white/70"
                      )}>
                        {voters.downvoters.slice(0, 8).map((u, i) => (
                          <span key={u.id}>
                            {u.name}
                            {i < Math.min(voters.downvoters.length - 1, 7) ? ', ' : ''}
                          </span>
                        ))}
                        {voters.downvoters.length > 8 && (
                          <span className="opacity-70"> and {voters.downvoters.length - 8} more</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs">Downvote this comment</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>

          {/* Reaction Picker */}
          <Popover open={showReactionPicker} onOpenChange={setShowReactionPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "px-2.5 h-8 rounded-lg",
                  theme === 'light' ? "hover:bg-gray-100" : "hover:bg-white/10"
                )}
              >
                <span className="text-base">😊</span>
                <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className={cn(
              "w-auto p-3",
              theme === 'light' ? "bg-white" : "bg-zinc-900"
            )} align="start">
              <p className={cn(
                "text-xs font-medium mb-2",
                theme === 'light' ? "text-gray-500" : "text-white/50"
              )}>
                Add reaction
              </p>
              <div className="flex gap-1 flex-wrap max-w-[200px]">
                {Object.entries(REACTION_EMOJIS).map(([type, emoji]) => (
                  <button
                    key={type}
                    onClick={() => handleReaction(type)}
                    disabled={loadingReactions}
                    className={cn(
                      "p-2 rounded-lg hover:scale-110 transition-all text-xl",
                      theme === 'light' ? "hover:bg-gray-100" : "hover:bg-white/10",
                      reactions[type]?.userReacted && (theme === 'light' ? "bg-blue-100 ring-2 ring-blue-300" : "bg-blue-500/20 ring-2 ring-blue-500/40")
                    )}
                    title={type.replace('_', ' ')}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Reply */}
          {onReply && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(comment.id)}
              className="gap-1.5 px-2"
            >
              <Reply className="w-4 h-4" />
              <span className="text-xs">Reply</span>
            </Button>
          )}

          {/* Replies toggle */}
          {showReplies && comment.reply_count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleReplies}
              className="gap-1.5 px-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-xs">
                {comment.reply_count} {comment.reply_count === 1 ? 'reply' : 'replies'}
              </span>
              {showRepliesExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          )}
        </div>

        {/* Bookmark */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBookmark}
          disabled={bookmarking}
          className={cn(
            "px-2.5 gap-1.5 transition-all",
            localBookmarked
              ? "text-amber-500 bg-amber-50 dark:bg-amber-500/10"
              : "hover:text-amber-500"
          )}
          title={localBookmarked ? "Remove bookmark" : "Bookmark this comment"}
        >
          {bookmarking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : localBookmarked ? (
            <>
              <BookmarkCheck className="w-4 h-4 fill-amber-500" />
              <span className="text-xs hidden sm:inline">Saved</span>
            </>
          ) : (
            <Bookmark className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Nested Replies */}
      {showRepliesExpanded && (
        <div className={cn(
          "px-4 pb-4 mt-2",
          theme === 'light' ? "bg-gray-50/50 border-t border-gray-100" : "bg-white/2 border-t border-white/5"
        )}>
          <div className="pt-3 space-y-0">
            {loadingReplies ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                <span className={cn(
                  "ml-2 text-sm",
                  theme === 'light' ? "text-gray-500" : "text-white/50"
                )}>
                  Loading replies...
                </span>
              </div>
            ) : replies.length === 0 ? (
              <p className={cn(
                "text-sm text-center py-4",
                theme === 'light' ? "text-gray-400" : "text-white/40"
              )}>
                No replies yet
              </p>
            ) : (
              replies.map((reply) => (
                <DiscussionCommentCard
                  key={reply.id}
                  comment={reply}
                  podId={podId}
                  problemId={problemId}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  onUpdate={onUpdate}
                  onDelete={() => onReplyDeleted?.(reply.id)}
                  onReply={onReply}
                  showReplies={true}
                  replies={allRepliesCache?.[reply.id] || []}
                  loadingReplies={allLoadingReplies?.[reply.id]}
                  isExpanded={allExpandedComments?.has(reply.id)}
                  onToggleExpanded={() => onToggleAnyExpanded?.(reply.id)}
                  onLoadReplies={() => onLoadAnyReplies?.(reply.id)}
                  onReplyDeleted={(nestedReplyId) => onReplyDeleted?.(nestedReplyId)}
                  allRepliesCache={allRepliesCache}
                  allLoadingReplies={allLoadingReplies}
                  allExpandedComments={allExpandedComments}
                  onToggleAnyExpanded={onToggleAnyExpanded}
                  onLoadAnyReplies={onLoadAnyReplies}
                  depth={depth + 1}
                />
              ))
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
