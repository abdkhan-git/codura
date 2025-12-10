"use client";

import dynamic from 'next/dynamic';
import { Skeleton } from './skeleton';

// Dynamically import the heavy chart library
const ActivityChartComponent = dynamic(
  () => import('./activity-chart-internal'),
  {
    loading: () => (
      <div className="w-full h-[200px] flex items-center justify-center">
        <Skeleton className="w-full h-full" />
      </div>
    ),
    ssr: false, // Charts don't need SSR
  }
);

interface ActivityChartProps {
  data: any[];
  timeframe: string;
}

export function ActivityChart({ data, timeframe }: ActivityChartProps) {
  return <ActivityChartComponent data={data} timeframe={timeframe} />;
}