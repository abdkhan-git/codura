import { Submission } from "@/types/database";

export interface PieChartData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

// Language colors - refined, harmonious palette
const LANGUAGE_COLORS: Record<string, string> = {
  'python': '#10b981', // emerald-500
  'javascript': '#f59e0b', // amber-500
  'typescript': '#3b82f6', // blue-500
  'java': '#ef4444', // red-500
  'cpp': '#8b5cf6', // violet-500
  'c': '#6b7280', // gray-500
  'csharp': '#06b6d4', // cyan-500
  'go': '#84cc16', // lime-500
  'rust': '#f97316', // orange-500
  'php': '#ec4899', // pink-500
  'ruby': '#dc2626', // red-600
  'swift': '#7c3aed', // violet-600
  'kotlin': '#059669', // emerald-600
  'scala': '#be185d', // pink-700
  'r': '#2563eb', // blue-600
  'sql': '#0891b2', // cyan-600
  'html': '#ea580c', // orange-600
  'css': '#0ea5e9', // sky-500
  'shell': '#16a34a', // green-600
  'bash': '#65a30d', // lime-600
  'powershell': '#7c2d12', // orange-800
  'other': '#64748b' // slate-500
};

// Difficulty colors - refined palette
const DIFFICULTY_COLORS: Record<string, string> = {
  'Easy': '#10b981', // emerald-500
  'Medium': '#f59e0b', // amber-500
  'Hard': '#ef4444' // red-500
};

export function processLanguageData(submissions: Submission[]): PieChartData[] {
  // Handle edge cases
  if (!submissions || submissions.length === 0) {
    return [];
  }

  // Count submissions by language
  const languageCounts = new Map<string, number>();
  
  submissions.forEach(submission => {
    if (submission?.language) {
      const lang = submission.language.toLowerCase().trim();
      if (lang) {
        languageCounts.set(lang, (languageCounts.get(lang) || 0) + 1);
      }
    }
  });

  // Convert to array and sort by count
  const languageData = Array.from(languageCounts.entries())
    .map(([language, count]) => ({
      name: language.charAt(0).toUpperCase() + language.slice(1),
      value: count,
      color: LANGUAGE_COLORS[language] || LANGUAGE_COLORS['other'],
      percentage: 0 // Will be calculated below
    }))
    .sort((a, b) => b.value - a.value);

  // Calculate percentages
  const total = submissions.length;
  languageData.forEach(item => {
    item.percentage = total > 0 ? Math.round((item.value / total) * 100 * 10) / 10 : 0;
  });

  return languageData;
}

export function processDifficultyData(submissions: Submission[]): PieChartData[] {
  // Handle edge cases
  if (!submissions || submissions.length === 0) {
    return [];
  }

  // Only count accepted submissions for difficulty distribution
  const acceptedSubmissions = submissions.filter(sub => sub?.status === 'Accepted');
  
  if (acceptedSubmissions.length === 0) {
    return [];
  }
  
  // Count by difficulty
  const difficultyCounts = new Map<string, number>();
  
  acceptedSubmissions.forEach(submission => {
    if (submission?.difficulty && ['Easy', 'Medium', 'Hard'].includes(submission.difficulty)) {
      const difficulty = submission.difficulty;
      difficultyCounts.set(difficulty, (difficultyCounts.get(difficulty) || 0) + 1);
    }
  });

  // Convert to array and sort by difficulty order
  const difficultyOrder = ['Easy', 'Medium', 'Hard'];
  const difficultyData = difficultyOrder
    .map(difficulty => ({
      name: difficulty,
      value: difficultyCounts.get(difficulty) || 0,
      color: DIFFICULTY_COLORS[difficulty],
      percentage: 0 // Will be calculated below
    }))
    .filter(item => item.value > 0); // Only include difficulties with solved problems

  // Calculate percentages
  const total = acceptedSubmissions.length;
  difficultyData.forEach(item => {
    item.percentage = total > 0 ? Math.round((item.value / total) * 100 * 10) / 10 : 0;
  });

  return difficultyData;
}

export function getChartSummaryStats(submissions: Submission[]) {
  const totalSubmissions = submissions.length;
  const acceptedSubmissions = submissions.filter(sub => sub.status === 'Accepted');
  const totalSolved = acceptedSubmissions.length;
  
  // Get unique languages used
  const uniqueLanguages = new Set(submissions.map(sub => sub.language.toLowerCase()));
  
  // Get acceptance rate
  const acceptanceRate = totalSubmissions > 0 
    ? Math.round((totalSolved / totalSubmissions) * 100 * 10) / 10 
    : 0;

  return {
    totalSubmissions,
    totalSolved,
    uniqueLanguages: uniqueLanguages.size,
    acceptanceRate
  };
}
