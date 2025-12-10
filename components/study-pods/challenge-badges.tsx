"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  Trophy,
  Crown,
  Medal,
  Zap,
  Flame,
  Target,
  CheckCircle2,
  TrendingUp,
  Timer,
  Shield,
  Star,
  Flag,
  Loader2,
  Bolt,
  Minimize2,
  Gauge,
} from "lucide-react";

interface ChallengeBadge {
  id: string;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  color: string;
  tier: string;
  points_value: number;
  category: string;
}

interface UserBadge {
  id: string;
  badge_id: string;
  challenge_id: string;
  awarded_at: string;
  badge: ChallengeBadge;
}

interface ChallengeBadgesProps {
  userId?: string;
  challengeId?: string;
  showTitle?: boolean;
  compact?: boolean;
  className?: string;
}

// Icon mapping
const ICON_MAP: Record<string, any> = {
  'crown': Crown,
  'medal': Medal,
  'trophy': Trophy,
  'zap': Zap,
  'flame': Flame,
  'target': Target,
  'check-circle': CheckCircle2,
  'trending-up': TrendingUp,
  'timer': Timer,
  'shield': Shield,
  'star': Star,
  'flag': Flag,
  'bolt': Bolt,
  'minimize': Minimize2,
  'gauge': Gauge,
};

// Color mapping for tiers
const TIER_COLORS: Record<string, string> = {
  bronze: 'from-orange-600 to-orange-400',
  silver: 'from-gray-400 to-gray-300',
  gold: 'from-amber-500 to-yellow-400',
  platinum: 'from-cyan-400 to-teal-300',
  diamond: 'from-purple-500 to-pink-400',
};

const TIER_BG_COLORS: Record<string, string> = {
  bronze: 'bg-orange-500/10 border-orange-500/30',
  silver: 'bg-gray-400/10 border-gray-400/30',
  gold: 'bg-amber-500/10 border-amber-500/30',
  platinum: 'bg-cyan-400/10 border-cyan-400/30',
  diamond: 'bg-purple-500/10 border-purple-500/30',
};

const COLOR_MAP: Record<string, string> = {
  emerald: 'text-emerald-500',
  amber: 'text-amber-500',
  blue: 'text-blue-500',
  purple: 'text-purple-500',
  red: 'text-red-500',
  orange: 'text-orange-500',
  gray: 'text-gray-400',
  cyan: 'text-cyan-500',
  violet: 'text-violet-500',
  yellow: 'text-yellow-500',
};

export function ChallengeBadges({
  userId,
  challengeId,
  showTitle = true,
  compact = false,
  className,
}: ChallengeBadgesProps) {
  const { theme } = useTheme();
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
  }, [userId, challengeId]);

  const fetchBadges = async () => {
    setLoading(true);
    try {
      let url = '/api/user/badges';
      if (challengeId) {
        url = `/api/study-pods/challenges/${challengeId}/badges`;
      } else if (userId) {
        url = `/api/user/${userId}/badges`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setBadges(data.badges || []);
      }
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (badges.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className={cn("flex flex-wrap gap-1", className)}>
        <TooltipProvider>
          {badges.map((userBadge) => {
            const IconComponent = ICON_MAP[userBadge.badge.icon] || Trophy;
            const colorClass = COLOR_MAP[userBadge.badge.color] || 'text-emerald-500';

            return (
              <Tooltip key={userBadge.id}>
                <TooltipTrigger>
                  <div className={cn(
                    "p-1.5 rounded-lg border",
                    TIER_BG_COLORS[userBadge.badge.tier]
                  )}>
                    <IconComponent className={cn("w-4 h-4", colorClass)} />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-semibold">{userBadge.badge.display_name}</p>
                    <p className="text-xs opacity-80">{userBadge.badge.description}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-xs capitalize">
                        {userBadge.badge.tier}
                      </Badge>
                      <span className="text-amber-500">+{userBadge.badge.points_value} pts</span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    );
  }

  return (
    <Card className={cn(
      "border-2 overflow-hidden",
      theme === 'light' ? "bg-white border-gray-200" : "bg-zinc-900/50 border-white/10",
      className
    )}>
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className={cn(
            "flex items-center gap-2 text-base",
            theme === 'light' ? "text-gray-900" : "text-white"
          )}>
            <Trophy className="w-4 h-4 text-amber-500" />
            Badges Earned ({badges.length})
          </CardTitle>
        </CardHeader>
      )}

      <CardContent className={cn(!showTitle && "pt-4")}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {badges.map((userBadge) => {
            const IconComponent = ICON_MAP[userBadge.badge.icon] || Trophy;
            const colorClass = COLOR_MAP[userBadge.badge.color] || 'text-emerald-500';

            return (
              <TooltipProvider key={userBadge.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "p-4 rounded-lg border-2 text-center transition-transform hover:scale-105 cursor-pointer",
                      TIER_BG_COLORS[userBadge.badge.tier]
                    )}>
                      <div className={cn(
                        "w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center",
                        "bg-gradient-to-br",
                        TIER_COLORS[userBadge.badge.tier]
                      )}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <p className={cn(
                        "text-sm font-semibold truncate",
                        theme === 'light' ? "text-gray-900" : "text-white"
                      )}>
                        {userBadge.badge.display_name}
                      </p>
                      <p className="text-xs text-amber-500 mt-1">
                        +{userBadge.badge.points_value} pts
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-semibold">{userBadge.badge.display_name}</p>
                      <p className="text-xs opacity-80">{userBadge.badge.description}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="text-xs capitalize">
                          {userBadge.badge.tier}
                        </Badge>
                        <span className="opacity-60">
                          {new Date(userBadge.awarded_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Component to show newly awarded badges
export function NewBadgesNotification({ badges }: { badges: ChallengeBadge[] }) {
  const { theme } = useTheme();

  if (badges.length === 0) return null;

  return (
    <div className={cn(
      "p-4 rounded-lg border-2 animate-in fade-in-0 slide-in-from-bottom-4",
      theme === 'light'
        ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300"
        : "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-500/50"
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-full bg-amber-500/20">
          <Trophy className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h4 className={cn(
            "font-semibold",
            theme === 'light' ? "text-gray-900" : "text-white"
          )}>
            New Badge{badges.length > 1 ? 's' : ''} Earned!
          </h4>
          <p className={cn("text-sm", theme === 'light' ? "text-gray-600" : "text-white/60")}>
            Congratulations on your achievement!
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => {
          const IconComponent = ICON_MAP[badge.icon] || Trophy;

          return (
            <div
              key={badge.id}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border",
                TIER_BG_COLORS[badge.tier]
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br",
                TIER_COLORS[badge.tier]
              )}>
                <IconComponent className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className={cn(
                  "text-sm font-medium",
                  theme === 'light' ? "text-gray-900" : "text-white"
                )}>
                  {badge.display_name}
                </p>
                <p className="text-xs text-amber-500">+{badge.points_value} pts</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
