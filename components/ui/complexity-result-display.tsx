"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ComplexityType {
  id: string;
  name: string;
  notation: string;
  color: string;
  glowColor: string;
  description: string;
  examples: string[];
  performance: "excellent" | "good" | "fair" | "poor" | "terrible";
  calculate: (n: number) => number;
}

const complexityTypes: ComplexityType[] = [
  {
    id: "constant",
    name: "Constant",
    notation: "O(1)",
    color: "rgb(16, 185, 129)",
    glowColor: "rgba(16, 185, 129, 0.4)",
    description: "Execution time remains constant regardless of input size",
    examples: ["Array index access", "Hash table lookup", "Stack push/pop"],
    performance: "excellent",
    calculate: (n) => 1,
  },
  {
    id: "logarithmic",
    name: "Logarithmic",
    notation: "O(log n)",
    color: "rgb(59, 130, 246)",
    glowColor: "rgba(59, 130, 246, 0.4)",
    description: "Time grows logarithmically - very efficient scaling",
    examples: ["Binary search", "Balanced tree operations", "Skip lists"],
    performance: "excellent",
    calculate: (n) => Math.log2(n + 1),
  },
  {
    id: "linear",
    name: "Linear",
    notation: "O(n)",
    color: "rgb(168, 85, 247)",
    glowColor: "rgba(168, 85, 247, 0.4)",
    description: "Time scales directly proportional to input size",
    examples: ["Array traversal", "Linear search", "Finding min/max"],
    performance: "good",
    calculate: (n) => n,
  },
  {
    id: "linearithmic",
    name: "Linearithmic",
    notation: "O(n log n)",
    color: "rgb(251, 191, 36)",
    glowColor: "rgba(251, 191, 36, 0.4)",
    description: "Optimal for comparison-based sorting algorithms",
    examples: ["Merge sort", "Quick sort (avg)", "Heap sort"],
    performance: "good",
    calculate: (n) => n * Math.log2(n + 1),
  },
  {
    id: "quadratic",
    name: "Quadratic",
    notation: "O(n²)",
    color: "rgb(249, 115, 22)",
    glowColor: "rgba(249, 115, 22, 0.4)",
    description: "Time grows quadratically - avoid for large datasets",
    examples: ["Bubble sort", "Selection sort", "Nested loops"],
    performance: "poor",
    calculate: (n) => n * n,
  },
  {
    id: "exponential",
    name: "Exponential",
    notation: "O(2ⁿ)",
    color: "rgb(239, 68, 68)",
    glowColor: "rgba(239, 68, 68, 0.4)",
    description: "Time doubles with each addition - only for tiny inputs",
    examples: ["Recursive Fibonacci", "Power set", "Traveling salesman (brute force)"],
    performance: "terrible",
    calculate: (n) => Math.pow(2, Math.min(n, 15)),
  },
];

interface ComplexityResultDisplayProps {
  detectedComplexity: string;
  confidence?: number;
  analysis?: string;
  layout?: "horizontal" | "vertical";
  animated?: boolean;
  complexityType?: "time" | "space";
}

