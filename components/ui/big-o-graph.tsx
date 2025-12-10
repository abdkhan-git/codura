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
    color: "rgb(16, 185, 129)", // emerald
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
    color: "rgb(59, 130, 246)", // blue
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
    color: "rgb(168, 85, 247)", // purple
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
    color: "rgb(251, 191, 36)", // amber
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
    color: "rgb(249, 115, 22)", // orange
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
    color: "rgb(239, 68, 68)", // red
    glowColor: "rgba(239, 68, 68, 0.4)",
    description: "Time doubles with each addition - only for tiny inputs",
    examples: ["Recursive Fibonacci", "Power set", "Traveling salesman (brute force)"],
    performance: "terrible",
    calculate: (n) => Math.pow(2, Math.min(n, 15)), // Cap to prevent overflow
  },
];

export default function BigOGraph() {
  const [selectedComplexity, setSelectedComplexity] = useState<string>("linear");
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  // Constants for the graph
  const MAX_N = 50;
  const POINTS = 100;

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size with device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = 50;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = padding + (graphWidth / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Horizontal grid lines
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

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw axis labels
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Input Size (n)", width / 2, height - 15);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Time", 0, 0);
    ctx.restore();

    // Get selected complexity
    const selected = complexityTypes.find(c => c.id === selectedComplexity);
    if (!selected) return;

    // Calculate all points
    const points: { x: number; y: number }[] = [];
    let maxValue = 0;

    for (let i = 0; i <= POINTS; i++) {
      const n = (MAX_N / POINTS) * i;
      const value = selected.calculate(n);
      maxValue = Math.max(maxValue, value);
      points.push({ x: n, y: value });
    }

    // Normalize and convert to canvas coordinates
    const canvasPoints = points.map((p) => ({
      x: padding + (p.x / MAX_N) * graphWidth,
      y: height - padding - (p.y / maxValue) * graphHeight,
    }));

    // Calculate how many points to show based on animation progress
    const visiblePoints = Math.floor((animationProgress / 100) * canvasPoints.length);
    const drawPoints = canvasPoints.slice(0, visiblePoints);

    if (drawPoints.length < 2) return;

    // Draw glow effect
    ctx.shadowBlur = 20;
    ctx.shadowColor = selected.glowColor;
    ctx.strokeStyle = selected.color;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // Draw the curve
    ctx.beginPath();
    ctx.moveTo(drawPoints[0].x, drawPoints[0].y);

    for (let i = 1; i < drawPoints.length; i++) {
      ctx.lineTo(drawPoints[i].x, drawPoints[i].y);
    }
    ctx.stroke();

    // Draw area under curve with gradient
    ctx.shadowBlur = 0;
    const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    gradient.addColorStop(0, selected.glowColor.replace("0.4", "0.2"));
    gradient.addColorStop(1, selected.glowColor.replace("0.4", "0"));

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

    // Draw endpoint indicator
    if (animationProgress === 100) {
      const lastPoint = drawPoints[drawPoints.length - 1];

      // Outer glow
      ctx.beginPath();
      ctx.arc(lastPoint.x, lastPoint.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = selected.glowColor;
      ctx.fill();

      // Inner circle
      ctx.beginPath();
      ctx.arc(lastPoint.x, lastPoint.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = selected.color;
      ctx.fill();
    }

  }, [selectedComplexity, animationProgress]);

  // Animation effect when switching complexity
  useEffect(() => {
    setIsAnimating(true);
    setAnimationProgress(0);

    const duration = 1200; // ms
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimationProgress(eased * 100);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [selectedComplexity]);

  const selectedComplexityData = complexityTypes.find(c => c.id === selectedComplexity);

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
    <div className="relative w-full">
      {/* Main container with glassmorphism */}
      <div className="relative bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl animate-blob-reverse" />

        <div className="relative z-10">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand/20 to-brand/5 backdrop-blur-sm border border-brand/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Big O Complexity Visualizer
                </h3>
                <p className="text-sm text-muted-foreground">
                  Interactive algorithm performance analysis
                </p>
              </div>
            </div>
          </div>

          {/* Complexity selector buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {complexityTypes.map((complexity, index) => (
              <button
                key={complexity.id}
                onClick={() => setSelectedComplexity(complexity.id)}
                className={cn(
                  "group relative px-4 py-3 rounded-xl transition-all duration-300",
                  "bg-gradient-to-br backdrop-blur-md border",
                  "hover:scale-105 hover:shadow-lg active:scale-95",
                  "animate-in fade-in slide-in-from-bottom-2",
                  selectedComplexity === complexity.id
                    ? `${getPerformanceStyles(complexity.performance)} shadow-lg scale-105`
                    : "from-muted/20 to-muted/5 border-white/10 hover:border-white/20"
                )}
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationDuration: "500ms",
                  animationFillMode: "both",
                }}
              >
                {/* Glow effect when selected */}
                {selectedComplexity === complexity.id && (
                  <div
                    className="absolute inset-0 rounded-xl blur-xl opacity-50 -z-10"
                    style={{ backgroundColor: complexity.color }}
                  />
                )}

                <div className="flex flex-col items-center gap-1">
                  <span className="font-mono text-sm font-bold" style={{
                    color: selectedComplexity === complexity.id ? complexity.color : undefined
                  }}>
                    {complexity.notation}
                  </span>
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                    {complexity.name}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Graph and details container */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Graph canvas */}
            <div className="lg:col-span-2">
              <div className="relative bg-background/30 backdrop-blur-sm border border-white/10 rounded-2xl p-6 overflow-hidden">
                {/* Grid pattern overlay */}
                <div className="absolute inset-0 opacity-5" style={{
                  backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
                  backgroundSize: "20px 20px"
                }} />

                <canvas
                  ref={canvasRef}
                  className="w-full h-[400px] relative z-10"
                  style={{ imageRendering: "crisp-edges" }}
                />
              </div>
            </div>

            {/* Details panel */}
            {selectedComplexityData && (
              <div className="space-y-4 animate-in slide-in-from-right fade-in duration-500">
                {/* Performance badge */}
                <div className={cn(
                  "p-4 rounded-2xl bg-gradient-to-br backdrop-blur-md border",
                  getPerformanceStyles(selectedComplexityData.performance)
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Performance</span>
                    <Badge
                      variant="outline"
                      className="text-xs capitalize border-current/30 bg-current/10"
                      style={{ color: selectedComplexityData.color }}
                    >
                      {selectedComplexityData.performance}
                    </Badge>
                  </div>
                  <h4 className="text-2xl font-bold font-mono mb-1" style={{ color: selectedComplexityData.color }}>
                    {selectedComplexityData.notation}
                  </h4>
                  <p className="text-sm font-medium text-foreground/80">
                    {selectedComplexityData.name}
                  </p>
                </div>

                {/* Description */}
                <div className="p-4 rounded-2xl bg-muted/20 backdrop-blur-sm border border-white/10">
                  <h5 className="text-sm font-semibold text-foreground/80 mb-2 flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full" style={{ backgroundColor: selectedComplexityData.color }} />
                    Description
                  </h5>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedComplexityData.description}
                  </p>
                </div>

                {/* Examples */}
                <div className="p-4 rounded-2xl bg-muted/20 backdrop-blur-sm border border-white/10">
                  <h5 className="text-sm font-semibold text-foreground/80 mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full" style={{ backgroundColor: selectedComplexityData.color }} />
                    Common Examples
                  </h5>
                  <div className="space-y-2">
                    {selectedComplexityData.examples.map((example, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-sm text-muted-foreground animate-in slide-in-from-left fade-in"
                        style={{
                          animationDelay: `${idx * 100}ms`,
                          animationDuration: "300ms",
                          animationFillMode: "both",
                        }}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                          style={{ backgroundColor: selectedComplexityData.color }}
                        />
                        <span className="leading-relaxed">{example}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pro tip */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-brand/10 to-brand/5 backdrop-blur-sm border border-brand/20">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-brand" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-brand mb-1">Pro Tip</h5>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Click different complexity types above to see how algorithm performance scales with input size.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}