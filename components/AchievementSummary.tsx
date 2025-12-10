"use client";

interface AchievementSummaryProps {
  totalAchievements: number;
  latestAchievement?: {
    name: string;
    date: string;
  } | null;
  compact?: boolean;
}

export default function AchievementSummary({
  totalAchievements,
  latestAchievement,
  compact = false
}: AchievementSummaryProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-gray-900/50 border border-gray-800/50 rounded-lg px-4 py-3">
        <div className="text-2xl">🏆</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">
            {totalAchievements} Achievement{totalAchievements !== 1 ? 's' : ''}
          </p>
          {latestAchievement && (
            <p className="text-xs text-gray-500 truncate">
              Latest: {latestAchievement.name}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="text-4xl">🏆</div>
        <div>
          <h3 className="text-lg font-semibold text-white">Achievements</h3>
          <p className="text-sm text-gray-500">
            {totalAchievements} unlocked
          </p>
        </div>
      </div>

      {/* Latest Achievement */}
      {latestAchievement ? (
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            Latest Achievement
          </p>
          <p className="text-sm font-medium text-white mb-1">
            {latestAchievement.name}
          </p>
          <p className="text-xs text-gray-600">
            {new Date(latestAchievement.date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>
      ) : (
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">
            Solve your first problem to unlock achievements!
          </p>
        </div>
      )}
    </div>
  );
}
