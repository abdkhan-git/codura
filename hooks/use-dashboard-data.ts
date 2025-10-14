import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

interface DashboardData {
  user: any;
  studyPlans: any[];
  recentActivity: any[];
  upcomingEvents: any[];
  dailyChallenge: any;
  activityChartData: any[];
}

/**
 * Optimized hook for dashboard data
 * - Single API call instead of 6
 * - Automatic caching
 * - Request deduplication
 */
export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Single unified API call!
      const result = await apiClient<DashboardData>('/api/dashboard', {
        ttl: 30000, // Cache for 30 seconds
      });

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch dashboard data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}