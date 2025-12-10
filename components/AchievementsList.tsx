"use client";

import { useState } from 'react';

interface Achievement {
  achievement_id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earned_at: string;
  requirement_type: string;
  requirement_value: number;
}

interface AchievementsListProps {
  achievements: Achievement[];
  showAll?: boolean;
  maxDisplay?: number;
}

// Icon mapping for achievement icons
const iconMap: Record<string, string> = {
  Code: '💻',
  CheckCircle: '✅',
  Flame: '🔥',
  Fire: '🔥',
  Zap: '⚡',
  Target: '🎯',
  TrendingUp: '📈',
  Award: '🏆',
  Trophy: '🏆',
  Crown: '👑',
  Star: '⭐',
  Sparkles: '✨',
  Check: '✔️',
  Video: '🎥',
  Users: '👥',
};

export default function AchievementsList({
  achievements,
  showAll = false,
  maxDisplay = 6
}: AchievementsListProps) {
  const [expanded, setExpanded] = useState(false);

  const displayAchievements = showAll || expanded
    ? achievements
    : achievements.slice(0, maxDisplay);

  const hasMore = achievements.length > maxDisplay;

  if (!achievements || achievements.length === 0) {
    return (
      <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">🎯</div>
        <p className="text-gray-400 text-sm">
          No achievements yet. Keep solving problems to unlock your first achievement!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Achievement Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayAchievements.map((achievement) => (
          <div
            key={achievement.achievement_id}
            className="group relative"
          >
            {/* Glow effect on hover */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-700 to-gray-800 rounded-xl opacity-0 group-hover:opacity-75 transition-opacity blur"></div>

            {/* Achievement Card */}
            <div className="relative bg-[#111111] border border-gray-800/50 group-hover:border-gray-700/50 rounded-xl p-5 transition-all">
              {/* Icon & Title */}
              <div className="flex items-start gap-3 mb-2">
                <div className="text-3xl flex-shrink-0">
                  {iconMap[achievement.icon] || '🏅'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-base ${achievement.color} leading-tight`}>
                    {achievement.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {achievement.description}
                  </p>
                </div>
              </div>

              {/* Earned Date */}
              <div className="mt-3 pt-3 border-t border-gray-800/50">
                <p className="text-xs text-gray-600">
                  Earned {new Date(achievement.earned_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Show More/Less Button */}
      {hasMore && !showAll && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-3 px-4 bg-gray-900/50 hover:bg-gray-900 border border-gray-800/50 hover:border-gray-700/50 rounded-xl text-sm text-gray-400 hover:text-white transition-all"
        >
          {expanded ? (
            <>Show Less</>
          ) : (
            <>Show {achievements.length - maxDisplay} More Achievements</>
          )}
        </button>
      )}
    </div>
  );
}
