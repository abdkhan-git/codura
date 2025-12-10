"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Database } from "lucide-react";

interface SpaceComplexityBadgeProps {
  spaceComplexity: string;
  confidence?: number;
  className?: string;
}

const getComplexityColor = (notation: string) => {
  if (notation === "O(1)") return { bg: "from-emerald-500/20 to-emerald-500/5", border: "border-emerald-500/30", text: "text-emerald-400" };
  if (notation === "O(log n)") return { bg: "from-blue-500/20 to-blue-500/5", border: "border-blue-500/30", text: "text-blue-400" };
  if (notation === "O(n)") return { bg: "from-purple-500/20 to-purple-500/5", border: "border-purple-500/30", text: "text-purple-400" };
  if (notation === "O(n log n)") return { bg: "from-amber-500/20 to-amber-500/5", border: "border-amber-500/30", text: "text-amber-400" };
  if (notation === "O(n²)") return { bg: "from-orange-500/20 to-orange-500/5", border: "border-orange-500/30", text: "text-orange-400" };
  if (notation === "O(2ⁿ)") return { bg: "from-red-500/20 to-red-500/5", border: "border-red-500/30", text: "text-red-400" };
  return { bg: "from-slate-500/20 to-slate-500/5", border: "border-slate-500/30", text: "text-slate-400" };
};

const getPerformanceLabel = (notation: string) => {
  if (notation === "O(1)") return "excellent";
  if (notation === "O(log n)") return "excellent";
  if (notation === "O(n)") return "good";
  if (notation === "O(n log n)") return "good";
  if (notation === "O(n²)") return "poor";
  if (notation === "O(2ⁿ)") return "terrible";
  return "unknown";
};

export default function SpaceComplexityBadge({
  spaceComplexity,
  confidence,
  className,
}: SpaceComplexityBadgeProps) {
  const colors = getComplexityColor(spaceComplexity);
  const performance = getPerformanceLabel(spaceComplexity);

  return (
    <div
      className={cn(
        "p-4 rounded-xl bg-gradient-to-br backdrop-blur-md border",
        colors.bg,
        colors.border,
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Database className={cn("w-4 h-4", colors.text)} />
          <span className="text-xs font-medium text-muted-foreground">Space Complexity</span>
        </div>
        <Badge
          variant="outline"
          className={cn("text-xs capitalize border-current/30 bg-current/10", colors.text)}
        >
          {performance}
        </Badge>
      </div>

      <h4 className={cn("text-3xl font-bold font-mono mb-1", colors.text)}>
        {spaceComplexity}
      </h4>

      {confidence !== undefined && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Confidence</span>
            <span className="text-xs font-semibold">{Math.round(confidence * 100)}%</span>
          </div>
          <div className="w-full bg-zinc-700/30 rounded-full h-1.5">
            <div
              className={cn("h-1.5 rounded-full transition-all duration-500", colors.text.replace('text-', 'bg-'))}
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
