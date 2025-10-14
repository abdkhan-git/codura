"use client";

import React, { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, BarChart3, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface PieChartData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface InteractivePieChartProps {
  languageData: PieChartData[];
  difficultyData: PieChartData[];
  totalSolved: number;
  totalSubmissions: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium">{data.name}</p>
        <p className="text-sm text-muted-foreground">
          {data.value} problems ({data.percentage}%)
        </p>
      </div>
    );
  }
  return null;
};

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
  if (percentage < 5) return null; // Don't show labels for slices < 5%
  
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {`${percentage}%`}
    </text>
  );
};

export function InteractivePieChart({ 
  languageData, 
  difficultyData, 
  totalSolved, 
  totalSubmissions 
}: InteractivePieChartProps) {
  const [activeTab, setActiveTab] = useState<"languages" | "difficulty">("languages");
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  const handleSliceEnter = (data: any) => {
    setHoveredSlice(data.name);
  };

  const handleSliceLeave = () => {
    setHoveredSlice(null);
  };

  // Handle edge cases
  const safeLanguageData = languageData || [];
  const safeDifficultyData = difficultyData || [];
  const currentData = activeTab === "languages" ? safeLanguageData : safeDifficultyData;

  // Don't render if no data
  if (currentData.length === 0) {
  return (
    <Card 
      className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden shadow-xl shine-effect"
      style={{ '--glow-color': '#3b82f6' } as React.CSSProperties}
    >
      <CardContent className="p-6 text-center">
        <div className="text-white/60">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No {activeTab === "languages" ? "language" : "difficulty"} data available</p>
        </div>
      </CardContent>
    </Card>
  );
  }

  return (
    <Card 
      className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden group hover:border-blue-500/30 transition-all duration-500 shadow-xl hover:scale-[1.01] shine-effect"
      style={{ '--glow-color': '#3b82f6' } as React.CSSProperties}
    >
      {/* Animated glow borders */}
      <div className="glow-border-top" />
      <div className="glow-border-bottom" />
      <div className="glow-border-left" />
      <div className="glow-border-right" />
      
      {/* Enhanced background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-15 transition-opacity duration-700 pointer-events-none" />

      <CardHeader className="relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-white/90">
            <div className="p-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30">
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            Coding Analytics
          </CardTitle>
          <div className="flex gap-1 p-1 bg-white/10 rounded-lg border border-white/20">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("languages")}
              className={cn(
                "h-7 px-3 text-xs font-medium transition-all duration-200",
                activeTab === "languages"
                  ? "bg-white/20 text-white border border-white/30"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              )}
            >
              Languages
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("difficulty")}
              className={cn(
                "h-7 px-3 text-xs font-medium transition-all duration-200",
                activeTab === "difficulty"
                  ? "bg-white/20 text-white border border-white/30"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              )}
            >
              Difficulty
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative z-10">
        <div className="space-y-6">
          {/* Chart */}
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={currentData as any}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={CustomLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  onMouseEnter={handleSliceEnter}
                  onMouseLeave={handleSliceLeave}
                >
                  {currentData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      className={cn(
                        "transition-all duration-300 cursor-pointer",
                        hoveredSlice === entry.name ? "opacity-80" : "opacity-100"
                      )}
                      stroke={hoveredSlice === entry.name ? "white" : "transparent"}
                      strokeWidth={hoveredSlice === entry.name ? 2 : 0}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/70">
                {activeTab === "languages" ? "Languages Used" : "Problems Solved"}
              </span>
              <span className="font-semibold text-white/90">
                {activeTab === "languages" ? totalSubmissions : totalSolved} total
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {currentData.map((item, index) => (
                        <div
                          key={index}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg transition-all duration-200 cursor-pointer border",
                            hoveredSlice === item.name
                              ? "bg-white/20 border-white/30"
                              : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                          )}
                          onMouseEnter={() => setHoveredSlice(item.name)}
                          onMouseLeave={() => setHoveredSlice(null)}
                        >
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate text-white/90">{item.name}</div>
                    <div className="text-xs text-white/60">
                      {item.value} ({item.percentage}%)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="pt-4 border-t border-white/10">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-2xl font-bold text-blue-400">
                  {activeTab === "languages" ? safeLanguageData.length : safeDifficultyData.length}
                </div>
                <div className="text-xs text-white/60">
                  {activeTab === "languages" ? "Languages" : "Difficulty Levels"}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-2xl font-bold text-emerald-400">
                  {activeTab === "languages" 
                    ? Math.round((safeLanguageData[0]?.percentage || 0))
                    : Math.round((safeDifficultyData[0]?.percentage || 0))
                  }%
                </div>
                <div className="text-xs text-white/60">
                  {activeTab === "languages" ? "Most Used" : "Most Solved"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
