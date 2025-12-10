"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  Trophy,
  Star,
  TrendingUp,
  Users,
  Target,
  Award,
  Sparkles,
  Loader2,
  Quote,
  ThumbsUp,
  Briefcase,
  ExternalLink,
  Medal,
  Crown,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface PodReputationDashboardProps {
  podId: string;
}

export function PodReputationDashboard({ podId }: PodReputationDashboardProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [reputation, setReputation] = useState<any>(null);

  useEffect(() => {
    fetchReputation();
  }, [podId]);

  const fetchReputation = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/study-pods/${podId}/reputation`);
      if (response.ok) {
        const data = await response.json();
        setReputation(data);
      } else {
        toast.error("Failed to load reputation data");
      }
    } catch (error) {
      console.error("Error fetching reputation:", error);
      toast.error("Failed to load reputation data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!reputation) {
    return null;
  }

  const { pod, stats, badges, rankings, testimonials, alumni } = reputation;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2
          className={cn(
            "text-2xl font-bold bg-gradient-to-r from-foreground via-amber-400 to-orange-400 bg-clip-text text-transparent mb-2"
          )}
        >
          Pod Reputation & Achievements
        </h2>
        <p
          className={cn(
            "text-sm",
            theme === "light" ? "text-gray-600" : "text-muted-foreground"
          )}
        >
          Showcase your pod's success and social proof
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Members"
          value={stats.member_count}
          color="cyan"
          theme={theme}
        />
        <StatCard
          icon={Trophy}
          label="Problems Solved"
          value={stats.problems_solved}
          color="emerald"
          theme={theme}
        />
        <StatCard
          icon={Star}
          label="Average Rating"
          value={stats.average_rating.toFixed(1)}
          color="amber"
          theme={theme}
        />
        <StatCard
          icon={Award}
          label="Badges Earned"
          value={badges.length}
          color="purple"
          theme={theme}
        />
      </div>

      {/* Badges Section */}
      {badges && badges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card
            className={cn(
              "p-6 border-2 backdrop-blur-xl",
              theme === "light"
                ? "bg-white border-gray-200"
                : "bg-zinc-950/80 border-white/10"
            )}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3
                  className={cn(
                    "font-semibold",
                    theme === "light" ? "text-gray-900" : "text-white"
                  )}
                >
                  Achievement Badges
                </h3>
                <p
                  className={cn(
                    "text-xs",
                    theme === "light" ? "text-gray-600" : "text-muted-foreground"
                  )}
                >
                  {badges.length} badges earned
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {badges.map((badge: any, index: number) => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  index={index}
                  theme={theme}
                />
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Rankings Section */}
      {rankings && rankings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card
            className={cn(
              "p-6 border-2 backdrop-blur-xl",
              theme === "light"
                ? "bg-white border-gray-200"
                : "bg-zinc-950/80 border-white/10"
            )}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3
                  className={cn(
                    "font-semibold",
                    theme === "light" ? "text-gray-900" : "text-white"
                  )}
                >
                  Global Rankings
                </h3>
                <p
                  className={cn(
                    "text-xs",
                    theme === "light" ? "text-gray-600" : "text-muted-foreground"
                  )}
                >
                  How your pod ranks globally
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rankings.map((ranking: any, index: number) => (
                <RankingCard
                  key={index}
                  ranking={ranking}
                  index={index}
                  theme={theme}
                />
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Testimonials Section */}
      {testimonials && testimonials.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card
            className={cn(
              "p-6 border-2 backdrop-blur-xl",
              theme === "light"
                ? "bg-white border-gray-200"
                : "bg-zinc-950/80 border-white/10"
            )}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
                <Quote className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3
                  className={cn(
                    "font-semibold",
                    theme === "light" ? "text-gray-900" : "text-white"
                  )}
                >
                  Member Testimonials
                </h3>
                <p
                  className={cn(
                    "text-xs",
                    theme === "light" ? "text-gray-600" : "text-muted-foreground"
                  )}
                >
                  What members say about this pod
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {testimonials.map((testimonial: any, index: number) => (
                <TestimonialCard
                  key={testimonial.id}
                  testimonial={testimonial}
                  index={index}
                  theme={theme}
                />
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Alumni Network */}
      {alumni && alumni.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card
            className={cn(
              "p-6 border-2 backdrop-blur-xl",
              theme === "light"
                ? "bg-white border-gray-200"
                : "bg-zinc-950/80 border-white/10"
            )}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                <Briefcase className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3
                  className={cn(
                    "font-semibold",
                    theme === "light" ? "text-gray-900" : "text-white"
                  )}
                >
                  Alumni Network
                </h3>
                <p
                  className={cn(
                    "text-xs",
                    theme === "light" ? "text-gray-600" : "text-muted-foreground"
                  )}
                >
                  Where our members ended up
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alumni.map((alum: any, index: number) => (
                <AlumniCard
                  key={alum.id}
                  alumni={alum}
                  index={index}
                  theme={theme}
                />
              ))}
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: any;
  label: string;
  value: number | string;
  color: string;
  theme: string | undefined;
}

function StatCard({ icon: Icon, label, value, color, theme }: StatCardProps) {
  return (
    <div
      className={cn(
        "p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 hover:scale-105",
        theme === "light"
          ? "bg-gray-50 border-gray-200 hover:shadow-md"
          : "bg-zinc-900/50 border-white/5 hover:bg-zinc-900/70"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("w-4 h-4", `text-${color}-400`)} />
        <span
          className={cn(
            "text-xs font-medium",
            theme === "light" ? "text-gray-600" : "text-muted-foreground"
          )}
        >
          {label}
        </span>
      </div>
      <div className={cn("text-2xl font-bold", `text-${color}-400`)}>
        {value}
      </div>
    </div>
  );
}

interface BadgeCardProps {
  badge: any;
  index: number;
  theme: string | undefined;
}

function BadgeCard({ badge, index, theme }: BadgeCardProps) {
  const tierColors = {
    bronze: "amber",
    silver: "gray",
    gold: "yellow",
    platinum: "cyan",
    diamond: "purple",
  };

  const color =
    tierColors[badge.badge_tier as keyof typeof tierColors] || "amber";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        "p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 hover:scale-105 text-center",
        theme === "light"
          ? "bg-gray-50 border-gray-200 hover:shadow-lg"
          : "bg-zinc-900/50 border-white/5 hover:bg-zinc-900/70"
      )}
    >
      <div className="text-3xl mb-2">{badge.icon_emoji || "🏆"}</div>
      <h4
        className={cn(
          "font-semibold text-sm mb-1",
          theme === "light" ? "text-gray-900" : "text-white"
        )}
      >
        {badge.badge_name}
      </h4>
      <Badge
        className={cn(
          "text-xs mb-2",
          `bg-${color}-500/10 text-${color}-400 border-${color}-500/30`
        )}
      >
        {badge.badge_tier}
      </Badge>
      <p
        className={cn(
          "text-xs line-clamp-2",
          theme === "light" ? "text-gray-600" : "text-muted-foreground"
        )}
      >
        {badge.description}
      </p>
    </motion.div>
  );
}

interface RankingCardProps {
  ranking: any;
  index: number;
  theme: string | undefined;
}

function RankingCard({ ranking, index, theme }: RankingCardProps) {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return { icon: Crown, color: "amber" };
    if (rank === 2) return { icon: Medal, color: "gray" };
    if (rank === 3) return { icon: Medal, color: "orange" };
    return { icon: Trophy, color: "cyan" };
  };

  const { icon: RankIcon, color } = getRankIcon(ranking.rank);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        "p-4 rounded-xl border backdrop-blur-sm",
        theme === "light"
          ? "bg-gray-50 border-gray-200"
          : "bg-zinc-900/50 border-white/5"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "text-sm font-medium capitalize",
            theme === "light" ? "text-gray-900" : "text-white"
          )}
        >
          {ranking.category.replace(/_/g, " ")}
        </span>
        <RankIcon className={cn("w-5 h-5", `text-${color}-400`)} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className={cn("text-3xl font-bold", `text-${color}-400`)}>
          #{ranking.rank}
        </span>
        {ranking.percentile && (
          <span
            className={cn(
              "text-xs",
              theme === "light" ? "text-gray-600" : "text-muted-foreground"
            )}
          >
            Top {ranking.percentile}%
          </span>
        )}
      </div>
      {ranking.rank_change !== 0 && ranking.rank_change && (
        <div className="flex items-center gap-1 mt-2">
          {ranking.rank_change > 0 ? (
            <TrendingUp className="w-3 h-3 text-emerald-400" />
          ) : (
            <TrendingUp className="w-3 h-3 text-red-400 rotate-180" />
          )}
          <span
            className={cn(
              "text-xs font-semibold",
              ranking.rank_change > 0 ? "text-emerald-400" : "text-red-400"
            )}
          >
            {Math.abs(ranking.rank_change)}
          </span>
        </div>
      )}
    </motion.div>
  );
}

interface TestimonialCardProps {
  testimonial: any;
  index: number;
  theme: string | undefined;
}

function TestimonialCard({ testimonial, index, theme }: TestimonialCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className={cn(
        "p-6 rounded-xl border backdrop-blur-sm",
        theme === "light"
          ? "bg-gray-50 border-gray-200"
          : "bg-zinc-900/50 border-white/5"
      )}
    >
      <div className="flex items-start gap-4 mb-4">
        <Avatar className="w-12 h-12">
          <AvatarImage src={testimonial.author?.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white">
            {testimonial.author?.full_name?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h4
            className={cn(
              "font-semibold",
              theme === "light" ? "text-gray-900" : "text-white"
            )}
          >
            {testimonial.author?.full_name || "Anonymous"}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "w-3 h-3",
                    i < testimonial.rating
                      ? "text-amber-400 fill-amber-400"
                      : "text-gray-300"
                  )}
                />
              ))}
            </div>
            <span
              className={cn(
                "text-xs",
                theme === "light" ? "text-gray-500" : "text-muted-foreground"
              )}
            >
              {new Date(testimonial.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <p
        className={cn(
          "text-sm mb-4",
          theme === "light" ? "text-gray-700" : "text-muted-foreground"
        )}
      >
        "{testimonial.testimonial}"
      </p>

      {testimonial.would_recommend && (
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <ThumbsUp className="w-3 h-3" />
          <span>Recommends this pod</span>
        </div>
      )}
    </motion.div>
  );
}

interface AlumniCardProps {
  alumni: any;
  index: number;
  theme: string | undefined;
}

function AlumniCard({ alumni, index, theme }: AlumniCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        "p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]",
        theme === "light"
          ? "bg-gray-50 border-gray-200 hover:shadow-md"
          : "bg-zinc-900/50 border-white/5 hover:bg-zinc-900/70"
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="w-12 h-12">
          <AvatarImage src={alumni.user?.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
            {alumni.user?.full_name?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h4
            className={cn(
              "font-semibold text-sm truncate",
              theme === "light" ? "text-gray-900" : "text-white"
            )}
          >
            {alumni.user?.full_name || "Alumni Member"}
          </h4>
          <p
            className={cn(
              "text-xs truncate",
              theme === "light" ? "text-gray-600" : "text-muted-foreground"
            )}
          >
            {alumni.current_position || "Software Engineer"}
          </p>
        </div>
      </div>

      {alumni.company && (
        <div
          className={cn(
            "p-3 rounded-lg border mb-3",
            theme === "light"
              ? "bg-white border-gray-200"
              : "bg-zinc-900/30 border-white/5"
          )}
        >
          <div className="flex items-center gap-2">
            {alumni.company.logo_url && (
              <img
                src={alumni.company.logo_url}
                alt={alumni.company.name}
                className="w-6 h-6 rounded"
              />
            )}
            <span
              className={cn(
                "text-sm font-semibold",
                theme === "light" ? "text-gray-900" : "text-white"
              )}
            >
              {alumni.current_company_name || alumni.company.name}
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs">
        <span
          className={cn(
            theme === "light" ? "text-gray-500" : "text-muted-foreground"
          )}
        >
          {alumni.problems_solved_count || 0} problems solved
        </span>
        {alumni.is_featured && (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
            <Star className="w-3 h-3 mr-1" />
            Featured
          </Badge>
        )}
      </div>
    </motion.div>
  );
}
