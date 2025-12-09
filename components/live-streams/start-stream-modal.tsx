"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Search, Video, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface StartStreamModalProps {
  open: boolean;
  onClose: () => void;
}

interface Problem {
  id: number;
  title: string;
  difficulty: string;
  topic_tags: Array<{ name: string; slug: string }>;
}

export function StartStreamModal({ open, onClose }: StartStreamModalProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);

  useEffect(() => {
    if (open) {
      fetchProblems();
    }
  }, [open]);

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.set("search", searchQuery);
      }
      params.set("limit", "20");

      const response = await fetch(`/api/problems?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProblems(data.problems || []);
      }
    } catch (error) {
      console.error("Error fetching problems:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (open) {
        fetchProblems();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleStartStream = (problem: Problem) => {
    router.push(`/problems/${problem.id}`);
    onClose();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "text-green-400 border-green-500/30 bg-green-500/10";
      case "Medium":
        return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
      case "Hard":
        return "text-red-400 border-red-500/30 bg-red-500/10";
      default:
        return "text-muted-foreground border-white/10 bg-muted/10";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-w-2xl max-h-[80vh] overflow-hidden",
        theme === 'light'
          ? "bg-white/90 border-gray-200"
          : "bg-zinc-950/90 border-white/10"
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-purple-400" />
            Start Live Stream
          </DialogTitle>
          <DialogDescription>
            Select a problem to start streaming your coding session
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search problems..."
              className="pl-10"
            />
          </div>

          {/* Problems List */}
          <div className="overflow-y-auto max-h-[400px] space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              </div>
            ) : problems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No problems found
              </div>
            ) : (
              problems.map((problem) => (
                <div
                  key={problem.id}
                  className={cn(
                    "p-4 rounded-lg border-2 cursor-pointer transition-all",
                    theme === 'light'
                      ? "bg-white border-gray-200 hover:border-purple-500/30"
                      : "bg-zinc-900/50 border-white/5 hover:border-purple-500/30",
                    selectedProblem?.id === problem.id && "border-purple-500/50"
                  )}
                  onClick={() => setSelectedProblem(problem)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className={cn(
                        "font-semibold mb-2 line-clamp-1",
                        theme === 'light' ? "text-gray-900" : "text-foreground"
                      )}>
                        {problem.title}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={getDifficultyColor(problem.difficulty)}>
                          {problem.difficulty}
                        </Badge>
                        {problem.topic_tags?.slice(0, 3).map((tag, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="bg-purple-500/10 text-purple-400 border-purple-500/30"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartStream(problem);
                      }}
                    >
                      <Video className="w-4 h-4 mr-2" />
                      Stream
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

