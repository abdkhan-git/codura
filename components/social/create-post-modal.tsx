"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  PartyPopper,
  Lightbulb,
  Briefcase,
  Users,
  Calendar,
  BookOpen,
  Target,
  Send,
  X,
  Image as ImageIcon,
  Smile,
  Link as LinkIcon,
  Video,
  FileText,
  Trophy,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

interface PostType {
  value: string;
  label: string;
  icon: any;
  color: string;
  placeholder: string;
  description: string;
}

const POST_TYPES: PostType[] = [
  {
    value: 'celebrate',
    label: 'Celebrate',
    icon: PartyPopper,
    color: 'from-purple-500 to-pink-500',
    placeholder: 'Share a win, milestone, or achievement...',
    description: 'Share your achievements and celebrate wins'
  },
  {
    value: 'find_expert',
    label: 'Find an Expert',
    icon: Lightbulb,
    color: 'from-yellow-500 to-orange-500',
    placeholder: 'What expertise are you looking for?',
    description: 'Looking for help or mentorship on a topic'
  },
  {
    value: 'hiring',
    label: 'We\'re Hiring',
    icon: Briefcase,
    color: 'from-blue-500 to-cyan-500',
    placeholder: 'Share details about the open position...',
    description: 'Post about job opportunities'
  },
  {
    value: 'study_pod',
    label: 'Find Study Pod',
    icon: Users,
    color: 'from-green-500 to-emerald-500',
    placeholder: 'Looking for study partners to prep for...',
    description: 'Find peers to study and prepare together'
  },
  {
    value: 'mock_interview',
    label: 'Mock Interview',
    icon: Target,
    color: 'from-red-500 to-rose-500',
    placeholder: 'Looking for mock interview practice for...',
    description: 'Practice interviews with peers'
  },
  {
    value: 'event',
    label: 'Create Event',
    icon: Calendar,
    color: 'from-indigo-500 to-purple-500',
    placeholder: 'What event are you organizing?',
    description: 'Organize a coding event or meetup'
  },
  {
    value: 'share_resource',
    label: 'Share Resource',
    icon: BookOpen,
    color: 'from-teal-500 to-cyan-500',
    placeholder: 'Share a helpful resource or tutorial...',
    description: 'Share learning materials with the community'
  },
  {
    value: 'problem_solved',
    label: 'Problem Solved',
    icon: Trophy,
    color: 'from-amber-500 to-yellow-500',
    placeholder: 'Share your solution approach...',
    description: 'Celebrate solving a coding problem'
  },
  {
    value: 'achievement_earned',
    label: 'Achievement Earned',
    icon: PartyPopper,
    color: 'from-purple-500 to-pink-500',
    placeholder: 'Share your achievement...',
    description: 'Celebrate earning an achievement'
  },
  {
    value: 'streak_milestone',
    label: 'Streak Milestone',
    icon: Target,
    color: 'from-green-500 to-emerald-500',
    placeholder: 'Share your consistency journey...',
    description: 'Celebrate your study streak'
  },
  {
    value: 'study_plan_shared',
    label: 'Study Plan Shared',
    icon: BookOpen,
    color: 'from-blue-500 to-cyan-500',
    placeholder: 'Share your study plan...',
    description: 'Share your learning roadmap'
  },
  {
    value: 'general',
    label: 'General Post',
    icon: Sparkles,
    color: 'from-gray-500 to-slate-500',
    placeholder: 'What\'s on your mind?',
    description: 'Share thoughts, questions, or updates'
  }
];

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    name: string;
    email: string;
    avatar: string;
    username?: string;
  };
  onPostCreated: () => void;
}

