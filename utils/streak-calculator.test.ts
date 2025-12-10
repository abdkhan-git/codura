import { calculateStreaks } from './streak-calculator';

// Helper to create a submission with a specific date
function createSubmission(dateStr: string) {
  return {
    submitted_at: new Date(dateStr).toISOString(),
  };
}

describe('calculateStreaks', () => {
  it('should return 0 for empty submissions', () => {
    const result = calculateStreaks([]);
    expect(result).toEqual({ currentStreak: 0, longestStreak: 0 });
  });

  it('should calculate current streak correctly for today', () => {
    const today = new Date().toISOString().split('T')[0];
    const result = calculateStreaks([createSubmission(today)]);
    expect(result.currentStreak).toBe(1);
  });

  it('should calculate current streak correctly for consecutive days', () => {
    const today = new Date();
    const submissions = [
      createSubmission(today.toISOString()),
      createSubmission(new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()),
      createSubmission(new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()),
      createSubmission(new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()),
    ];
    const result = calculateStreaks(submissions);
    expect(result.currentStreak).toBe(4);
  });

  it('should reset current streak if last submission is more than 1 day ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const result = calculateStreaks([createSubmission(twoDaysAgo)]);
    expect(result.currentStreak).toBe(0);
  });

  it('should maintain current streak if last submission was yesterday', () => {
    const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    const result = calculateStreaks([createSubmission(yesterday)]);
    expect(result.currentStreak).toBe(1);
  });

  it('should calculate longest streak correctly with gaps', () => {
    const submissions = [
      createSubmission('2025-01-10'),
      createSubmission('2025-01-09'),
      createSubmission('2025-01-08'), // 3-day streak
      createSubmission('2025-01-05'),
      createSubmission('2025-01-04'),
      createSubmission('2025-01-03'),
      createSubmission('2025-01-02'), // 4-day streak (longest)
      createSubmission('2024-12-28'),
      createSubmission('2024-12-27'), // 2-day streak
    ];
    const result = calculateStreaks(submissions);
    expect(result.longestStreak).toBe(4);
  });

  it('should handle multiple submissions on the same day', () => {
    const today = new Date().toISOString().split('T')[0];
    const submissions = [
      createSubmission(`${today}T10:00:00Z`),
      createSubmission(`${today}T14:00:00Z`),
      createSubmission(`${today}T18:00:00Z`),
    ];
    const result = calculateStreaks(submissions);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
  });

  it('should calculate longest streak when it equals current streak', () => {
    const today = new Date();
    const submissions = [
      createSubmission(today.toISOString()),
      createSubmission(new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()),
      createSubmission(new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()),
    ];
    const result = calculateStreaks(submissions);
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
  });

  it('should handle single submission', () => {
    const today = new Date().toISOString();
    const result = calculateStreaks([createSubmission(today)]);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
  });
});