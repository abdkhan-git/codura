/**
 * Calculate user streaks based on submission history
 * A streak is maintained if a user submits at least once per day
 * Current streak resets if user hasn't submitted today or yesterday
 */
export function calculateStreaks(submissions: any[]): { currentStreak: number; longestStreak: number } {
  if (!submissions || submissions.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Group submissions by date (UTC date)
  const submissionDates = new Set(
    submissions.map(sub => {
      const date = new Date(sub.submitted_at);
      return date.toISOString().split('T')[0];
    })
  );

  const sortedDates = Array.from(submissionDates).sort((a, b) => b.localeCompare(a));

  // Calculate current streak
  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Check if user has a submission today or yesterday
  // If last submission was more than 1 day ago, streak is broken
  if (sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr) {
    let streakDate = new Date(sortedDates[0]);

    for (const dateStr of sortedDates) {
      const currentDate = new Date(dateStr);
      const diffDays = Math.floor((streakDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

      // diffDays === 0 means same date (first iteration), diffDays === 1 means consecutive day
      if (diffDays === 0 || diffDays === 1) {
        currentStreak++;
        streakDate = currentDate;
      } else {
        break;
      }
    }
  } else {
    // Streak is broken - last submission was more than a day ago
    currentStreak = 0;
  }

  // Calculate longest streak in history
  let longestStreak = 0;
  let tempStreak = 1;

  for (let i = 0; i < sortedDates.length - 1; i++) {
    const current = new Date(sortedDates[i]);
    const next = new Date(sortedDates[i + 1]);
    const diffDays = Math.floor((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return { currentStreak, longestStreak };
}