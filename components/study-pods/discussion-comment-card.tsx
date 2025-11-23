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

interface Reaction {
  count: number;
  users: string[];
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
  const [showRepliesExpanded, setShowRepliesExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reactions, setReactions] = useState<Record<string, Reaction>>({});
  const [loadingReactions, setLoadingReactions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [aiReview, setAiReview] = useState<string | null>(comment.metadata?.ai_review?.content || null);
  const [loadingAiReview, setLoadingAiReview] = useState(false);
  const [showAiReview, setShowAiReview] = useState(false);

  const isAuthor = comment.user_id === currentUserId;
  const canEdit = isAuthor || isAdmin;
  const canDelete = isAuthor || isAdmin;

  // Fetch reactions on mount
  useEffect(() => {
    fetchReactions();
  }, [comment.id]);

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
    if (!showRepliesExpanded && replies.length === 0 && comment.reply_count > 0) {
      onLoadReplies?.();
    }
    setShowRepliesExpanded(!showRepliesExpanded);
  };

  // Get reaction counts for display
  const reactionList = Object.entries(reactions).filter(([_, r]) => r.count > 0);

  return (
    <div
      className={cn(
        "group rounded-xl border-2 transition-all",
        depth > 0 && "ml-8 border-l-4",
        comment.is_accepted_solution
          ? theme === 'light'
            ? "bg-emerald-50/50 border-emerald-200"
            : "bg-emerald-500/5 border-emerald-500/30"
          : theme === 'light'
            ? "bg-white border-gray-200 hover:border-gray-300"
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
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGetAiReview}
                disabled={loadingAiReview}
                className={cn(
                  "gap-1.5 px-2 opacity-0 group-hover:opacity-100 transition-opacity",
                  aiReview && "opacity-100 text-purple-500"
                )}
                title="Get AI Code Review"
              >
                {loadingAiReview ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </Button>
            )}

            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
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
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {reactionList.map(([type, data]) => (
            <button
              key={type}
              onClick={() => handleReaction(type)}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all",
                data.userReacted
                  ? theme === 'light'
                    ? "bg-blue-100 border-blue-300 text-blue-700"
                    : "bg-blue-500/20 border-blue-500/40 text-blue-400"
                  : theme === 'light'
                    ? "bg-gray-100 border-gray-200 hover:bg-gray-200"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
              )}
            >
              <span>{REACTION_EMOJIS[type]}</span>
              <span className="font-medium">{data.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className={cn(
        "px-4 py-3 flex items-center justify-between border-t",
        theme === 'light' ? "border-gray-100" : "border-white/5"
      )}>
        <div className="flex items-center gap-1">
          {/* Upvote */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVote(1)}
            disabled={voting || isAuthor}
            className={cn(
              "gap-1.5 px-2",
              localVote === 1 && "text-emerald-500"
            )}
          >
            <ThumbsUp className={cn("w-4 h-4", localVote === 1 && "fill-emerald-500")} />
            <span className="text-xs font-medium">{localUpvotes}</span>
          </Button>

          {/* Downvote */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVote(-1)}
            disabled={voting || isAuthor}
            className={cn(
              "gap-1.5 px-2",
              localVote === -1 && "text-red-500"
            )}
          >
            <ThumbsDown className={cn("w-4 h-4", localVote === -1 && "fill-red-500")} />
            <span className="text-xs font-medium">{localDownvotes}</span>
          </Button>

          {/* Reaction Picker */}
          <Popover open={showReactionPicker} onOpenChange={setShowReactionPicker}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="px-2">
                <span className="text-sm">😀</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="flex gap-1">
                {Object.entries(REACTION_EMOJIS).map(([type, emoji]) => (
                  <button
                    key={type}
                    onClick={() => handleReaction(type)}
                    disabled={loadingReactions}
                    className={cn(
                      "p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-lg",
                      reactions[type]?.userReacted && "bg-blue-100 dark:bg-blue-500/20"
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
            "px-2",
            localBookmarked && "text-amber-500"
          )}
        >
          {localBookmarked ? (
            <BookmarkCheck className="w-4 h-4 fill-amber-500" />
          ) : (
            <Bookmark className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Nested Replies */}
      {showRepliesExpanded && (
        <div className={cn(
          "px-4 pb-4 space-y-3",
          theme === 'light' ? "bg-gray-50/50" : "bg-white/2"
        )}>
          {loadingReplies ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            </div>
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
                onDelete={onDelete}
                showReplies={false}
                depth={depth + 1}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
