"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  BookOpen,
  Clock,
  Target,
  TrendingUp,
  Star,
  Users,
  CheckCircle2,
  Loader2,
  Search,
  Filter,
  Sparkles,
  Trophy,
  Code,
  Briefcase,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface StudyPlanTemplatesLibraryProps {
  onSelectTemplate?: (templateId: string) => void;
  podId?: string;
}

export function StudyPlanTemplatesLibrary({
  onSelectTemplate,
  podId,
}: StudyPlanTemplatesLibraryProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const categories = [
    { id: "all", label: "All Plans", icon: BookOpen },
    { id: "interview_prep", label: "Interview Prep", icon: Briefcase },
    { id: "data_structures", label: "Data Structures", icon: Code },
    { id: "algorithms", label: "Algorithms", icon: Zap },
    { id: "system_design", label: "System Design", icon: TrendingUp },
    { id: "company_specific", label: "Company Specific", icon: Trophy },
  ];

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== "all") {
        params.append("category", selectedCategory);
      }

      const response = await fetch(`/api/study-plans/templates?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        toast.error("Failed to load templates");
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    onSelectTemplate?.(templateId);
  };

  // Filter templates by search query
  const filteredTemplates = templates.filter((template) =>
    template.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.tags?.some((tag: string) =>
      tag.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className={cn(
          "text-2xl font-bold bg-gradient-to-r from-foreground via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2"
        )}>
          Study Plan Templates
        </h2>
        <p className={cn(
          "text-sm",
          theme === "light" ? "text-gray-600" : "text-muted-foreground"
        )}>
          Choose a structured learning path to guide your interview preparation
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className={cn(
            "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4",
            theme === "light" ? "text-gray-400" : "text-white/40"
          )} />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "pl-10",
              theme === "light"
                ? "bg-white border-gray-200"
                : "bg-zinc-900/50 border-white/10"
            )}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = selectedCategory === category.id;

          return (
            <Button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              variant="outline"
              size="sm"
              className={cn(
                "transition-all duration-300",
                isActive
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-lg shadow-purple-500/30"
                  : theme === "light"
                    ? "bg-white hover:bg-gray-50 border-gray-200"
                    : "bg-zinc-900/50 hover:bg-zinc-900/70 border-white/10"
              )}
            >
              <Icon className="w-4 h-4 mr-2" />
              {category.label}
            </Button>
          );
        })}
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className={cn(
          "text-center py-12 rounded-xl border-2",
          theme === "light" ? "bg-white border-gray-200" : "bg-zinc-900/50 border-white/5"
        )}>
          <BookOpen className={cn(
            "w-12 h-12 mx-auto mb-4",
            theme === "light" ? "text-gray-400" : "text-white/30"
          )} />
          <p className={cn(
            "text-lg font-medium",
            theme === "light" ? "text-gray-900" : "text-white"
          )}>
            No templates found
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredTemplates.map((template, index) => (
              <TemplateCard
                key={template.id}
                template={template}
                index={index}
                theme={theme}
                isSelected={selectedTemplate === template.id}
                onSelect={() => handleSelectTemplate(template.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

interface TemplateCardProps {
  template: any;
  index: number;
  theme: string | undefined;
  isSelected: boolean;
  onSelect: () => void;
}

function TemplateCard({
  template,
  index,
  theme,
  isSelected,
  onSelect,
}: TemplateCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const difficultyConfig = {
    beginner: { color: "emerald", label: "Beginner" },
    intermediate: { color: "cyan", label: "Intermediate" },
    advanced: { color: "purple", label: "Advanced" },
    expert: { color: "orange", label: "Expert" },
  };

  const config =
    difficultyConfig[
      template.difficulty_level as keyof typeof difficultyConfig
    ] || difficultyConfig.beginner;

  const milestoneCount = template.milestones?.length || template.total_milestones || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative group"
    >
      {/* Glow effect */}
      <div
        className={cn(
          "absolute -inset-1 bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-purple-500/30 rounded-2xl blur-xl transition-all duration-500",
          isHovered ? "opacity-60" : "opacity-0"
        )}
      />

      <Card
        className={cn(
          "relative p-6 border-2 backdrop-blur-xl transition-all duration-500 cursor-pointer overflow-hidden h-full flex flex-col",
          theme === "light"
            ? "bg-white border-gray-200 hover:border-purple-300 hover:shadow-2xl"
            : "bg-gradient-to-br from-zinc-950/80 via-zinc-900/50 to-zinc-950/80 border-white/10 hover:border-purple-500/40 hover:shadow-2xl",
          isSelected && "ring-2 ring-purple-500",
          isHovered && "transform scale-[1.02]"
        )}
        onClick={onSelect}
      >
        {/* Background patterns */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(168,85,247,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(236,72,153,0.15),transparent_50%)]" />
        </div>

        {/* Official/Featured Badge */}
        {(template.is_official || template.is_featured) && (
          <div className="absolute top-4 right-4 flex gap-2">
            {template.is_official && (
              <Badge className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border border-amber-500/30 backdrop-blur-sm">
                <Star className="w-3 h-3 mr-1" />
                Official
              </Badge>
            )}
            {template.is_featured && (
              <Badge className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/30 backdrop-blur-sm">
                <Sparkles className="w-3 h-3 mr-1" />
                Featured
              </Badge>
            )}
          </div>
        )}

        <div className="relative z-10 flex-1 flex flex-col">
          {/* Icon & Title */}
          <div className="mb-4">
            {template.icon && (
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-3 text-2xl",
                  `bg-${config.color}-500/10 border border-${config.color}-500/20`
                )}
              >
                {template.icon}
              </div>
            )}
            <h3
              className={cn(
                "text-lg font-bold mb-2 line-clamp-2",
                theme === "light" ? "text-gray-900" : "text-white"
              )}
            >
              {template.display_name}
            </h3>
            <p
              className={cn(
                "text-sm line-clamp-3",
                theme === "light" ? "text-gray-600" : "text-muted-foreground"
              )}
            >
              {template.description}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div
              className={cn(
                "p-3 rounded-lg border backdrop-blur-sm",
                theme === "light"
                  ? "bg-gray-50 border-gray-200"
                  : "bg-zinc-900/50 border-white/5"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-purple-400" />
                <span
                  className={cn(
                    "text-xs font-medium",
                    theme === "light" ? "text-gray-600" : "text-muted-foreground"
                  )}
                >
                  Milestones
                </span>
              </div>
              <div className="text-xl font-bold text-purple-400">
                {milestoneCount}
              </div>
            </div>
            <div
              className={cn(
                "p-3 rounded-lg border backdrop-blur-sm",
                theme === "light"
                  ? "bg-gray-50 border-gray-200"
                  : "bg-zinc-900/50 border-white/5"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-pink-400" />
                <span
                  className={cn(
                    "text-xs font-medium",
                    theme === "light" ? "text-gray-600" : "text-muted-foreground"
                  )}
                >
                  Duration
                </span>
              </div>
              <div className="text-xl font-bold text-pink-400">
                {template.estimated_weeks}w
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge
              className={cn(
                "text-xs",
                `bg-${config.color}-500/10 text-${config.color}-400 border-${config.color}-500/30`
              )}
            >
              {config.label}
            </Badge>
            {template.tags?.slice(0, 2).map((tag: string, idx: number) => (
              <Badge
                key={idx}
                variant="outline"
                className={cn(
                  "text-xs",
                  theme === "light"
                    ? "bg-gray-50 border-gray-200"
                    : "bg-zinc-900/50 border-white/10"
                )}
              >
                {tag}
              </Badge>
            ))}
          </div>

          {/* Usage Stats */}
          <div className="flex items-center gap-4 text-xs mt-auto pt-4 border-t border-white/5">
            {template.usage_count > 0 && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-cyan-400" />
                <span
                  className={cn(
                    theme === "light" ? "text-gray-600" : "text-muted-foreground"
                  )}
                >
                  {template.usage_count} users
                </span>
              </div>
            )}
            {template.average_rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span
                  className={cn(
                    theme === "light" ? "text-gray-600" : "text-muted-foreground"
                  )}
                >
                  {template.average_rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* Select Button */}
          <div className="mt-4">
            <Button
              className={cn(
                "w-full transition-all duration-300",
                isSelected
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30"
                  : "bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-400 hover:from-purple-500 hover:to-pink-500 hover:text-white border border-purple-500/30"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              {isSelected ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Selected
                </>
              ) : (
                "Select Plan"
              )}
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