export function CreatePostModal({ open, onOpenChange, user, onPostCreated }: CreatePostModalProps) {
  const { theme } = useTheme();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const selectedPostType = POST_TYPES.find(t => t.value === selectedType);

  const handleSubmit = async () => {
    if (!selectedType) {
      toast.error('Please select a post type');
      return;
    }

    if (!content.trim()) {
      toast.error('Please enter some content');
      return;
    }

    try {
      setIsSubmitting(true);

      // Handle media uploads
      let mediaUrls: string[] = [];
      if (mediaFiles.length > 0) {
        // Simulate upload - in production, upload to storage service
        mediaUrls = mediaFiles.map((_, index) =>
          `https://example.com/media/${Date.now()}-${index}.jpg`
        );
      }

      const response = await fetch('/api/feed/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          post_type: selectedType,
          media_urls: mediaUrls,
          metadata: {
            link: link || null,
            original_type: selectedType,
            uploaded_files: mediaFiles.length
          },
          is_public: true
        })
      });

      if (response.ok) {
        toast.success('Post created successfully!');
        // Reset form
        setContent('');
        setLink('');
        setMediaFiles([]);
        setSelectedType(null);
        onOpenChange(false);
        onPostCreated();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setMediaFiles(prev => [...prev, ...files].slice(0, 4)); // Max 4 files
    }
  };

  const removeFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addEmoji = (emoji: string) => {
    setContent(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-w-2xl p-0 gap-0 overflow-hidden",
        theme === 'light'
          ? "bg-white/95 backdrop-blur-xl"
          : "bg-zinc-950/95 backdrop-blur-xl"
      )}>
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 ring-2 ring-brand/20">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-brand to-orange-300 text-white font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-xl">Create a post</DialogTitle>
                <p className="text-sm text-muted-foreground">{user.name}</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Post Type Selection */}
          {!selectedType ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                What do you want to talk about?
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {POST_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setSelectedType(type.value)}
                      className={cn(
                        "group relative p-4 rounded-xl border-2 transition-all duration-300 text-left overflow-hidden",
                        "hover:scale-[1.02] hover:shadow-lg",
                        theme === 'light'
                          ? "bg-white border-border/30 hover:border-brand/50"
                          : "bg-zinc-900 border-border/30 hover:border-brand/50"
                      )}
                    >
                      {/* Gradient Background */}
                      <div className={cn(
                        "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300",
                        `bg-gradient-to-br ${type.color}`
                      )} />

                      <div className="relative flex items-start gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br shadow-lg",
                          type.color
                        )}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground mb-1">
                            {type.label}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {type.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected Type Header */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  {selectedPostType && (
                    <>
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br shadow-md",
                        selectedPostType.color
                      )}>
                        <selectedPostType.icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{selectedPostType.label}</p>
                        <p className="text-xs text-muted-foreground">{selectedPostType.description}</p>
                      </div>
                    </>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedType(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Change
                </Button>
              </div>

              {/* Content Input */}
              <Textarea
                placeholder={selectedPostType?.placeholder || "What's on your mind?"}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[150px] resize-none text-base border-2 focus:border-brand"
                autoFocus
              />

              {/* Character Count */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{content.length} / 2000 characters</span>
                {content.length > 1900 && (
                  <span className={cn(
                    "font-semibold",
                    content.length > 2000 ? "text-destructive" : "text-amber-500"
                  )}>
                    {2000 - content.length} remaining
                  </span>
                )}
              </div>

              {/* Link Input (for specific post types) */}
              {(selectedType === 'share_resource' || selectedType === 'event') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Add a link</label>
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    className="border-2"
                  />
                </div>
              )}

              {/* Media Preview */}
              {mediaFiles.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Attached files ({mediaFiles.length}/4)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {mediaFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted border border-border">
                          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate flex-1">{file.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeFile(index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="p-3 border-2 rounded-lg bg-background">
                  <div className="grid grid-cols-8 gap-2">
                    {['😀', '😂', '😍', '🥳', '👍', '❤️', '🔥', '💯', '🎉', '🚀', '💪', '⭐', '🎯', '💡', '🌟', '🎊', '✨', '🏆', '📚', '💻', '🤝', '👏', '🙌', '🎓'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => addEmoji(emoji)}
                        className="w-8 h-8 hover:bg-muted rounded transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Toolbar */}
              <div className="flex items-center justify-between pt-4 border-t border-border/20">
                <div className="flex items-center gap-1">
                  <input
                    type="file"
                    id="media-upload"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={mediaFiles.length >= 4}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => document.getElementById('media-upload')?.click()}
                    disabled={mediaFiles.length >= 4}
                    className="gap-2"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Media
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="gap-2"
                  >
                    <Smile className="w-4 h-4" />
                    Emoji
                  </Button>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !content.trim() || content.length > 2000}
                  className="gap-2 bg-gradient-to-r from-brand to-purple-600 hover:from-brand/90 hover:to-purple-600/90 text-white shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Post
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