export default function ComplexityResultDisplay({
  detectedComplexity,
  confidence,
  analysis,
  layout = "horizontal",
  animated = true,
  complexityType = "time",
}: ComplexityResultDisplayProps) {
  const [animationProgress, setAnimationProgress] = useState(animated ? 0 : 100);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  // Find matching complexity type
  const selectedComplexity = complexityTypes.find(
    (c) => c.notation === detectedComplexity
  ) || complexityTypes[2]; // Default to O(n) if not found

  const MAX_N = 50;
  const POINTS = 100;

  // Animation effect
  useEffect(() => {
    if (!animated) {
      setAnimationProgress(100);
      return;
    }

    setAnimationProgress(0);
    const duration = 1200;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimationProgress(eased * 100);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animated, detectedComplexity]);

  // Canvas rendering
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = 40;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;

    for (let i = 0; i <= 10; i++) {
      const x = padding + (graphWidth / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    for (let i = 0; i <= 8; i++) {
      const y = padding + (graphHeight / 8) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw axis labels
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "10px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Input Size (n)", width / 2, height - 10);

    ctx.save();
    ctx.translate(12, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Time", 0, 0);
    ctx.restore();

    // Calculate points
    const points: { x: number; y: number }[] = [];
    let maxValue = 0;

    for (let i = 0; i <= POINTS; i++) {
      const n = (MAX_N / POINTS) * i;
      const value = selectedComplexity.calculate(n);
      maxValue = Math.max(maxValue, value);
      points.push({ x: n, y: value });
    }

    const canvasPoints = points.map((p) => ({
      x: padding + (p.x / MAX_N) * graphWidth,
      y: height - padding - (p.y / maxValue) * graphHeight,
    }));

    const visiblePoints = Math.floor((animationProgress / 100) * canvasPoints.length);
    const drawPoints = canvasPoints.slice(0, visiblePoints);

    if (drawPoints.length < 2) return;

    // Draw glow and curve
    ctx.shadowBlur = 20;
    ctx.shadowColor = selectedComplexity.glowColor;
    ctx.strokeStyle = selectedComplexity.color;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(drawPoints[0].x, drawPoints[0].y);
    for (let i = 1; i < drawPoints.length; i++) {
      ctx.lineTo(drawPoints[i].x, drawPoints[i].y);
    }
    ctx.stroke();

    // Draw area under curve
    ctx.shadowBlur = 0;
    const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    gradient.addColorStop(0, selectedComplexity.glowColor.replace("0.4", "0.2"));
    gradient.addColorStop(1, selectedComplexity.glowColor.replace("0.4", "0"));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(drawPoints[0].x, height - padding);
    ctx.lineTo(drawPoints[0].x, drawPoints[0].y);
    for (let i = 1; i < drawPoints.length; i++) {
      ctx.lineTo(drawPoints[i].x, drawPoints[i].y);
    }
    ctx.lineTo(drawPoints[drawPoints.length - 1].x, height - padding);
    ctx.closePath();
    ctx.fill();

    // Draw endpoint
    if (animationProgress === 100) {
      const lastPoint = drawPoints[drawPoints.length - 1];
      ctx.beginPath();
      ctx.arc(lastPoint.x, lastPoint.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = selectedComplexity.glowColor;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lastPoint.x, lastPoint.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = selectedComplexity.color;
      ctx.fill();
    }
  }, [selectedComplexity, animationProgress]);

  const getPerformanceStyles = (performance: string) => {
    switch (performance) {
      case "excellent":
        return "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30";
      case "good":
        return "from-blue-500/20 to-blue-500/5 border-blue-500/30";
      case "fair":
        return "from-amber-500/20 to-amber-500/5 border-amber-500/30";
      case "poor":
        return "from-orange-500/20 to-orange-500/5 border-orange-500/30";
      case "terrible":
        return "from-red-500/20 to-red-500/5 border-red-500/30";
      default:
        return "from-slate-500/20 to-slate-500/5 border-slate-500/30";
    }
  };

  return (
    <div className="relative space-y-4">
      {/* Top Section: Graph + Side Cards */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Graph canvas */}
        <div className="lg:col-span-2">
          <div className="relative bg-zinc-800/30 backdrop-blur-sm border border-zinc-700/30 rounded-xl p-4 overflow-hidden h-full">
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />
            <canvas
              ref={canvasRef}
              className="w-full h-[300px] relative z-10"
              style={{ imageRendering: "crisp-edges" }}
            />
          </div>
        </div>

        {/* Right Side Cards - Stack to match graph height */}
        <div className="flex flex-col gap-3 h-full">
          {/* Performance badge for both time and space complexity */}
          <div
            className={cn(
              "p-4 rounded-xl bg-gradient-to-br backdrop-blur-md border flex-shrink-0",
              getPerformanceStyles(selectedComplexity.performance)
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                {complexityType === "time" ? "Time Complexity" : "Space Complexity"}
              </span>
              <Badge
                variant="outline"
                className="text-xs capitalize border-current/30 bg-current/10"
                style={{ color: selectedComplexity.color }}
              >
                {selectedComplexity.performance}
              </Badge>
            </div>
            <h4
              className="text-2xl font-bold font-mono mb-1"
              style={{ color: selectedComplexity.color }}
            >
              {selectedComplexity.notation}
            </h4>
            <p className="text-xs font-medium text-foreground/80">
              {selectedComplexity.name}
            </p>
          </div>

          {/* Confidence */}
          {confidence !== undefined && (
            <div className="p-4 rounded-xl bg-zinc-800/30 backdrop-blur-sm border border-zinc-700/30 flex-grow flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Confidence</span>
                <span className="text-xs font-semibold">{Math.round(confidence * 100)}%</span>
              </div>
              <div className="w-full bg-zinc-700/30 rounded-full h-2 mb-3">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${confidence * 100}%`,
                    backgroundColor: selectedComplexity.color,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This percentage indicates how certain the AI is about the detected complexity. Higher confidence means the analysis is more reliable and accurate.
              </p>
            </div>
          )}

          {/* Description */}
          <div className="p-4 rounded-xl bg-zinc-800/30 backdrop-blur-sm border border-zinc-700/30 flex-grow flex flex-col">
            <h5 className="text-xs font-semibold text-foreground/80 mb-2 flex items-center gap-2">
              <div
                className="w-1 h-3 rounded-full"
                style={{ backgroundColor: selectedComplexity.color }}
              />
              Description
            </h5>
            <p className="text-xs text-muted-foreground leading-relaxed flex-grow">
              {selectedComplexity.description}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Section: Analysis (Full Width) */}
      {analysis && (
        <div className="p-4 rounded-xl bg-zinc-800/30 backdrop-blur-sm border border-zinc-700/30">
          <h5 className="text-sm font-semibold text-foreground/80 mb-3 flex items-center gap-2">
            <div
              className="w-1 h-4 rounded-full"
              style={{ backgroundColor: selectedComplexity.color }}
            />
            Analysis
          </h5>
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {analysis}
          </p>
        </div>
      )}
    </div>
  );
}
