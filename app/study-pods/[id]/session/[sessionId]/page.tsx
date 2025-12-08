'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Room, RoomEvent, RemoteParticipant, RemoteTrack, RemoteTrackPublication, Track, ConnectionState, TrackEvent, LocalTrackPublication, LocalParticipant } from 'livekit-client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card } from '@/components/ui/card';

// Icons
import {
  Play,
  Loader2,
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  MonitorUp,
  MonitorOff,
  Code2,
  Send,
  CheckCircle2,
  Circle,
  Crown,
  Copy,
  Check,
  RotateCcw,
  Wifi,
  WifiOff,
  Sparkles,
  Zap,
  Settings,
  MoreHorizontal,
  Maximize2,
  Minimize2,
  X,
  Eraser,
  Trash2,
  Palette,
  PenTool,
  Layout,
  Grid3X3,
  ChevronLeft,
  ArrowLeft,
  MousePointer2,
  Hand,
  Square,
  CircleIcon,
  Minus,
  ArrowUpRight,
  Type,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

// Custom SVG Icons for a more premium look
const PeopleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="4" />
    <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    <circle cx="17" cy="7" r="3" />
    <path d="M21 21v-2a3 3 0 0 0-2-2.83" />
  </svg>
);

const ChatIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const TerminalIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const WhiteboardIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 21V9" />
  </svg>
);

// Whiteboard element types
type WhiteboardTool = 'select' | 'pan' | 'pen' | 'line' | 'arrow' | 'rectangle' | 'ellipse' | 'text' | 'eraser';

interface WhiteboardElement {
  id: string;
  type: 'path' | 'line' | 'arrow' | 'rectangle' | 'ellipse' | 'text';
  points?: { x: number; y: number }[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  text?: string;
  color: string;
  strokeWidth: number;
  fill?: string;
  userId: string;
}

// Custom Collaborative Whiteboard Component
const CollaborativeWhiteboard = React.memo(function CollaborativeWhiteboard({
  elements,
  onElementsChange,
  isEnabled,
  collaborators,
  onClear,
  onCursorMove,
  currentUserId,
}: {
  elements: WhiteboardElement[];
  onElementsChange: (elements: WhiteboardElement[]) => void;
  isEnabled: boolean;
  collaborators: Map<string, { pointer?: { x: number; y: number }; username?: string; color?: string; isDrawing?: boolean }>;
  onClear: () => void;
  onCursorMove?: (point: { x: number; y: number } | null, isDrawing: boolean) => void;
  currentUserId?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<WhiteboardTool>('pen');
  const [color, setColor] = useState('#f59e0b');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentElement, setCurrentElement] = useState<WhiteboardElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<WhiteboardElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [textValue, setTextValue] = useState('');
  const textInputRef = useRef<HTMLInputElement>(null);
  
  // Selection and clipboard state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [clipboard, setClipboard] = useState<WhiteboardElement[]>([]);
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  
  // Eraser state for continuous erasing
  const [isErasing, setIsErasing] = useState(false);
  const erasedIdsRef = useRef<Set<string>>(new Set()); // Track what we've erased in current stroke

  // Colors palette
  const colors = ['#ffffff', '#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];
  const strokeWidths = [2, 4, 6, 8];

  // Collaborator colors for unique identification
  const collaboratorColors = ['#ef4444', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b', '#84cc16'];

  // Resize canvas
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      
      // Ctrl+C - Copy
      if (isCtrlOrCmd && e.key === 'c' && selectedIds.size > 0) {
        e.preventDefault();
        const selectedElements = elements.filter(el => selectedIds.has(el.id));
        setClipboard(selectedElements);
        toast.success(`Copied ${selectedElements.length} element(s)`);
      }
      
      // Ctrl+X - Cut
      if (isCtrlOrCmd && e.key === 'x' && selectedIds.size > 0) {
        e.preventDefault();
        const selectedElements = elements.filter(el => selectedIds.has(el.id));
        setClipboard(selectedElements);
        const newElements = elements.filter(el => !selectedIds.has(el.id));
        onElementsChange(newElements);
        addToHistory(newElements);
        setSelectedIds(new Set());
        toast.success(`Cut ${selectedElements.length} element(s)`);
      }
      
      // Ctrl+V - Paste
      if (isCtrlOrCmd && e.key === 'v' && clipboard.length > 0) {
        e.preventDefault();
        // Offset pasted elements slightly
        const pastedElements = clipboard.map(el => ({
          ...el,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          x: el.x !== undefined ? el.x + 20 : undefined,
          y: el.y !== undefined ? el.y + 20 : undefined,
          x1: el.x1 !== undefined ? el.x1 + 20 : undefined,
          y1: el.y1 !== undefined ? el.y1 + 20 : undefined,
          x2: el.x2 !== undefined ? el.x2 + 20 : undefined,
          y2: el.y2 !== undefined ? el.y2 + 20 : undefined,
          points: el.points?.map(p => ({ x: p.x + 20, y: p.y + 20 })),
          userId: currentUserId || '',
        }));
        const newElements = [...elements, ...pastedElements];
        onElementsChange(newElements);
        addToHistory(newElements);
        setSelectedIds(new Set(pastedElements.map(el => el.id)));
        toast.success(`Pasted ${pastedElements.length} element(s)`);
      }
      
      // Ctrl+A - Select All
      if (isCtrlOrCmd && e.key === 'a') {
        e.preventDefault();
        setSelectedIds(new Set(elements.map(el => el.id)));
        setTool('select');
      }
      
      // Ctrl+D - Duplicate
      if (isCtrlOrCmd && e.key === 'd' && selectedIds.size > 0) {
        e.preventDefault();
        const selectedElements = elements.filter(el => selectedIds.has(el.id));
        const duplicatedElements = selectedElements.map(el => ({
          ...el,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          x: el.x !== undefined ? el.x + 20 : undefined,
          y: el.y !== undefined ? el.y + 20 : undefined,
          x1: el.x1 !== undefined ? el.x1 + 20 : undefined,
          y1: el.y1 !== undefined ? el.y1 + 20 : undefined,
          x2: el.x2 !== undefined ? el.x2 + 20 : undefined,
          y2: el.y2 !== undefined ? el.y2 + 20 : undefined,
          points: el.points?.map(p => ({ x: p.x + 20, y: p.y + 20 })),
          userId: currentUserId || '',
        }));
        const newElements = [...elements, ...duplicatedElements];
        onElementsChange(newElements);
        addToHistory(newElements);
        setSelectedIds(new Set(duplicatedElements.map(el => el.id)));
        toast.success(`Duplicated ${duplicatedElements.length} element(s)`);
      }
      
      // Ctrl+Z - Undo
      if (isCtrlOrCmd && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      
      // Ctrl+Y or Ctrl+Shift+Z - Redo
      if ((isCtrlOrCmd && e.key === 'y') || (isCtrlOrCmd && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        redo();
      }
      
      // Delete/Backspace - Delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0 && !textInput.visible) {
        e.preventDefault();
        const newElements = elements.filter(el => !selectedIds.has(el.id));
        onElementsChange(newElements);
        addToHistory(newElements);
        setSelectedIds(new Set());
        toast.success(`Deleted ${selectedIds.size} element(s)`);
      }
      
      // Escape - Deselect
      if (e.key === 'Escape') {
        setSelectedIds(new Set());
        setTextInput({ x: 0, y: 0, visible: false });
        setTextValue('');
      }
      
      // Space - Hold to pan (handled differently, just switch tool temporarily)
      if (e.key === ' ' && !textInput.visible) {
        e.preventDefault();
        setTool('pan');
      }
      
      // Tool shortcuts
      if (!textInput.visible) {
        if (e.key === 'v' && !isCtrlOrCmd) setTool('select');
        if (e.key === 'h') setTool('pan');
        if (e.key === 'p') setTool('pen');
        if (e.key === 'l') setTool('line');
        if (e.key === 'a' && !isCtrlOrCmd) setTool('arrow');
        if (e.key === 'r') setTool('rectangle');
        if (e.key === 'o') setTool('ellipse');
        if (e.key === 't') setTool('text');
        if (e.key === 'e') setTool('eraser');
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      // Release space to go back to previous tool
      if (e.key === ' ') {
        setTool('pen');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isEnabled, selectedIds, clipboard, elements, currentUserId, onElementsChange, textInput.visible]);

  // Draw everything
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw grid
    ctx.strokeStyle = '#1e1e20';
    ctx.lineWidth = 1 / zoom;
    const gridSize = 40;
    const startX = Math.floor(-pan.x / zoom / gridSize) * gridSize;
    const startY = Math.floor(-pan.y / zoom / gridSize) * gridSize;
    const endX = startX + canvas.width / zoom + gridSize * 2;
    const endY = startY + canvas.height / zoom + gridSize * 2;

    for (let x = startX; x < endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    for (let y = startY; y < endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    // Draw all elements
    const allElements = currentElement ? [...elements, currentElement] : elements;
    allElements.forEach((el) => {
      ctx.strokeStyle = el.color;
      ctx.fillStyle = el.fill || 'transparent';
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      switch (el.type) {
        case 'path':
          if (el.points && el.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(el.points[0].x, el.points[0].y);
            for (let i = 1; i < el.points.length; i++) {
              ctx.lineTo(el.points[i].x, el.points[i].y);
            }
            ctx.stroke();
          }
          break;
        case 'line':
          if (el.x1 !== undefined && el.y1 !== undefined && el.x2 !== undefined && el.y2 !== undefined) {
            ctx.beginPath();
            ctx.moveTo(el.x1, el.y1);
            ctx.lineTo(el.x2, el.y2);
            ctx.stroke();
          }
          break;
        case 'arrow':
          if (el.x1 !== undefined && el.y1 !== undefined && el.x2 !== undefined && el.y2 !== undefined) {
            ctx.beginPath();
            ctx.moveTo(el.x1, el.y1);
            ctx.lineTo(el.x2, el.y2);
            ctx.stroke();
            // Draw arrowhead
            const angle = Math.atan2(el.y2 - el.y1, el.x2 - el.x1);
            const headLen = 15;
            ctx.beginPath();
            ctx.moveTo(el.x2, el.y2);
            ctx.lineTo(el.x2 - headLen * Math.cos(angle - Math.PI / 6), el.y2 - headLen * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(el.x2, el.y2);
            ctx.lineTo(el.x2 - headLen * Math.cos(angle + Math.PI / 6), el.y2 - headLen * Math.sin(angle + Math.PI / 6));
            ctx.stroke();
          }
          break;
        case 'rectangle':
          if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
            ctx.beginPath();
            ctx.rect(el.x, el.y, el.width, el.height);
            ctx.stroke();
          }
          break;
        case 'ellipse':
          if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
            ctx.beginPath();
            ctx.ellipse(
              el.x + el.width / 2,
              el.y + el.height / 2,
              Math.abs(el.width / 2),
              Math.abs(el.height / 2),
              0, 0, Math.PI * 2
            );
            ctx.stroke();
          }
          break;
        case 'text':
          if (el.x !== undefined && el.y !== undefined && el.text) {
            ctx.font = `${el.strokeWidth * 6}px Inter, sans-serif`;
            ctx.fillStyle = el.color;
            ctx.fillText(el.text, el.x, el.y);
          }
          break;
      }
    });

    // Draw selection boxes around selected elements
    if (selectedIds.size > 0) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([5 / zoom, 5 / zoom]);
      
      elements.filter(el => selectedIds.has(el.id)).forEach((el) => {
        let bounds = { x: 0, y: 0, width: 0, height: 0 };
        
        if (el.type === 'path' && el.points && el.points.length > 0) {
          const xs = el.points.map(p => p.x);
          const ys = el.points.map(p => p.y);
          bounds = {
            x: Math.min(...xs) - 5,
            y: Math.min(...ys) - 5,
            width: Math.max(...xs) - Math.min(...xs) + 10,
            height: Math.max(...ys) - Math.min(...ys) + 10,
          };
        } else if (el.x1 !== undefined && el.y1 !== undefined && el.x2 !== undefined && el.y2 !== undefined) {
          bounds = {
            x: Math.min(el.x1, el.x2) - 5,
            y: Math.min(el.y1, el.y2) - 5,
            width: Math.abs(el.x2 - el.x1) + 10,
            height: Math.abs(el.y2 - el.y1) + 10,
          };
        } else if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
          bounds = {
            x: el.x - 5,
            y: el.y - 5,
            width: el.width + 10,
            height: el.height + 10,
          };
        } else if (el.x !== undefined && el.y !== undefined && el.text) {
          ctx.font = `${el.strokeWidth * 6}px Inter, sans-serif`;
          const textWidth = ctx.measureText(el.text).width;
          bounds = {
            x: el.x - 5,
            y: el.y - el.strokeWidth * 6 - 5,
            width: textWidth + 10,
            height: el.strokeWidth * 6 + 10,
          };
        }
        
        ctx.beginPath();
        ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
        ctx.stroke();
        
        // Draw corner handles
        ctx.fillStyle = '#3b82f6';
        ctx.setLineDash([]);
        const handleSize = 6 / zoom;
        [[bounds.x, bounds.y], [bounds.x + bounds.width, bounds.y], 
         [bounds.x, bounds.y + bounds.height], [bounds.x + bounds.width, bounds.y + bounds.height]].forEach(([hx, hy]) => {
          ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
        });
      });
      ctx.setLineDash([]);
    }

    // Draw selection box if dragging
    if (selectionBox) {
      ctx.strokeStyle = '#3b82f6';
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([4 / zoom, 4 / zoom]);
      ctx.beginPath();
      ctx.rect(selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw collaborator cursors with better visibility
    let colorIndex = 0;
    collaborators.forEach((collab, oduserId) => {
      if (collab.pointer) {
        const cursorColor = collab.color || collaboratorColors[colorIndex % collaboratorColors.length];
        colorIndex++;
        
        // Draw cursor pointer (arrow shape)
        ctx.save();
        ctx.translate(collab.pointer.x, collab.pointer.y);
        
        // Draw glow effect if drawing
        if (collab.isDrawing) {
          ctx.shadowColor = cursorColor;
          ctx.shadowBlur = 15;
        }
        
        // Arrow cursor shape
        ctx.fillStyle = cursorColor;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 18);
        ctx.lineTo(5, 14);
        ctx.lineTo(10, 22);
        ctx.lineTo(14, 20);
        ctx.lineTo(9, 12);
        ctx.lineTo(14, 10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.restore();
        
        // Draw name tag
        const username = collab.username || 'User';
        ctx.font = 'bold 11px Inter, sans-serif';
        const textWidth = ctx.measureText(username).width;
        
        // Tag background
        ctx.fillStyle = cursorColor;
        const tagX = collab.pointer.x + 18;
        const tagY = collab.pointer.y + 18;
        ctx.beginPath();
        ctx.roundRect(tagX, tagY, textWidth + 12, 20, 4);
        ctx.fill();
        
        // Tag text
        ctx.fillStyle = '#000';
        ctx.fillText(username, tagX + 6, tagY + 14);
        
        // Drawing indicator (pulsing circle)
        if (collab.isDrawing) {
          ctx.fillStyle = cursorColor;
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.arc(collab.pointer.x, collab.pointer.y, 20, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    });

    ctx.restore();
  }, [elements, currentElement, canvasSize, pan, zoom, collaborators, selectedIds, selectionBox, collaboratorColors]);

  const getCanvasPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // Helper to check if point is inside element bounds
  const isPointInElement = useCallback((point: { x: number; y: number }, el: WhiteboardElement): boolean => {
    if (el.type === 'path' && el.points) {
      return el.points.some(p => Math.hypot(p.x - point.x, p.y - point.y) < 15);
    }
    if (el.x1 !== undefined && el.y1 !== undefined && el.x2 !== undefined && el.y2 !== undefined) {
      // Line/arrow hit detection
      const dist = Math.abs((el.y2 - el.y1) * point.x - (el.x2 - el.x1) * point.y + el.x2 * el.y1 - el.y2 * el.x1) /
        Math.hypot(el.y2 - el.y1, el.x2 - el.x1);
      const inXRange = point.x >= Math.min(el.x1, el.x2) - 10 && point.x <= Math.max(el.x1, el.x2) + 10;
      const inYRange = point.y >= Math.min(el.y1, el.y2) - 10 && point.y <= Math.max(el.y1, el.y2) + 10;
      return dist < 10 && inXRange && inYRange;
    }
    if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
      const x1 = el.width >= 0 ? el.x : el.x + el.width;
      const y1 = el.height >= 0 ? el.y : el.y + el.height;
      const x2 = el.width >= 0 ? el.x + el.width : el.x;
      const y2 = el.height >= 0 ? el.y + el.height : el.y;
      return point.x >= x1 - 5 && point.x <= x2 + 5 && point.y >= y1 - 5 && point.y <= y2 + 5;
    }
    if (el.x !== undefined && el.y !== undefined && el.text) {
      return point.x >= el.x - 5 && point.x <= el.x + 200 && point.y >= el.y - 20 && point.y <= el.y + 10;
    }
    return false;
  }, []);

  // Add to history - defined early so it can be used in handlers
  const addToHistory = useCallback((newElements: WhiteboardElement[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newElements);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isEnabled) return;
    e.preventDefault();
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);

    const point = getCanvasPoint(e);
    
    // Broadcast cursor position
    onCursorMove?.(point, false);

    if (tool === 'pan' || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (tool === 'select') {
      // Check if clicking on an existing element
      const clickedElement = [...elements].reverse().find(el => isPointInElement(point, el));
      
      if (clickedElement) {
        if (e.shiftKey) {
          // Shift-click to toggle selection
          setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(clickedElement.id)) {
              newSet.delete(clickedElement.id);
            } else {
              newSet.add(clickedElement.id);
            }
            return newSet;
          });
        } else if (!selectedIds.has(clickedElement.id)) {
          // Click on unselected element - select only it
          setSelectedIds(new Set([clickedElement.id]));
        }
        // If clicking on already selected element, keep selection (for potential drag)
      } else {
        // Click on empty space - start selection box
        if (!e.shiftKey) {
          setSelectedIds(new Set());
        }
        setSelectionStart(point);
        setSelectionBox({ x: point.x, y: point.y, width: 0, height: 0 });
      }
      return;
    }

    if (tool === 'text') {
      setTextInput({ x: e.clientX, y: e.clientY, visible: true });
      setTimeout(() => textInputRef.current?.focus(), 50);
      return;
    }

    if (tool === 'eraser') {
      // Start continuous erasing
      setIsErasing(true);
      erasedIdsRef.current = new Set();
      
      // Find and remove all elements at point
      const elementsToErase = elements.filter((el) => isPointInElement(point, el));
      if (elementsToErase.length > 0) {
        elementsToErase.forEach(el => erasedIdsRef.current.add(el.id));
        const newElements = elements.filter((el) => !erasedIdsRef.current.has(el.id));
        onElementsChange(newElements);
      }
      return;
    }

    setIsDrawing(true);
    onCursorMove?.(point, true);

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let newElement: WhiteboardElement;

    switch (tool) {
      case 'pen':
        newElement = { id, type: 'path', points: [point], color, strokeWidth, userId: currentUserId || '' };
        break;
      case 'line':
        newElement = { id, type: 'line', x1: point.x, y1: point.y, x2: point.x, y2: point.y, color, strokeWidth, userId: currentUserId || '' };
        break;
      case 'arrow':
        newElement = { id, type: 'arrow', x1: point.x, y1: point.y, x2: point.x, y2: point.y, color, strokeWidth, userId: currentUserId || '' };
        break;
      case 'rectangle':
        newElement = { id, type: 'rectangle', x: point.x, y: point.y, width: 0, height: 0, color, strokeWidth, userId: currentUserId || '' };
        break;
      case 'ellipse':
        newElement = { id, type: 'ellipse', x: point.x, y: point.y, width: 0, height: 0, color, strokeWidth, userId: currentUserId || '' };
        break;
      default:
        return;
    }

    setCurrentElement(newElement);
  }, [isEnabled, tool, color, strokeWidth, elements, pan, zoom, getCanvasPoint, onElementsChange, isPointInElement, selectedIds, currentUserId, onCursorMove]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isEnabled) return;

    const point = getCanvasPoint(e);
    
    // Always broadcast cursor position while moving
    if (!isPanning) {
      onCursorMove?.(point, isDrawing);
    }

    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    // Continue erasing while dragging
    if (isErasing && tool === 'eraser') {
      const elementsToErase = elements.filter((el) => isPointInElement(point, el) && !erasedIdsRef.current.has(el.id));
      if (elementsToErase.length > 0) {
        elementsToErase.forEach(el => erasedIdsRef.current.add(el.id));
        const newElements = elements.filter((el) => !erasedIdsRef.current.has(el.id));
        onElementsChange(newElements);
      }
      return;
    }

    // Update selection box if selecting
    if (selectionStart && tool === 'select') {
      setSelectionBox({
        x: Math.min(selectionStart.x, point.x),
        y: Math.min(selectionStart.y, point.y),
        width: Math.abs(point.x - selectionStart.x),
        height: Math.abs(point.y - selectionStart.y),
      });
      return;
    }

    if (!isDrawing || !currentElement) return;

    setCurrentElement(prev => {
      if (!prev) return null;

      switch (prev.type) {
        case 'path':
          return { ...prev, points: [...(prev.points || []), point] };
        case 'line':
        case 'arrow':
          return { ...prev, x2: point.x, y2: point.y };
        case 'rectangle':
        case 'ellipse':
          return {
            ...prev,
            width: point.x - (prev.x || 0),
            height: point.y - (prev.y || 0),
          };
        default:
          return prev;
      }
    });
  }, [isEnabled, isDrawing, isPanning, isErasing, currentElement, panStart, getCanvasPoint, selectionStart, tool, onCursorMove, elements, isPointInElement, onElementsChange]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    
    // Stop broadcasting drawing state
    onCursorMove?.(null, false);

    if (isPanning) {
      setIsPanning(false);
      return;
    }

    // Finish erasing and save to history
    if (isErasing) {
      setIsErasing(false);
      if (erasedIdsRef.current.size > 0) {
        // Elements have already been removed, just save to history
        addToHistory(elements);
      }
      erasedIdsRef.current = new Set();
      return;
    }

    // Finalize selection box
    if (selectionBox && selectionStart && tool === 'select') {
      // Find all elements within selection box
      const selected = elements.filter(el => {
        let bounds = { x: 0, y: 0, width: 0, height: 0 };
        
        if (el.type === 'path' && el.points && el.points.length > 0) {
          const xs = el.points.map(p => p.x);
          const ys = el.points.map(p => p.y);
          bounds = {
            x: Math.min(...xs),
            y: Math.min(...ys),
            width: Math.max(...xs) - Math.min(...xs),
            height: Math.max(...ys) - Math.min(...ys),
          };
        } else if (el.x1 !== undefined && el.y1 !== undefined && el.x2 !== undefined && el.y2 !== undefined) {
          bounds = {
            x: Math.min(el.x1, el.x2),
            y: Math.min(el.y1, el.y2),
            width: Math.abs(el.x2 - el.x1),
            height: Math.abs(el.y2 - el.y1),
          };
        } else if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
          bounds = { x: el.x, y: el.y, width: Math.abs(el.width), height: Math.abs(el.height) };
        } else if (el.x !== undefined && el.y !== undefined) {
          bounds = { x: el.x, y: el.y - 20, width: 100, height: 30 };
        }
        
        // Check if element bounds intersect with selection box
        return !(bounds.x + bounds.width < selectionBox.x ||
                 bounds.x > selectionBox.x + selectionBox.width ||
                 bounds.y + bounds.height < selectionBox.y ||
                 bounds.y > selectionBox.y + selectionBox.height);
      });
      
      if (selected.length > 0) {
        setSelectedIds(new Set(selected.map(el => el.id)));
      }
      
      setSelectionBox(null);
      setSelectionStart(null);
      return;
    }

    if (!isDrawing || !currentElement) return;

    setIsDrawing(false);
    const newElements = [...elements, currentElement];
    setCurrentElement(null);
    onElementsChange(newElements);
    addToHistory(newElements);
  }, [isDrawing, isPanning, isErasing, currentElement, elements, onElementsChange, addToHistory, selectionBox, selectionStart, tool, onCursorMove]);

  const handleTextSubmit = useCallback(() => {
    if (!textValue.trim()) {
      setTextInput({ x: 0, y: 0, visible: false });
      setTextValue('');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (textInput.x - rect.left - pan.x) / zoom;
    const y = (textInput.y - rect.top - pan.y) / zoom;

    const newElement: WhiteboardElement = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'text',
      x,
      y,
      text: textValue,
      color,
      strokeWidth,
      userId: '',
    };

    const newElements = [...elements, newElement];
    onElementsChange(newElements);
    addToHistory(newElements);
    setTextInput({ x: 0, y: 0, visible: false });
    setTextValue('');
  }, [textValue, textInput, pan, zoom, color, strokeWidth, elements, onElementsChange, addToHistory]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      onElementsChange(history[historyIndex - 1]);
    }
  }, [historyIndex, history, onElementsChange]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      onElementsChange(history[historyIndex + 1]);
    }
  }, [historyIndex, history, onElementsChange]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.min(Math.max(z * delta, 0.25), 4));
  }, []);

  if (!isEnabled) {
    return (
      <div className="w-full h-full relative bg-[#121212] rounded-lg flex items-center justify-center">
        <div className="text-center p-6 rounded-xl bg-zinc-900/80 border border-zinc-800/50">
          <PenTool className="h-8 w-8 text-amber-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-white mb-1">Mark Attendance to Draw</p>
          <p className="text-xs text-zinc-500">Click "Attend" in the header to start</p>
        </div>
      </div>
    );
  }

  const tools: { id: WhiteboardTool; icon: React.ReactNode; label: string }[] = [
    { id: 'select', icon: <MousePointer2 className="h-4 w-4" />, label: 'Select' },
    { id: 'pan', icon: <Hand className="h-4 w-4" />, label: 'Pan' },
    { id: 'pen', icon: <PenTool className="h-4 w-4" />, label: 'Pen' },
    { id: 'line', icon: <Minus className="h-4 w-4" />, label: 'Line' },
    { id: 'arrow', icon: <ArrowUpRight className="h-4 w-4" />, label: 'Arrow' },
    { id: 'rectangle', icon: <Square className="h-4 w-4" />, label: 'Rectangle' },
    { id: 'ellipse', icon: <CircleIcon className="h-4 w-4" />, label: 'Ellipse' },
    { id: 'text', icon: <Type className="h-4 w-4" />, label: 'Text' },
    { id: 'eraser', icon: <Eraser className="h-4 w-4" />, label: 'Eraser' },
  ];

  return (
    <div ref={containerRef} className="w-full h-full relative bg-[#121212] rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 p-1.5 bg-zinc-900/95 backdrop-blur-sm rounded-xl border border-zinc-800/50 shadow-xl">
        {/* Tools */}
        {tools.map((t) => (
          <Tooltip key={t.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setTool(t.id)}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  tool === t.id
                    ? "bg-amber-500/20 text-amber-400"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                )}
              >
                {t.icon}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t.label}</TooltipContent>
          </Tooltip>
        ))}

        <div className="w-px h-6 bg-zinc-700/50 mx-1" />

        {/* Colors */}
        <div className="flex items-center gap-0.5">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                "h-6 w-6 rounded-full border-2 transition-all",
                color === c ? "border-white scale-110" : "border-transparent hover:scale-105"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="w-px h-6 bg-zinc-700/50 mx-1" />

        {/* Stroke width */}
        <div className="flex items-center gap-0.5">
          {strokeWidths.map((w) => (
            <button
              key={w}
              onClick={() => setStrokeWidth(w)}
              className={cn(
                "h-7 w-7 rounded flex items-center justify-center transition-all",
                strokeWidth === w ? "bg-zinc-700 text-white" : "text-zinc-500 hover:bg-zinc-800"
              )}
            >
              <div className="rounded-full bg-current" style={{ width: w + 2, height: w + 2 }} />
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-zinc-700/50 mx-1" />

        {/* Undo/Redo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Undo</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Redo</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-zinc-700/50 mx-1" />

        {/* Zoom */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setZoom(z => Math.min(z * 1.2, 4))}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Zoom In</TooltipContent>
        </Tooltip>
        <span className="text-[10px] text-zinc-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setZoom(z => Math.max(z * 0.8, 0.25))}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Zoom Out</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-zinc-700/50 mx-1" />

        {/* Clear */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onClear}
              className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Clear Board</TooltipContent>
        </Tooltip>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className={cn(
          "w-full h-full",
          tool === 'pan' ? "cursor-grab" : tool === 'eraser' ? "cursor-crosshair" : "cursor-crosshair",
          isPanning && "cursor-grabbing"
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        style={{ touchAction: 'none' }}
      />

      {/* Text input overlay */}
      {textInput.visible && (
        <input
          ref={textInputRef}
          type="text"
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onBlur={handleTextSubmit}
          onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
          className="absolute bg-transparent border-2 border-amber-500 text-white px-2 py-1 rounded outline-none"
          style={{
            left: textInput.x,
            top: textInput.y,
            transform: 'translate(-4px, -50%)',
            fontSize: strokeWidth * 6,
            color: color,
          }}
          placeholder="Type here..."
          autoFocus
        />
      )}

      {/* Collaborators indicator */}
      {collaborators.size > 0 && (
        <div className="absolute bottom-4 left-4 flex flex-col gap-2">
          {/* People currently drawing */}
          {Array.from(collaborators.entries()).filter(([_, c]) => c.isDrawing).length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 animate-pulse">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[10px] text-emerald-400 font-medium">
                {Array.from(collaborators.entries())
                  .filter(([_, c]) => c.isDrawing)
                  .map(([_, c]) => c.username)
                  .join(', ')} drawing...
              </span>
            </div>
          )}
          
          {/* Active collaborators */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800/50">
            <span className="text-[10px] text-zinc-200 font-semibold">{collaborators.size} online</span>
            <div className="flex -space-x-1">
              {Array.from(collaborators.entries()).slice(0, 5).map(([id, collab]) => (
                <div
                  key={id}
                  className={cn(
                    "h-5 w-5 rounded-full border-2 text-[8px] flex items-center justify-center font-bold transition-all",
                    collab.isDrawing 
                      ? "border-emerald-400 ring-2 ring-emerald-400/30 scale-110" 
                      : "border-zinc-900"
                  )}
                  style={{ backgroundColor: collab.color || '#f59e0b' }}
                  title={`${collab.username}${collab.isDrawing ? ' (drawing)' : ''}`}
                >
                  {collab.username?.charAt(0).toUpperCase() || '?'}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <div className="absolute bottom-4 right-4 px-3 py-2 rounded-lg bg-zinc-900/80 border border-zinc-800/50">
        <div className="text-[9px] text-zinc-500 space-y-0.5">
          <div><span className="text-zinc-400">V</span> Select • <span className="text-zinc-400">P</span> Pen • <span className="text-zinc-400">R</span> Rectangle • <span className="text-zinc-400">O</span> Ellipse</div>
          <div><span className="text-zinc-400">Ctrl+C</span> Copy • <span className="text-zinc-400">Ctrl+V</span> Paste • <span className="text-zinc-400">Ctrl+D</span> Duplicate</div>
          <div><span className="text-zinc-400">Ctrl+Z</span> Undo • <span className="text-zinc-400">Ctrl+Y</span> Redo • <span className="text-zinc-400">Del</span> Delete</div>
        </div>
      </div>
    </div>
  );
});

// Fullscreen Video Modal
const FullscreenVideoModal = React.memo(function FullscreenVideoModal({
  focusedVideo,
  onClose,
  localStream,
  localScreenStream,
  remoteTracks,
  isVideoEnabled,
  isAudioEnabled,
  audioLevel,
  currentUserProfile,
}: {
  focusedVideo: FocusedVideoType;
  onClose: () => void;
  localStream: MediaStream | null;
  localScreenStream: MediaStream | null;
  remoteTracks: RemoteTrackView[];
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  audioLevel: number;
  currentUserProfile: any;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !focusedVideo) return;

    if (focusedVideo.type === 'local' && localStream) {
      videoEl.srcObject = localStream;
      videoEl.muted = true;
      videoEl.play().catch(console.error);
    } else if (focusedVideo.type === 'localScreen' && localScreenStream) {
      videoEl.srcObject = localScreenStream;
      videoEl.muted = true;
      videoEl.play().catch(console.error);
    } else if (focusedVideo.type === 'remote' && focusedVideo.id) {
      const remoteTrack = remoteTracks.find(rt => rt.id === focusedVideo.id);
      if (remoteTrack?.videoTrack) {
        remoteTrack.videoTrack.attach(videoEl);
        if (remoteTrack.audioTrack && audioRef.current) {
          remoteTrack.audioTrack.attach(audioRef.current);
          audioRef.current.play().catch(console.error);
        }
      }
    }

    return () => {
      if (focusedVideo?.type === 'remote' && focusedVideo.id) {
        const remoteTrack = remoteTracks.find(rt => rt.id === focusedVideo.id);
        if (remoteTrack?.videoTrack && videoEl) {
          remoteTrack.videoTrack.detach(videoEl);
        }
        if (remoteTrack?.audioTrack && audioRef.current) {
          remoteTrack.audioTrack.detach(audioRef.current);
        }
      }
    };
  }, [focusedVideo, localStream, localScreenStream, remoteTracks]);

  if (!focusedVideo) return null;

  const title = focusedVideo.type === 'local' 
    ? 'You' 
    : focusedVideo.type === 'localScreen' 
      ? 'Your Screen' 
      : focusedVideo.fullName || 'Participant';

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between bg-black/50 border-b border-zinc-800/30">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-white font-medium">{title}</span>
          {focusedVideo.type === 'localScreen' && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-[10px]">SCREEN SHARE</Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-10 w-10 rounded-full hover:bg-zinc-800 text-white"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Video */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative w-full max-w-6xl aspect-video rounded-xl overflow-hidden bg-zinc-900 ring-2 ring-zinc-700/50">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={focusedVideo.type !== 'remote'}
            className="w-full h-full object-contain"
          />
          <audio ref={audioRef} autoPlay />
          
          {/* Overlay info */}
          <div className="absolute bottom-4 left-4 flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm flex items-center gap-2">
              <span className="text-white text-sm font-medium">{title}</span>
              {focusedVideo.type === 'local' && isAudioEnabled && (
                <div className="flex items-center gap-0.5">
                  <div className={cn("w-1 rounded-full bg-emerald-400 transition-all duration-75", audioLevel > 5 ? "h-2" : "h-1")} />
                  <div className={cn("w-1 rounded-full bg-emerald-400 transition-all duration-75", audioLevel > 15 ? "h-3" : "h-1")} />
                  <div className={cn("w-1 rounded-full bg-emerald-400 transition-all duration-75", audioLevel > 30 ? "h-2" : "h-1")} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="h-12 flex items-center justify-center text-zinc-500 text-sm">
        Press <kbd className="mx-1 px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">ESC</kbd> or click outside to close
      </div>
    </div>
  );
});

// Types
interface Participant {
  oduserId: string;
  odusername: string;
  fullName: string;
  avatarUrl?: string;
  cursorColor: string;
  isHost: boolean;
  isInCall: boolean;
  isTyping?: boolean;
}

interface SessionData {
  id: string;
  title: string;
  pod_id: string;
  host_user_id: string;
  status: string;
  session_type: string;
  current_code?: string;
  current_language?: string;
}

interface ChatMessage {
  id: string;
  oduserId: string;
  odusername: string;
  fullName: string;
  avatarUrl?: string;
  message: string;
  timestamp: Date;
}

interface RemoteTrackView {
  id: string;
  participantId: string;
  fullName: string;
  kind: 'camera' | 'screen';
  videoTrack?: RemoteTrack;
  audioTrack?: RemoteTrack;
}

// Whiteboard collaborator type (simplified for custom whiteboard)
interface WhiteboardCollaborator {
  pointer?: { x: number; y: number };
  username?: string;
  color?: string;
  isDrawing?: boolean;
}

// Focused video types
type FocusedVideoType = {
  type: 'local' | 'localScreen' | 'remote';
  id?: string;
  fullName?: string;
} | null;

// View mode types
type ViewMode = 'code' | 'whiteboard' | 'cameras';

// Remote Video Tile Component using LiveKit tracks directly
const RemoteVideoTile = React.memo(function RemoteVideoTile({
  videoTrack,
  audioTrack,
  fullName,
  kind,
  id,
  onMaximize,
}: RemoteTrackView & { onMaximize?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasAudio, setHasAudio] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  // Attach video track
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (videoTrack) {
      videoTrack.attach(el);
      el.playsInline = true;
      el.muted = true;
      el.play().catch((err) => console.warn('[RemoteVideo] Video play error', err));
      return () => {
        videoTrack.detach(el);
      };
    }

    el.srcObject = null;
  }, [videoTrack]);

  // Attach audio track
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    if (audioTrack) {
      audioTrack.attach(el);
      el.autoplay = true;
      el.muted = false;
      el.volume = 1.0;
      el
        .play()
        .then(() => setAudioError(false))
        .catch((err) => {
          console.warn('[RemoteAudio] Play error', err);
          setAudioError(true);
        });
      return () => {
        audioTrack.detach(el);
      };
    }

    el.srcObject = null;
    setAudioError(false);
  }, [audioTrack]);

  // Monitor audio track state and levels
  useEffect(() => {
    if (!audioTrack?.mediaStreamTrack) {
      setHasAudio(false);
      setIsMuted(true);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      return;
    }

    setHasAudio(true);
    setIsMuted(audioTrack.isMuted);

    const handleMuted = () => setIsMuted(true);
    const handleUnmuted = () => setIsMuted(false);
    audioTrack.on(TrackEvent.Muted, handleMuted);
    audioTrack.on(TrackEvent.Unmuted, handleUnmuted);

    try {
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const stream = new MediaStream([audioTrack.mediaStreamTrack]);
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (analyserRef.current && audioContextRef.current?.state === 'running' && !audioTrack.isMuted) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
          setAudioLevel(avg);
        } else {
          setAudioLevel(0);
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      console.warn('[RemoteAudio] Analyser error', err);
    }

    return () => {
      audioTrack.off(TrackEvent.Muted, handleMuted);
      audioTrack.off(TrackEvent.Unmuted, handleUnmuted);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      analyserRef.current = null;
    };
  }, [audioTrack]);

  // Handle click to enable audio (user interaction required for autoplay)
  const handleClick = async () => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    try {
      await audioEl.play();
      setAudioError(false);
    } catch (err) {
      console.error('[RemoteVideo] Audio resume failed', err);
      setAudioError(true);
    }
  };

  const isActuallyMuted = isMuted || !hasAudio;
  const isSpeaking = hasAudio && !isMuted && audioLevel > 5;

  return (
    <div 
      className={cn(
        "relative aspect-video rounded-lg overflow-hidden bg-zinc-900 border-2 cursor-pointer group transition-all duration-150",
        isSpeaking && !audioError ? "border-emerald-500 shadow-lg shadow-emerald-500/20" : "border-zinc-800"
      )}
      onClick={handleClick}
    >
      {videoTrack ? (
        <video ref={videoRef} className="w-full h-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-sm text-zinc-300">
          {fullName}
        </div>
      )}
      <audio ref={audioRef} className="hidden" />
      
      <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded text-[9px] font-medium bg-black/70 text-white flex items-center gap-1.5">
        {fullName}
        {hasAudio && !audioError && !isMuted ? (
          <div className="flex items-center gap-0.5">
            <div className={cn("w-1 rounded-full bg-emerald-400 transition-all duration-75", audioLevel > 5 ? "h-2" : "h-1")} />
            <div className={cn("w-1 rounded-full bg-emerald-400 transition-all duration-75", audioLevel > 15 ? "h-3" : "h-1")} />
            <div className={cn("w-1 rounded-full bg-emerald-400 transition-all duration-75", audioLevel > 30 ? "h-2" : "h-1")} />
          </div>
        ) : audioError ? (
          <span className="text-amber-400 flex items-center gap-0.5">
            <MicOff className="h-2.5 w-2.5" />
            tap to enable
          </span>
        ) : isMuted ? (
          <span className="text-red-400 flex items-center gap-0.5">
            <MicOff className="h-2.5 w-2.5" />
            muted
          </span>
        ) : null}
      </div>
      {audioError && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
          <div className="text-center space-y-2">
            <MicOff className="h-8 w-8 text-amber-400 mx-auto" />
            <p className="text-sm font-medium text-white">Audio Blocked</p>
            <p className="text-xs text-zinc-400">Click anywhere to enable</p>
          </div>
        </div>
      )}
      
      {/* Audio status indicator */}
      {hasAudio && !audioError && (
        <div className="absolute top-1.5 right-1.5">
          <div className={cn(
            "px-2 py-0.5 rounded text-[9px] font-medium flex items-center gap-1",
            isSpeaking ? "bg-emerald-500/90 text-white" : isMuted ? "bg-red-500/90 text-white" : "bg-zinc-800/90 text-zinc-300"
          )}>
            <Mic className={cn("h-2.5 w-2.5", isMuted && "text-red-300")} />
            {isMuted ? 'Muted' : isSpeaking ? 'Speaking' : 'Quiet'}
          </div>
        </div>
      )}

      {/* Maximize button - shows on hover */}
      {onMaximize && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMaximize();
          }}
          className="absolute top-1.5 left-1.5 p-1 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
        >
          <Maximize2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
});

// Language configurations
const LANGUAGES = [
  { value: 'python', label: 'Python', monacoId: 'python' },
  { value: 'javascript', label: 'JavaScript', monacoId: 'javascript' },
  { value: 'typescript', label: 'TypeScript', monacoId: 'typescript' },
  { value: 'java', label: 'Java', monacoId: 'java' },
  { value: 'cpp', label: 'C++', monacoId: 'cpp' },
  { value: 'go', label: 'Go', monacoId: 'go' },
  { value: 'rust', label: 'Rust', monacoId: 'rust' },
];

const DEFAULT_CODE: Record<string, string> = {
  python: `# Welcome to the live coding session!
# Write your solution below

def solution():
    print("Hello, World!")
    return True

# Test your solution
if __name__ == "__main__":
    result = solution()
    print(f"Result: {result}")
`,
  javascript: `// Welcome to the live coding session!
// Write your solution below

function solution() {
    console.log("Hello, World!");
    return true;
}

// Test your solution
const result = solution();
console.log("Result:", result);
`,
  typescript: `// Welcome to the live coding session!
// Write your solution below

function solution(): boolean {
    console.log("Hello, World!");
    return true;
}

// Test your solution
const result: boolean = solution();
console.log("Result:", result);
`,
  java: `// Welcome to the live coding session!
public class Main {
    public static void main(String[] args) {
        boolean result = solution();
        System.out.println("Result: " + result);
    }
    
    public static boolean solution() {
        System.out.println("Hello, World!");
        return true;
    }
}
`,
  cpp: `// Welcome to the live coding session!
#include <iostream>
using namespace std;

bool solution() {
    cout << "Hello, World!" << endl;
    return true;
}

int main() {
    bool result = solution();
    cout << "Result: " << result << endl;
    return 0;
}
`,
  go: `// Welcome to the live coding session!
package main

import "fmt"

func solution() bool {
    fmt.Println("Hello, World!")
    return true
}

func main() {
    result := solution()
    fmt.Printf("Result: %v\\n", result)
}
`,
  rust: `// Welcome to the live coding session!
fn solution() -> bool {
    println!("Hello, World!");
    true
}

fn main() {
    let result = solution();
    println!("Result: {}", result);
}
`,
};

const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
];

export default function LiveSessionPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const podId = params.id as string;
  const sessionId = params.sessionId as string;

  // Core State
  const [session, setSession] = useState<SessionData | null>(null);
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('python');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [myCursorColor] = useState(() => CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)]);

  // Attendance State
  const [hasMarkedAttendance, setHasMarkedAttendance] = useState(false);
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);

  // UI State
  const [activeTab, setActiveTab] = useState<string>('participants');
  const [copiedCode, setCopiedCode] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // Clear unread messages when switching to chat tab
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    if (tab === 'chat') {
      setUnreadMessages(0);
    }
  }, []);

  // Execution State
  const [output, setOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Video Call State
  const [isInCall, setIsInCall] = useState(false);
  const [isConnectingCall, setIsConnectingCall] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteTracks, setRemoteTracks] = useState<RemoteTrackView[]>([]);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<MediaStreamTrack | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // Typing indicator
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('code');
  
  // Focused video state (for fullscreen)
  const [focusedVideo, setFocusedVideo] = useState<FocusedVideoType>(null);
  
  // Whiteboard state
  const [whiteboardElements, setWhiteboardElements] = useState<WhiteboardElement[]>([]);
  const [whiteboardCollaborators, setWhiteboardCollaborators] = useState<Map<string, WhiteboardCollaborator>>(new Map());
  const lastSentElementsRef = useRef<string>('');
  
  // Audio analyzer ref
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioAnimationRef = useRef<number | null>(null);

  // Refs
  const editorRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localScreenVideoRef = useRef<HTMLVideoElement>(null);
  const camerasViewVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const isRemoteUpdate = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const livekitRoomRef = useRef<Room | null>(null);
  const remoteTrackRefs = useRef<Map<string, { video?: RemoteTrack; screen?: RemoteTrack; audio?: RemoteTrack }>>(new Map());
  const localCameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const localMicTrackRef = useRef<MediaStreamTrack | null>(null);
  const isInCallRef = useRef(false);
  const currentUserRef = useRef<any>(null);
  const currentUserProfileRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const isCleaningUpRef = useRef(false);

  const refreshRemoteTracks = useCallback(() => {
    const updated: RemoteTrackView[] = [];
    remoteTrackRefs.current.forEach((entry, identity) => {
      const participant = participants.find((p) => p.oduserId === identity);
      const fullName = participant?.fullName || 'Participant';

      // Camera view (with video and/or audio)
      if (entry.video || entry.audio) {
        updated.push({
          id: `${identity}-camera`,
          participantId: identity,
          fullName,
          kind: 'camera',
          videoTrack: entry.video,
          audioTrack: entry.audio,
        });
      }

      // Screen share view (video only, no audio)
      if (entry.screen) {
        updated.push({
          id: `${identity}-screen`,
          participantId: identity,
          fullName: `${fullName} • Screen`,
          kind: 'screen',
          videoTrack: entry.screen,
        });
      }
    });
    console.log('[LiveKit] Refreshed remote tracks:', updated.length, updated.map(t => ({ id: t.id, hasVideo: !!t.videoTrack, hasAudio: !!t.audioTrack })));
    setRemoteTracks(updated);
  }, [participants]);

  const attachRemoteTrack = useCallback(
    (identity: string | undefined, source: 'camera' | 'screen' | 'audio', track: RemoteTrack | null) => {
      if (!track || !identity) {
        if (!identity) {
          console.warn('[LiveKit] Missing identity for remote track');
        }
        return;
      }

      let entry = remoteTrackRefs.current.get(identity);
      if (!entry) {
        entry = {};
        remoteTrackRefs.current.set(identity, entry);
      }

      if (source === 'camera') {
        entry.video = track;
      } else if (source === 'screen') {
        entry.screen = track;
      } else if (source === 'audio') {
        entry.audio = track;
        // Audio is always associated with camera view
        if (!entry.video) {
          // If no camera video yet, we'll still show audio-only
        }
      }

      refreshRemoteTracks();
    },
    [refreshRemoteTracks]
  );

  const detachRemoteTrack = useCallback(
    (identity: string | undefined, source: 'camera' | 'screen' | 'audio', track: RemoteTrack | null) => {
      if (!track || !identity) {
        return;
      }
      const entry = remoteTrackRefs.current.get(identity);
      if (!entry) {
        return;
      }

      if (source === 'camera' && entry.video === track) {
        delete entry.video;
      } else if (source === 'screen' && entry.screen === track) {
        delete entry.screen;
      } else if (source === 'audio' && entry.audio === track) {
        delete entry.audio;
      }

      if (!entry.video && !entry.screen && !entry.audio) {
        remoteTrackRefs.current.delete(identity);
      }

      refreshRemoteTracks();
    },
    [refreshRemoteTracks]
  );

  const stopLocalAudioMonitor = useCallback(() => {
    if (audioAnimationRef.current) {
      cancelAnimationFrame(audioAnimationRef.current);
      audioAnimationRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  const startLocalAudioMonitor = useCallback(async (stream: MediaStream) => {
    try {
      stopLocalAudioMonitor();
      const audioContext = new AudioContext();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkAudioLevel = () => {
        if (analyserRef.current && audioContextRef.current?.state === 'running' && isAudioEnabled) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average);
        }
        audioAnimationRef.current = requestAnimationFrame(checkAudioLevel);
      };
      checkAudioLevel();
    } catch (error) {
      console.error('[Audio] Failed to initialize local audio monitor', error);
    }
  }, [isAudioEnabled, stopLocalAudioMonitor]);

  // Build local stream from our stored track refs (more reliable than room collections)
  const buildLocalStreamFromRefs = useCallback(async () => {
    const combined = new MediaStream();
    
    if (localCameraTrackRef.current) {
      console.log('[LocalStream] Adding camera track from ref');
      combined.addTrack(localCameraTrackRef.current);
      setLocalVideoTrack(localCameraTrackRef.current);
    } else {
      setLocalVideoTrack(null);
    }
    
    if (localMicTrackRef.current) {
      console.log('[LocalStream] Adding audio track from ref');
      combined.addTrack(localMicTrackRef.current);
      setLocalAudioTrack(localMicTrackRef.current);
    } else {
      setLocalAudioTrack(null);
    }
    
    if (combined.getTracks().length > 0) {
      console.log('[LocalStream] Built stream with', combined.getTracks().length, 'tracks from refs');
      localStreamRef.current = combined;
      setLocalStream(combined);
      if (combined.getAudioTracks().length > 0) {
        await startLocalAudioMonitor(combined);
      } else {
        stopLocalAudioMonitor();
      }
    } else {
      console.log('[LocalStream] No tracks in refs yet');
      localStreamRef.current = null;
      setLocalStream(null);
      stopLocalAudioMonitor();
    }
  }, [startLocalAudioMonitor, stopLocalAudioMonitor]);

  const rebuildLocalStreamFromRoom = useCallback(async () => {
    const room = livekitRoomRef.current;
    if (!room || !room.localParticipant) return;

    // Get all track publications and filter by source
    const allPubs = room.localParticipant.trackPublications
      ? Array.from(room.localParticipant.trackPublications.values()) as LocalTrackPublication[]
      : [];
    
    const videoTracks = allPubs.filter((pub: LocalTrackPublication) => pub.kind === Track.Kind.Video);
    const audioTracks = allPubs.filter((pub: LocalTrackPublication) => pub.kind === Track.Kind.Audio);

    console.log('[LocalStream] Checking room collections - Video:', videoTracks.length, 'Audio:', audioTracks.length);

    const cameraPublication = videoTracks.find(
      (pub: LocalTrackPublication) => pub.source === Track.Source.Camera && pub.track?.mediaStreamTrack
    );
    const audioPublication = audioTracks.find((pub: LocalTrackPublication) => pub.track?.mediaStreamTrack);

    // Update refs from room collections
    if (cameraPublication?.track?.mediaStreamTrack) {
      localCameraTrackRef.current = cameraPublication.track.mediaStreamTrack;
    }
    if (audioPublication?.track?.mediaStreamTrack) {
      localMicTrackRef.current = audioPublication.track.mediaStreamTrack;
    }

    // Build stream from refs
    await buildLocalStreamFromRefs();
  }, [buildLocalStreamFromRefs]);

  // Initialize
  useEffect(() => {
    // Prevent double initialization (React Strict Mode)
    if (isInitializedRef.current) {
      console.log('[Init] Already initialized, skipping...');
      return;
    }
    isInitializedRef.current = true;
    isCleaningUpRef.current = false;
    
    initSession();
    
    return () => {
      isCleaningUpRef.current = true;
      cleanup();
      // Reset for potential remount
      isInitializedRef.current = false;
    };
  }, [sessionId]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Attach local stream to video element when it changes
  useEffect(() => {
    const videoEl = localVideoRef.current;
    if (!videoEl) {
      console.log('[LocalVideo] Video element not available');
      return;
    }

    if (localStream && localStream.getVideoTracks().length > 0) {
      console.log('[LocalVideo] Setting stream with', localStream.getVideoTracks().length, 'video tracks');
      videoEl.srcObject = localStream;
      videoEl.play()
        .then(() => console.log('[LocalVideo] Video playing successfully'))
        .catch(e => console.error('[LocalVideo] Play error:', e));
    } else if (localVideoTrack) {
      console.log('[LocalVideo] Setting direct video track');
      const stream = new MediaStream([localVideoTrack]);
      videoEl.srcObject = stream;
      videoEl.play()
        .then(() => console.log('[LocalVideo] Direct track playing successfully'))
        .catch(e => console.error('[LocalVideo] Direct track play error:', e));
    } else if (isInCall && livekitRoomRef.current?.localParticipant?.isCameraEnabled) {
      // Fallback: try to get track directly from LiveKit room
      const room = livekitRoomRef.current;
      const allPubs = room.localParticipant.trackPublications
        ? Array.from(room.localParticipant.trackPublications.values()) as LocalTrackPublication[]
        : [];
      const cameraPub = allPubs.find((p: LocalTrackPublication) => p.source === Track.Source.Camera && p.track?.mediaStreamTrack);
      if (cameraPub?.track?.mediaStreamTrack) {
        console.log('[LocalVideo] Using fallback - direct from LiveKit');
        localCameraTrackRef.current = cameraPub.track.mediaStreamTrack;
        const stream = new MediaStream([cameraPub.track.mediaStreamTrack]);
        videoEl.srcObject = stream;
        videoEl.play()
          .then(() => console.log('[LocalVideo] Fallback playing successfully'))
          .catch(e => console.error('[LocalVideo] Fallback play error:', e));
      } else {
        console.log('[LocalVideo] No stream or track available');
        videoEl.srcObject = null;
      }
    } else {
      console.log('[LocalVideo] No stream or track available');
      videoEl.srcObject = null;
    }
  }, [localStream, localVideoTrack, isInCall]);

  useEffect(() => {
    if (localScreenVideoRef.current) {
      if (localScreenStream) {
        localScreenVideoRef.current.srcObject = localScreenStream;
        localScreenVideoRef.current.play().catch(e => console.log('Screen video play error:', e));
      } else {
        localScreenVideoRef.current.srcObject = null;
      }
    }
  }, [localScreenStream]);

  // Attach local stream to cameras view video element
  useEffect(() => {
    const videoEl = camerasViewVideoRef.current;
    if (!videoEl) return;
    
    if (localStream) {
      console.log('[CamerasView] Setting local stream');
      videoEl.srcObject = localStream;
      videoEl.play()
        .then(() => console.log('[CamerasView] Video playing'))
        .catch(e => console.error('[CamerasView] Play error:', e));
    } else if (localVideoTrack) {
      console.log('[CamerasView] Setting direct video track');
      const stream = new MediaStream([localVideoTrack]);
      videoEl.srcObject = stream;
      videoEl.play()
        .then(() => console.log('[CamerasView] Direct track playing'))
        .catch(e => console.error('[CamerasView] Direct track play error:', e));
    } else if (isInCall && livekitRoomRef.current?.localParticipant?.isCameraEnabled) {
      // Fallback: try to get track directly from LiveKit room
      const room = livekitRoomRef.current;
      const allPubs = room.localParticipant.trackPublications
        ? Array.from(room.localParticipant.trackPublications.values()) as LocalTrackPublication[]
        : [];
      const cameraPub = allPubs.find((p: LocalTrackPublication) => p.source === Track.Source.Camera && p.track?.mediaStreamTrack);
      if (cameraPub?.track?.mediaStreamTrack) {
        console.log('[CamerasView] Using fallback - direct from LiveKit');
        const stream = new MediaStream([cameraPub.track.mediaStreamTrack]);
        videoEl.srcObject = stream;
        videoEl.play()
          .then(() => console.log('[CamerasView] Fallback playing'))
          .catch(e => console.error('[CamerasView] Fallback play error:', e));
      } else {
        videoEl.srcObject = null;
      }
    } else {
      videoEl.srcObject = null;
    }
  }, [localStream, localVideoTrack, isInCall, viewMode]);

  // Keep refs in sync with state (for use in closures)
  useEffect(() => {
    isInCallRef.current = isInCall;
  }, [isInCall]);

  // Retry getting local video after a delay when joining call
  useEffect(() => {
    if (isInCall && !localStream && !localVideoTrack) {
      const timeoutId = setTimeout(() => {
        console.log('[LocalVideo] Retrying to get local video...');
        const room = livekitRoomRef.current;
        if (!room) return;
        
        // Try to get tracks from room and store in refs
        const allPubs = room.localParticipant?.trackPublications
          ? Array.from(room.localParticipant.trackPublications.values()) as LocalTrackPublication[]
          : [];
        const videoTracks = allPubs.filter((p: LocalTrackPublication) => p.kind === Track.Kind.Video);
        const audioTracks = allPubs.filter((p: LocalTrackPublication) => p.kind === Track.Kind.Audio);
        
        const cameraPub = videoTracks.find((p: LocalTrackPublication) => p.source === Track.Source.Camera && p.track?.mediaStreamTrack);
        const audioPub = audioTracks.find((p: LocalTrackPublication) => p.track?.mediaStreamTrack);
        
        if (cameraPub?.track?.mediaStreamTrack) {
          console.log('[LocalVideo] Found camera track on retry');
          localCameraTrackRef.current = cameraPub.track.mediaStreamTrack;
        }
        if (audioPub?.track?.mediaStreamTrack) {
          console.log('[LocalVideo] Found audio track on retry');
          localMicTrackRef.current = audioPub.track.mediaStreamTrack;
        }
        
        buildLocalStreamFromRefs();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isInCall, localStream, localVideoTrack, buildLocalStreamFromRefs]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    currentUserProfileRef.current = currentUserProfile;
  }, [currentUserProfile]);

  const cleanup = () => {
    console.log('[Cleanup] Starting cleanup...');
    // Cleanup realtime channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    // Cleanup media
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => {
        t.stop();
        console.log('[Cleanup] Stopped track:', t.kind);
      });
      localStreamRef.current = null;
    }
    remoteTrackRefs.current.clear();
    setRemoteTracks([]);
    setLocalScreenStream(null);
    setLocalScreenStream(null);
    if (localScreenVideoRef.current) {
      localScreenVideoRef.current.srcObject = null;
    }
    const room = livekitRoomRef.current;
    if (room) {
      room.disconnect();
      livekitRoomRef.current = null;
    }
  };

  const initSession = async () => {
    try {
      console.log('[Init] Starting session initialization...');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUser(user);
      console.log('[Init] Current user:', user.id);

      // Get user profile with retry and fallback
      let profile = null;
      try {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', user.id)
          .single();
        profile = data;
      } catch (e) {
        console.warn('[Init] Failed to fetch profile:', e);
      }

      // Fallback to auth metadata if profile is missing
      if (!profile) {
        console.log('[Init] Using auth metadata fallback');
        profile = {
          username: user.user_metadata?.username || user.email?.split('@')[0] || 'user',
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
          avatar_url: user.user_metadata?.avatar_url,
        };
      }
      
      setCurrentUserProfile(profile);
      console.log('[Init] User profile:', profile?.username);

      // Fetch session
      const { data: sessionData } = await supabase
        .from('study_pod_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionData) {
        setSession(sessionData);
        setCode(sessionData.current_code || DEFAULT_CODE['python']);
        setLanguage(sessionData.current_language || 'python');
        console.log('[Init] Session loaded:', sessionData.title);
      }

      // Check attendance
      const { data: attendance } = await supabase
        .from('study_pod_session_attendance')
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .maybeSingle();

      setHasMarkedAttendance(!!attendance);
      console.log('[Init] Attendance status:', !!attendance);

      // Setup realtime channel
      await setupRealtimeChannel(user, profile, sessionData);

      setLoading(false);
    } catch (error) {
      console.error('[Init] Error:', error);
      toast.error('Failed to load session');
      setLoading(false);
    }
  };

  const setupRealtimeChannel = async (user: any, profile: any, sessionData: any) => {
    // Check if we're cleaning up
    if (isCleaningUpRef.current) {
      console.log('[Realtime] Cleanup in progress, skipping channel setup');
      return;
    }
    
    console.log('[Realtime] Setting up channel for session:', sessionId);
    
    // Clean up any existing channel first
    if (channelRef.current) {
      console.log('[Realtime] Removing existing channel before creating new one');
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    // Create a unique channel name
    const channelName = `live-session-${sessionId}`;
    
    const channel = supabase.channel(channelName, {
      config: { 
        presence: { key: user.id },
        broadcast: { self: false, ack: false } // Disable ack to prevent REST fallback
      },
    });

    // Helper to fetch user profile if missing
    const fetchUserProfile = async (userId: string) => {
      try {
        const { data } = await supabase
          .from('users')
          .select('username, full_name, avatar_url')
          .eq('user_id', userId)
          .single();
        return data;
      } catch {
        // Fallback: try to get from auth metadata (if we have access)
        return null;
      }
    };

    // Presence sync - this fires when presence state changes
    channel.on('presence', { event: 'sync' }, async () => {
      const state = channel.presenceState();
      console.log('[Presence] Sync event, state:', state);
      
      const presenceParticipants: Participant[] = [];
      const profilePromises: Promise<void>[] = [];
      
      Object.entries(state).forEach(([oduserId, presences]: [string, any]) => {
        const presence = presences[0];
        if (presence) {
          // If fullName is missing or generic, fetch profile
          if (!presence.fullName || presence.fullName === 'User' || presence.fullName === 'Unknown User') {
            profilePromises.push(
              fetchUserProfile(oduserId).then(profile => {
                if (profile) {
                  presence.fullName = profile.full_name || presence.fullName;
                  presence.username = profile.username || presence.username;
                  presence.avatarUrl = profile.avatar_url || presence.avatarUrl;
                }
              })
            );
          }
          
          presenceParticipants.push({
            oduserId,
            odusername: presence.username || 'unknown',
            fullName: presence.fullName || 'Unknown User',
            avatarUrl: presence.avatarUrl,
            cursorColor: presence.cursorColor || '#10B981',
            isHost: presence.isHost || false,
            isInCall: presence.isInCall || false,
            isTyping: presence.isTyping || false,
          });
        }
      });
      
      // Wait for profile fetches, then update participants
      if (profilePromises.length > 0) {
        await Promise.all(profilePromises);
        // Rebuild participants list with updated data
        const updatedParticipants: Participant[] = [];
        Object.entries(state).forEach(([oduserId, presences]: [string, any]) => {
          const presence = presences[0];
          if (presence) {
            updatedParticipants.push({
              oduserId,
              odusername: presence.username || 'unknown',
              fullName: presence.fullName || 'Unknown User',
              avatarUrl: presence.avatarUrl,
              cursorColor: presence.cursorColor || '#10B981',
              isHost: presence.isHost || false,
              isInCall: presence.isInCall || false,
              isTyping: presence.isTyping || false,
            });
          }
        });
        setParticipants(updatedParticipants);
      } else {
        setParticipants(presenceParticipants);
      }
      
      console.log('[Presence] Participants:', presenceParticipants.length);
      
      console.log('[Presence] Not in call or no local stream, skipping auto-connect. isInCall:', isInCallRef.current, 'hasStream:', !!localStreamRef.current);
    });

    // Presence join
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('[Presence] User joined:', key, newPresences);
      toast.success(`${newPresences[0]?.fullName || 'Someone'} joined the session`);
    });

    // Presence leave
    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('[Presence] User left:', key);
      toast.info(`${leftPresences[0]?.fullName || 'Someone'} left the session`);
      // Only destroy peer if they were in a call (they'll have sent user_left_call event)
      // Don't destroy on presence leave alone, as they might just be refreshing
    });

    // Code sync via broadcast
    channel.on('broadcast', { event: 'code_sync' }, ({ payload }) => {
      console.log('[Broadcast] Code sync from:', payload.userId);
      if (payload.userId !== user.id) {
        isRemoteUpdate.current = true;
        setCode(payload.code);
        if (payload.language) {
          setLanguage(payload.language);
        }
        setTimeout(() => { isRemoteUpdate.current = false; }, 100);
      }
    });

    // Language change
    channel.on('broadcast', { event: 'language_change' }, ({ payload }) => {
      console.log('[Broadcast] Language change from:', payload.userId);
      if (payload.userId !== user.id) {
        setLanguage(payload.language);
        // Also update code to the default snippet for the new language
        if (payload.newCode) {
          isRemoteUpdate.current = true;
          setCode(payload.newCode);
          setTimeout(() => { isRemoteUpdate.current = false; }, 100);
        }
        const langLabel = LANGUAGES.find(l => l.value === payload.language)?.label;
        toast.info(`Language changed to ${langLabel}`);
      }
    });

    // Chat messages
    channel.on('broadcast', { event: 'chat_message' }, ({ payload }) => {
      console.log('[Broadcast] Chat message from:', payload.userId);
      setChatMessages(prev => [...prev, {
        id: payload.id,
        oduserId: payload.userId,
        odusername: payload.username,
        fullName: payload.fullName,
        avatarUrl: payload.avatarUrl,
        message: payload.message,
        timestamp: new Date(payload.timestamp),
      }]);
      // Increment unread count if not on chat tab
      setUnreadMessages(prev => prev + 1);
    });

    // Typing indicator
    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.userId !== user.id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (payload.isTyping) {
            newSet.add(payload.userId);
      } else {
            newSet.delete(payload.userId);
          }
          return newSet;
        });
      }
    });

    // Code execution results (shared)
    channel.on('broadcast', { event: 'execution_result' }, ({ payload }) => {
      console.log('[Broadcast] Execution result from:', payload.userId);
      if (payload.userId !== user.id) {
        setOutput(payload.output);
        toast.info(`${payload.fullName} ran the code`);
      }
    });

    // Whiteboard elements sync
    channel.on('broadcast', { event: 'whiteboard_elements' }, ({ payload }) => {
      console.log('[Broadcast] Whiteboard elements from:', payload.userId);
      if (payload.userId !== user.id && payload.elements) {
        setWhiteboardElements(payload.elements);
      }
    });

    // Whiteboard collaborator cursor
    channel.on('broadcast', { event: 'whiteboard_cursor' }, ({ payload }) => {
      if (payload.userId !== user.id) {
        setWhiteboardCollaborators(prev => {
          const newMap = new Map(prev);
          if (payload.pointer === null) {
            // User stopped drawing, remove cursor after a delay
            const existing = newMap.get(payload.userId);
            if (existing) {
              newMap.set(payload.userId, { ...existing, isDrawing: false });
            }
          } else {
            newMap.set(payload.userId, {
              pointer: payload.pointer,
              username: payload.username,
              color: payload.color || '#f59e0b',
              isDrawing: payload.isDrawing || false,
            });
          }
          return newMap;
        });
      }
    });

    // Whiteboard clear
    channel.on('broadcast', { event: 'whiteboard_clear' }, ({ payload }) => {
      console.log('[Broadcast] Whiteboard cleared by:', payload.userId);
      if (payload.userId !== user.id) {
        setWhiteboardElements([]);
        toast.info(`${payload.fullName || 'Someone'} cleared the whiteboard`);
      }
    });

    channel.on('broadcast', { event: 'user_joined_call' }, async ({ payload }) => {
      if (payload.userId !== user.id) {
        toast.success(`${payload.fullName || 'Someone'} joined the call`);
      }
    });

    channel.on('broadcast', { event: 'user_left_call' }, ({ payload }) => {
      if (payload.userId !== user.id) {
        toast.info('A participant left the call');
      }
    });

    // Store channel ref before subscribing
    channelRef.current = channel;
    
    // Subscribe and track presence
    channel.subscribe(async (status) => {
      console.log('[Realtime] Channel status:', status);
      
      // Check if we're cleaning up
      if (isCleaningUpRef.current) {
        console.log('[Realtime] Cleanup in progress, ignoring status change');
        return;
      }
      
      if (status === 'SUBSCRIBED') {
        setRealtimeStatus('connected');
        
        // Track presence
        const presenceData = {
          oduserId: user.id,
          username: profile?.username || 'unknown',
          fullName: profile?.full_name || user.email?.split('@')[0] || 'User',
          avatarUrl: profile?.avatar_url,
          cursorColor: myCursorColor,
          isHost: sessionData?.host_user_id === user.id,
          isInCall: isInCallRef.current, // Use ref for current value
          isTyping: false,
          online_at: new Date().toISOString(),
        };
        
        console.log('[Presence] Tracking with data:', presenceData);
        const trackResult = await channel.track(presenceData);
        console.log('[Presence] Track result:', trackResult);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.log('[Realtime] Channel error/timeout:', status);
        setRealtimeStatus('disconnected');
        // Don't show error toast during cleanup
        if (!isCleaningUpRef.current) {
          toast.error('Connection lost. Attempting to reconnect...');
          // Try to reconnect after a delay
          setTimeout(async () => {
            if (!isCleaningUpRef.current && channelRef.current) {
              console.log('[Realtime] Attempting reconnect...');
              try {
                await supabase.removeChannel(channelRef.current);
                channelRef.current = null;
                // Re-setup if we have user info
                if (currentUserRef.current && currentUserProfileRef.current) {
                  await setupRealtimeChannel(currentUserRef.current, currentUserProfileRef.current, session);
                }
              } catch (err) {
                console.error('[Realtime] Reconnect failed:', err);
              }
            }
          }, 2000);
        }
      } else if (status === 'CLOSED') {
        console.log('[Realtime] Channel closed');
        setRealtimeStatus('disconnected');
      }
    });
  };

  // Safe broadcast helper - checks channel is connected
  const safeBroadcast = useCallback(async (event: string, payload: any) => {
    if (!channelRef.current) {
      console.warn('[Broadcast] No channel available for:', event);
      return false;
    }
    if (realtimeStatus !== 'connected') {
      console.warn('[Broadcast] Channel not connected, status:', realtimeStatus);
      return false;
    }
    try {
      await channelRef.current.send({
        type: 'broadcast',
        event,
        payload,
      });
      return true;
    } catch (err) {
      console.error('[Broadcast] Failed to send:', event, err);
      return false;
    }
  }, [realtimeStatus]);

  // Update presence when call status changes
  const updatePresence = useCallback(async (updates: Partial<{ isInCall: boolean; isTyping: boolean }>) => {
    if (channelRef.current && currentUser && currentUserProfile && realtimeStatus === 'connected') {
      const presenceData = {
        oduserId: currentUser.id,
        username: currentUserProfile?.username || 'unknown',
        fullName: currentUserProfile?.full_name || currentUser.email?.split('@')[0] || 'User',
        avatarUrl: currentUserProfile?.avatar_url,
        cursorColor: myCursorColor,
        isHost: session?.host_user_id === currentUser.id,
        isInCall: updates.isInCall ?? isInCallRef.current, // Use ref for current value
        isTyping: updates.isTyping ?? false,
        online_at: new Date().toISOString(),
      };
      
      console.log('[Presence] Updating presence:', presenceData);
      await channelRef.current.track(presenceData);
      console.log('[Presence] Presence updated successfully');
    } else {
      console.warn('[Presence] Cannot update presence - missing:', {
        channel: !!channelRef.current,
        user: !!currentUser,
        profile: !!currentUserProfile,
        status: realtimeStatus,
      });
    }
  }, [currentUser, currentUserProfile, myCursorColor, session, realtimeStatus]);

  // Sync peers with participants (deterministic initiator)
  // Mark Attendance
  const markAttendance = async () => {
    if (hasMarkedAttendance || isMarkingAttendance) return;
    setIsMarkingAttendance(true);

    try {
      const res = await fetch(`/api/study-pods/sessions/${sessionId}/join`, {
        method: 'POST',
      });

      if (res.ok) {
        setHasMarkedAttendance(true);
        toast.success('Attendance marked! You can now code and chat.');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to mark attendance');
      }
      } catch (error) {
      toast.error('Failed to mark attendance');
    } finally {
      setIsMarkingAttendance(false);
    }
  };

  // Code Editor with typing indicator
  const handleCodeChange = useCallback((value: string | undefined) => {
    if (isRemoteUpdate.current) return;
    const newCode = value || '';
    setCode(newCode);

    // Broadcast typing indicator
    safeBroadcast('typing', { userId: currentUser?.id, isTyping: true });

    // Clear typing after delay
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      safeBroadcast('typing', { userId: currentUser?.id, isTyping: false });
    }, 1000);

    // Broadcast code to others
    safeBroadcast('code_sync', { code: newCode, language, userId: currentUser?.id });

    // Save to DB (debounced)
    debouncedSave(newCode);
  }, [currentUser, language, safeBroadcast]);

  const debouncedSave = (codeToSave: string) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await supabase
        .from('study_pod_sessions')
        .update({ current_code: codeToSave, current_language: language })
        .eq('id', sessionId);
    }, 2000);
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    
    // Update code to the default snippet for the new language
    const newCode = DEFAULT_CODE[newLang] || '';
    setCode(newCode);
    
    // Broadcast both language and new code
    safeBroadcast('language_change', { 
      language: newLang, 
      newCode: newCode,
      userId: currentUser?.id 
    });

    // Save both language and code
    supabase
      .from('study_pod_sessions')
      .update({ current_language: newLang, current_code: newCode })
      .eq('id', sessionId);
  };

  // Run Code
  const runCode = async () => {
    if (!hasMarkedAttendance) {
      toast.error('Mark attendance first');
      return;
    }

    setIsExecuting(true);
    setOutput('⏳ Running...\n');

    try {
      const res = await fetch(`/api/study-pods/sessions/${sessionId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });

      const data = await res.json();
      let outputText = '';
      
      if (data.execution) {
        if (data.execution.error) {
          outputText = `❌ Error:\n${data.execution.error}`;
      } else {
          outputText = `✅ Output:\n${data.execution.output || '(no output)'}`;
        }
      } else {
        outputText = '❌ Execution failed';
      }

      setOutput(outputText);

      // Broadcast execution result
      safeBroadcast('execution_result', {
        output: outputText,
        userId: currentUser?.id,
        fullName: currentUserProfile?.full_name || 'User',
      });
    } catch {
      setOutput('❌ Network error - please try again');
    } finally {
      setIsExecuting(false);
    }
  };

  // Chat
  const sendMessage = () => {
    if (!chatInput.trim() || !hasMarkedAttendance) return;

    const msg = {
      id: crypto.randomUUID(),
      userId: currentUser?.id,
      username: currentUserProfile?.username || 'unknown',
      fullName: currentUserProfile?.full_name || 'User',
      avatarUrl: currentUserProfile?.avatar_url,
      message: chatInput.trim(),
      timestamp: new Date().toISOString(),
    };

    safeBroadcast('chat_message', msg);

    // Add to local state immediately
    setChatMessages(prev => [...prev, {
      ...msg,
      oduserId: msg.userId,
      odusername: msg.username,
      timestamp: new Date(msg.timestamp),
    }]);

    setChatInput('');
  };

  // Whiteboard Functions
  const handleWhiteboardChange = useCallback((elements: WhiteboardElement[]) => {
    if (!currentUser?.id || !hasMarkedAttendance) return;

    // Add userId to elements
    const elementsWithUser = elements.map(el => ({
      ...el,
      userId: el.userId || currentUser.id,
    }));

    // Debounce and broadcast changes
    const elementsJson = JSON.stringify(elementsWithUser);
    if (elementsJson === lastSentElementsRef.current) return;
    
    lastSentElementsRef.current = elementsJson;
    setWhiteboardElements(elementsWithUser);

    // Broadcast to others
    safeBroadcast('whiteboard_elements', {
      userId: currentUser.id,
      elements: elementsWithUser,
    });
  }, [currentUser?.id, hasMarkedAttendance, safeBroadcast]);

  const clearWhiteboard = useCallback(() => {
    if (!currentUser?.id || !hasMarkedAttendance) return;

    setWhiteboardElements([]);
    lastSentElementsRef.current = '[]';
    safeBroadcast('whiteboard_clear', {
      userId: currentUser.id,
      fullName: currentUserProfile?.full_name || 'Someone',
    });
    toast.success('Whiteboard cleared');
  }, [currentUser?.id, currentUserProfile?.full_name, hasMarkedAttendance, safeBroadcast]);

  // Broadcast cursor position for whiteboard collaboration
  const broadcastWhiteboardCursor = useCallback((point: { x: number; y: number } | null, isDrawing: boolean) => {
    if (!currentUser?.id || !hasMarkedAttendance) return;
    
    safeBroadcast('whiteboard_cursor', {
      userId: currentUser.id,
      username: currentUserProfile?.full_name || currentUserProfile?.username || 'User',
      pointer: point,
      isDrawing,
      color: '#f59e0b', // Could make this unique per user
    });
  }, [currentUser?.id, currentUserProfile?.full_name, currentUserProfile?.username, hasMarkedAttendance, safeBroadcast]);

  // Escape key handler for fullscreen video
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusedVideo) {
        setFocusedVideo(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedVideo]);

  // Video Call Functions
  const joinCall = async () => {
    if (!hasMarkedAttendance) {
      toast.error('Mark attendance first');
      return;
    }

    if (isConnectingCall || isInCall) {
      return;
    }

    try {
      setIsConnectingCall(true);
      remoteTrackRefs.current.clear();
      setRemoteTracks([]);
      setLocalScreenStream(null);

      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to join call' }));
        throw new Error(error.error || 'Failed to join LiveKit');
      }

      const { token, serverUrl } = await response.json();

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          videoEncoding: { maxBitrate: 1_200_000 },
        },
      });

      room
        .on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (!track) return;
          console.log('[LiveKit] Track subscribed:', track.kind, publication.source, participant.identity);
          if (track.kind === Track.Kind.Video) {
            const source = publication.source === Track.Source.ScreenShare ? 'screen' : 'camera';
            attachRemoteTrack(participant.identity, source, track);
          }
          if (track.kind === Track.Kind.Audio) {
            // Audio tracks are associated with camera (not screen share)
            attachRemoteTrack(participant.identity, 'audio', track);
          }
        })
        .on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
          if (!track) return;
          console.log('[LiveKit] Track unsubscribed:', track.kind, publication.source, participant.identity);
          if (track.kind === Track.Kind.Video) {
            const source = publication.source === Track.Source.ScreenShare ? 'screen' : 'camera';
            detachRemoteTrack(participant.identity, source, track);
          }
          if (track.kind === Track.Kind.Audio) {
            detachRemoteTrack(participant.identity, 'audio', track);
          }
        })
        .on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
          remoteTrackRefs.current.delete(participant.identity);
          refreshRemoteTracks();
        })
        .on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
          console.log('[LiveKit] Connection state:', state);
          if (state === ConnectionState.Disconnected) {
            remoteTrackRefs.current.clear();
            localCameraTrackRef.current = null;
            localMicTrackRef.current = null;
            refreshRemoteTracks();
            stopLocalAudioMonitor();
            localStreamRef.current = null;
            setLocalStream(null);
            setLocalVideoTrack(null);
            setLocalAudioTrack(null);
            setIsInCall(false);
          }
        })
        .on(RoomEvent.LocalTrackPublished, (publication) => {
          console.log('[LiveKit] Local track published:', publication.source, publication.track?.kind);
          if (publication.source === Track.Source.ScreenShare) {
            if (publication.track?.mediaStreamTrack) {
              setLocalScreenStream(new MediaStream([publication.track.mediaStreamTrack]));
            }
            setIsScreenSharing(true);
          }
          if (publication.source === Track.Source.Camera && publication.track?.mediaStreamTrack) {
            // Store camera track in ref and rebuild stream
            localCameraTrackRef.current = publication.track.mediaStreamTrack;
            console.log('[LiveKit] Stored camera track in ref');
            buildLocalStreamFromRefs();
          }
          if (publication.source === Track.Source.Microphone && publication.track?.mediaStreamTrack) {
            // Store mic track in ref and rebuild stream
            localMicTrackRef.current = publication.track.mediaStreamTrack;
            console.log('[LiveKit] Stored mic track in ref');
            buildLocalStreamFromRefs();
          }
        })
        .on(RoomEvent.LocalTrackUnpublished, (publication) => {
          if (publication.source === Track.Source.ScreenShare) {
            setIsScreenSharing(false);
            setLocalScreenStream(null);
          }
          if (publication.source === Track.Source.Camera) {
            localCameraTrackRef.current = null;
            console.log('[LiveKit] Cleared camera track from ref');
            buildLocalStreamFromRefs();
          }
          if (publication.source === Track.Source.Microphone) {
            localMicTrackRef.current = null;
            console.log('[LiveKit] Cleared mic track from ref');
            buildLocalStreamFromRefs();
          }
        });

      await room.connect(serverUrl, token);
      livekitRoomRef.current = room;

      await room.localParticipant.setMicrophoneEnabled(true);
      await room.localParticipant.setCameraEnabled(true);
      
      // Wait for tracks to be published - the LocalTrackPublished event will handle it
      // But also try to rebuild after a delay as fallback
      setTimeout(async () => {
        await rebuildLocalStreamFromRoom();
      }, 500);

      setIsInCall(true);
      setIsVideoEnabled(true);
      setIsAudioEnabled(true);
      setIsScreenSharing(false);

      await updatePresence({ isInCall: true });
      await safeBroadcast('user_joined_call', {
        userId: currentUser?.id,
        username: currentUserProfile?.username,
        fullName: currentUserProfile?.full_name,
        avatarUrl: currentUserProfile?.avatar_url,
      });

      toast.success('Joined video call');
    } catch (error: any) {
      console.error('[LiveKit] Failed to join call', error);
      toast.error(error.message || 'Could not join the call');
      if (livekitRoomRef.current) {
        livekitRoomRef.current.disconnect();
        livekitRoomRef.current = null;
      }
    } finally {
      setIsConnectingCall(false);
    }
  };

  const leaveCall = async () => {
    console.log('[Video] Leaving call...');
    
    stopLocalAudioMonitor();
    
      if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setLocalVideoTrack(null);
    setLocalAudioTrack(null);
    localCameraTrackRef.current = null;
    localMicTrackRef.current = null;

    const room = livekitRoomRef.current;
    if (room) {
      room.disconnect();
      livekitRoomRef.current = null;
    }

    remoteTrackRefs.current.clear();
    setRemoteTracks([]);
    setIsScreenSharing(false);
    setIsInCall(false);

    await updatePresence({ isInCall: false });
    await safeBroadcast('user_left_call', { userId: currentUser?.id });

    toast.success('Left video call');
  };

  const toggleVideo = async () => {
    const room = livekitRoomRef.current;
    if (!room) return;
    const nextEnabled = !isVideoEnabled;
    try {
      await room.localParticipant.setCameraEnabled(nextEnabled);
      setIsVideoEnabled(nextEnabled);
      await rebuildLocalStreamFromRoom();
    } catch (error) {
      console.error('[Video] Failed to toggle camera', error);
      toast.error('Unable to toggle camera');
    }
  };

  const toggleAudio = async () => {
    const room = livekitRoomRef.current;
    if (!room) return;
    const nextEnabled = !isAudioEnabled;
    try {
      await room.localParticipant.setMicrophoneEnabled(nextEnabled);
      setIsAudioEnabled(nextEnabled);
      await rebuildLocalStreamFromRoom();
    } catch (error) {
      console.error('[Video] Failed to toggle microphone', error);
      toast.error('Unable to toggle microphone');
    }
  };

  const toggleScreenShare = async () => {
    const room = livekitRoomRef.current;
    if (!room) return;
    try {
      const shouldEnable = !isScreenSharing;
      await room.localParticipant.setScreenShareEnabled(shouldEnable);
      if (!shouldEnable) {
        setLocalScreenStream(null);
      }
    } catch (error) {
      console.error('[Video] Failed to toggle screen share', error);
      toast.error('Unable to toggle screen share');
    }
  };

  // Debug function
  const debugConnections = () => {
    const room = livekitRoomRef.current;
    console.log('=== DEBUG INFO ===');
    console.log('Is in call:', isInCallRef.current);
    console.log('LiveKit state:', room?.state);
    console.log('Local stream:', localStreamRef.current?.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
    console.log('Remote tracks:', remoteTracks.map(rt => ({ id: rt.id, name: rt.fullName, hasVideo: !!rt.videoTrack, hasAudio: !!rt.audioTrack })));
    console.log('Participants:', participants.map(p => ({ userId: p.oduserId, name: p.fullName, inCall: p.isInCall })));
    console.log('==================');
  };

  // Retry connections to all participants in call
  const retryConnections = async () => {
    const room = livekitRoomRef.current;
    if (!room) {
      await joinCall();
      return;
    }

    toast.info('Reconnecting to LiveKit...');
    try {
      // Disconnect and reconnect
      await leaveCall();
      await new Promise(resolve => setTimeout(resolve, 500));
      await joinCall();
      toast.success('Reconnected successfully');
    } catch (error) {
      console.warn('[LiveKit] Reconnect failed', error);
      toast.error('Failed to reconnect');
    }
  };

  // Render Avatar
  const renderAvatar = (user: { avatarUrl?: string; fullName?: string; username?: string }, size: 'xs' | 'sm' | 'md' | 'lg' = 'md') => {
    const sizes = { 
      xs: 'h-5 w-5 text-[8px]', 
      sm: 'h-6 w-6 text-[9px]', 
      md: 'h-8 w-8 text-[10px]', 
      lg: 'h-10 w-10 text-xs' 
    };
    return (
      <Avatar className={cn(sizes[size], "ring-1 ring-zinc-800/50")}>
        {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
        <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold">
          {(user.fullName || user.username || 'U').slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    );
  };

  // Get typing users names
  const typingUsersNames = participants
    .filter(p => typingUsers.has(p.oduserId) && p.oduserId !== currentUser?.id)
    .map(p => p.fullName.split(' ')[0]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-[#09090b]">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full blur-xl opacity-30 animate-pulse" />
          <Loader2 className="w-12 h-12 animate-spin text-amber-500 relative" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-white">Loading Session</p>
          <p className="text-sm text-zinc-500">Connecting to live environment...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-[#0a0a0c] relative">
        {/* Animated Background Glows */}
        <div className="fixed inset-0 pointer-events-none z-0">
          {/* Floating orbs - Much more visible */}
          <div
            className="absolute top-[5%] right-[10%] w-[700px] h-[700px] rounded-full blur-[140px] animate-pulse-slow"
            style={{
              background: 'radial-gradient(circle, rgba(251, 146, 60, 0.15) 0%, rgba(251, 146, 60, 0.05) 50%, transparent 100%)'
            }}
          />
          <div
            className="absolute bottom-[15%] left-[5%] w-[600px] h-[600px] rounded-full blur-[120px] animate-float-slow"
            style={{
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, rgba(168, 85, 247, 0.04) 50%, transparent 100%)',
              animationDelay: '2s'
            }}
          />
          <div
            className="absolute top-[40%] right-[35%] w-[500px] h-[500px] rounded-full blur-[100px] animate-float"
            style={{
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.03) 50%, transparent 100%)',
              animationDelay: '4s'
            }}
          />
        </div>

      {/* Premium Header */}
        <header className="relative h-16 px-6 flex items-center justify-between border-b border-zinc-800/40 bg-gradient-to-r from-[#0a0a0c]/80 via-[#0f0f12]/80 to-[#0a0a0c]/80 backdrop-blur-xl z-10">
          {/* Glow effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-brand/0 via-brand/5 to-brand/0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

          {/* Left - Back + Session Info */}
          <div className="flex items-center gap-4 relative z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/study-pods/${podId}`)}
              className="h-9 px-3 gap-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-800/80 text-zinc-300 hover:text-white border border-zinc-800/60 hover:border-zinc-700 backdrop-blur-sm transition-all hover:shadow-lg hover:shadow-brand/10 group"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span className="text-xs font-medium">Back to Pod</span>
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-semibold text-white tracking-tight">{session?.title || 'Live Session'}</h1>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Live</span>
              </div>
            </div>
          </div>

          {/* Center - Connection + Participants */}
          <div className="flex items-center gap-3 relative z-10">
            {/* Connection Status */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm border transition-all duration-300 shadow-lg",
              realtimeStatus === 'connected'
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10"
                : "bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/10"
            )}>
              {realtimeStatus === 'connected' ? (
                <Wifi className="h-3.5 w-3.5" />
              ) : (
                <WifiOff className="h-3.5 w-3.5" />
              )}
              <span className="capitalize">{realtimeStatus}</span>
            </div>

            {/* Participant Avatars */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-zinc-700/30 backdrop-blur-sm shadow-lg hover:border-zinc-700/50 transition-all">
              <div className="flex -space-x-2">
                {participants.slice(0, 5).map((p) => (
                  <Tooltip key={p.oduserId}>
                    <TooltipTrigger asChild>
                      <div className="relative cursor-pointer">
                        <Avatar className="h-7 w-7 border-2 border-[#0a0a0c] ring-1 ring-zinc-700/50 transition-transform hover:scale-110 hover:z-10">
                          {p.avatarUrl && <AvatarImage src={p.avatarUrl} />}
                          <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-[9px] font-bold">
                            {p.fullName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {p.isInCall && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#0a0a0c] animate-pulse" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      sideOffset={10}
                      className="bg-zinc-900/95 border border-zinc-700 shadow-2xl z-[9999] px-2.5 py-1.5 backdrop-blur-xl"
                    >
                      <p className="text-[11px] font-semibold text-white whitespace-nowrap">{p.fullName}</p>
                      <p className="text-[10px] text-zinc-400 whitespace-nowrap">@{p.odusername}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
              {participants.length > 5 && (
                <span className="text-xs text-zinc-300">+{participants.length - 5}</span>
              )}
              <span className="text-xs text-zinc-200 font-semibold">{participants.length} online</span>
            </div>
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-2 relative z-10">
            {/* Attendance */}
            <Button
              size="sm"
              onClick={markAttendance}
              disabled={hasMarkedAttendance || isMarkingAttendance}
              className={cn(
                "h-9 text-xs gap-2 font-medium rounded-lg px-4 transition-all duration-300",
                hasMarkedAttendance
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 cursor-default shadow-lg shadow-emerald-500/10"
                  : "bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:scale-105"
              )}
            >
              {isMarkingAttendance ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
               hasMarkedAttendance ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
              {hasMarkedAttendance ? 'Attended' : 'Attend'}
            </Button>

            <div className="h-6 w-px bg-zinc-700/50" />

            {/* Video Controls */}
            {!isInCall ? (
              <Button
                size="sm"
                onClick={joinCall}
                disabled={!hasMarkedAttendance || isConnectingCall}
                className="relative h-9 text-xs gap-2 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 hover:from-blue-600/30 hover:to-cyan-600/30 text-white rounded-lg font-medium px-4 border border-blue-500/30 hover:border-blue-400/40 backdrop-blur-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center gap-2">
                  {isConnectingCall ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Video className="h-3.5 w-3.5" />
                  )}
                  {isConnectingCall ? 'Joining...' : 'Join Call'}
                </div>
              </Button>
            ) : (
              <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-900/50 border border-zinc-700/30 backdrop-blur-sm shadow-lg">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      onClick={toggleAudio}
                      className={cn(
                        "h-7 w-7 rounded-md transition-all",
                        isAudioEnabled
                          ? "bg-transparent hover:bg-zinc-700/50 text-white"
                          : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      )}
                    >
                      {isAudioEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{isAudioEnabled ? 'Mute' : 'Unmute'}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      onClick={toggleVideo}
                      className={cn(
                        "h-7 w-7 rounded-md transition-all",
                        isVideoEnabled
                          ? "bg-transparent hover:bg-zinc-700/50 text-white"
                          : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      )}
                    >
                      {isVideoEnabled ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{isVideoEnabled ? 'Stop Video' : 'Start Video'}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      onClick={toggleScreenShare}
                      className={cn(
                        "h-7 w-7 rounded-md transition-all",
                        isScreenSharing
                          ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                          : "bg-transparent hover:bg-zinc-700/50 text-white"
                      )}
                    >
                      {isScreenSharing ? <MonitorOff className="h-3.5 w-3.5" /> : <MonitorUp className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{isScreenSharing ? 'Stop Share' : 'Share Screen'}</TooltipContent>
                </Tooltip>

                <div className="w-px h-5 bg-zinc-700/50 mx-0.5" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      onClick={retryConnections}
                      className="h-7 w-7 rounded-md bg-transparent hover:bg-amber-500/10 text-amber-400 transition-all"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Refresh</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      onClick={leaveCall}
                      className="h-7 w-7 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all"
                    >
                      <PhoneOff className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Leave</TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
      </header>

      {/* Main Content */}
        <div className="flex-1 overflow-hidden relative z-10">
          <PanelGroup direction="horizontal">
            {/* Sidebar - Redesigned for scalability */}
            <Panel defaultSize={20} minSize={16} maxSize={28}>
              <div className="h-full flex flex-col border-r border-zinc-800/30 bg-[#0a0a0c]/70 backdrop-blur-sm">
                {/* Video Grid - Always visible when in call */}
                {isInCall && (
                  <div className="p-2 border-b border-zinc-800/30">
                    <div className="grid grid-cols-2 gap-1.5">
                      {/* Local Video */}
            <div className={cn(
                        "relative aspect-video rounded-md overflow-hidden bg-zinc-900/80 ring-1 transition-all duration-150 group",
                        audioLevel > 15 && isAudioEnabled ? "ring-emerald-500/50 shadow-lg shadow-emerald-500/10" : "ring-zinc-800/50"
                      )}>
                        <video
                          ref={localVideoRef}
                          autoPlay
                          muted
                          playsInline
                          className={cn(
                            "w-full h-full object-cover",
                            !isVideoEnabled && "hidden"
                          )}
                          onLoadedMetadata={() => console.log('[LocalVideo] Metadata loaded')}
                          onPlay={() => console.log('[LocalVideo] Video playing')}
                          onError={(e) => console.error('[LocalVideo] Video error:', e)}
                        />
                        {!isVideoEnabled && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                            {renderAvatar({ avatarUrl: currentUserProfile?.avatar_url, fullName: currentUserProfile?.full_name }, 'md')}
                  </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-medium text-white/90">You</span>
                            <div className="flex items-center gap-1">
                              {isAudioEnabled ? (
                                <div className="flex items-center gap-0.5">
                                  <div className={cn("w-0.5 rounded-full bg-emerald-400 transition-all duration-75", audioLevel > 5 ? "h-1.5" : "h-0.5")} />
                                  <div className={cn("w-0.5 rounded-full bg-emerald-400 transition-all duration-75", audioLevel > 15 ? "h-2" : "h-0.5")} />
                                  <div className={cn("w-0.5 rounded-full bg-emerald-400 transition-all duration-75", audioLevel > 30 ? "h-1.5" : "h-0.5")} />
                        </div>
                              ) : (
                                <MicOff className="h-2 w-2 text-red-400" />
                        )}
                      </div>
                </div>
              </div>
                        {/* Maximize button */}
                        <button
                          onClick={() => setFocusedVideo({ type: 'local' })}
                          className="absolute top-1 left-1 p-0.5 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                        >
                          <Maximize2 className="h-2.5 w-2.5" />
                        </button>
                    </div>

                      {/* Local Screen Share */}
                      {localScreenStream && (
                        <div className="relative aspect-video rounded-md overflow-hidden bg-zinc-900/80 ring-1 ring-emerald-500/30 group">
                      <video
                            ref={localScreenVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                            <div className="flex items-center gap-1">
                              <span className="text-[8px] font-medium text-white/90">Screen</span>
                              <span className="text-[7px] text-emerald-400 font-bold">LIVE</span>
                        </div>
                      </div>
                          {/* Maximize button */}
                          <button
                            onClick={() => setFocusedVideo({ type: 'localScreen' })}
                            className="absolute top-1 left-1 p-0.5 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                          >
                            <Maximize2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      )}

                    {/* Remote Videos */}
                      {remoteTracks.map(rt => (
                        <RemoteVideoTile
                          key={rt.id}
                          id={rt.id}
                          videoTrack={rt.videoTrack}
                          audioTrack={rt.audioTrack}
                          fullName={rt.fullName}
                          kind={rt.kind}
                          participantId={rt.participantId}
                          onMaximize={() => setFocusedVideo({ type: 'remote', id: rt.id, fullName: rt.fullName })}
                        />
                      ))}

                      {/* Empty slots for visual consistency */}
                      {(1 + (localScreenStream ? 1 : 0) + remoteTracks.length) % 2 !== 0 && (
                        <div className="aspect-video rounded-md bg-zinc-900/40 ring-1 ring-zinc-800/30 flex items-center justify-center">
                          <Video className="h-4 w-4 text-zinc-700" />
                        </div>
                      )}
                    </div>
                          </div>
                        )}

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
                  <TabsList className="w-full justify-start rounded-none border-b border-zinc-800/30 bg-transparent px-2 h-9 gap-0.5 shrink-0">
                    <TabsTrigger
                      value="participants"
                      className="text-xs gap-1.5 font-medium px-3 h-7 rounded-lg data-[state=active]:bg-zinc-800/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-brand/10 text-zinc-500 transition-all hover:bg-zinc-800/40"
                    >
                      <PeopleIcon className="h-3.5 w-3.5" />
                      People
                      <span className="text-zinc-600 ml-0.5">({participants.length})</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="chat"
                      className="text-xs gap-1.5 font-medium px-3 h-7 rounded-lg data-[state=active]:bg-zinc-800/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-brand/10 text-zinc-500 relative transition-all hover:bg-zinc-800/40"
                    >
                      <ChatIcon className="h-3.5 w-3.5" />
                      Chat
                      {unreadMessages > 0 && activeTab !== 'chat' && (
                        <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-[9px] font-bold text-black flex items-center justify-center shadow-lg shadow-amber-500/30 animate-pulse">
                          {unreadMessages > 99 ? '99+' : unreadMessages}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="participants" className="flex-1 m-0 overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="p-3 space-y-2">
                        {participants.map(p => (
                          <div
                            key={p.oduserId}
                            className="relative flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800/60 transition-all duration-200 group border border-zinc-800/30 hover:border-zinc-700/50 hover:shadow-xl hover:shadow-brand/10 cursor-pointer backdrop-blur-sm"
                            onClick={() => window.open(`/profile/${p.odusername}`, '_blank')}
                          >
                            <div className="relative shrink-0">
                              {renderAvatar({ avatarUrl: p.avatarUrl, fullName: p.fullName, username: p.odusername }, 'md')}
                              <span className={cn(
                                "absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#0a0a0c] transition-all",
                                p.isInCall ? "bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse" : "bg-zinc-600"
                              )} />
                            </div>
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5 mb-0.5 overflow-hidden">
                                <span className="truncate">{p.fullName}</span>
                                {p.oduserId === currentUser?.id && <span className="text-zinc-500 font-normal flex-shrink-0">(you)</span>}
                                {p.isHost && <Crown className="h-3 w-3 text-amber-400 flex-shrink-0" />}
                              </p>
                              <p className="text-[10px] text-zinc-500 flex items-center gap-1.5 overflow-hidden">
                                <span className="truncate">@{p.odusername}</span>
                                {p.isTyping && (
                                  <span className="text-blue-400 flex items-center gap-1 animate-pulse flex-shrink-0">
                                    <Code2 className="h-2.5 w-2.5" />
                                    typing
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {p.isInCall && (
                                <div className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                                  <Video className="h-3 w-3 text-emerald-400" />
                                </div>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="p-1.5 rounded-md bg-brand/20 border border-brand/30 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand/30">
                                    <ArrowUpRight className="h-3 w-3 text-brand" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="bg-zinc-800 border-brand/30 shadow-lg shadow-brand/20">
                                  <p className="text-xs font-medium text-white">View profile</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        ))}

                        {participants.length === 0 && (
                          <div className="text-center py-8 text-zinc-600">
                            <PeopleIcon className="h-6 w-6 mx-auto mb-2 opacity-40" />
                            <p className="text-[10px]">No one here yet</p>
                  </div>
                        )}
                </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="chat" className="flex-1 m-0 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1" ref={chatScrollRef}>
                      <div className="p-2 space-y-2">
                        {chatMessages.length === 0 ? (
                          <div className="text-center py-8 text-zinc-600">
                            <ChatIcon className="h-6 w-6 mx-auto mb-2 opacity-40" />
                            <p className="text-[10px]">No messages yet</p>
                            <p className="text-[9px] text-zinc-700 mt-1">Start the conversation!</p>
                          </div>
                        ) : (
                          chatMessages.map(msg => (
                            <div key={msg.id} className="flex gap-1.5 group">
                              <div className="shrink-0 mt-0.5">
                                {renderAvatar({ avatarUrl: msg.avatarUrl, fullName: msg.fullName, username: msg.odusername }, 'xs')}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-[10px] font-medium text-zinc-300">{msg.fullName}</span>
                                  <span className="text-[8px] text-zinc-700">
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-[10px] text-zinc-400 break-words leading-relaxed">{msg.message}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                    <div className="p-1.5 border-t border-zinc-800/30 bg-zinc-900/30">
                      <div className="flex gap-1">
                        <Input
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && sendMessage()}
                          placeholder={hasMarkedAttendance ? "Message..." : "Mark attendance first"}
                          disabled={!hasMarkedAttendance}
                          className="h-7 text-[10px] bg-zinc-900/50 border-zinc-800/50 focus:border-amber-500/30 placeholder:text-zinc-700 rounded"
                        />
                        <Button 
                          size="icon" 
                          onClick={sendMessage} 
                          disabled={!chatInput.trim() || !hasMarkedAttendance} 
                          className="h-7 w-7 shrink-0 bg-amber-500 hover:bg-amber-600 text-black rounded"
                        >
                          <Send className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </Panel>

            <PanelResizeHandle className="w-0.5 bg-zinc-800/20 hover:bg-amber-500/50 transition-colors" />

            {/* Main Content Area */}
            <Panel defaultSize={80}>
              <div className="h-full flex flex-col bg-[#0d0d0f]">
                {/* View Mode Toggle Bar */}
                <div className="h-11 flex items-center justify-between px-4 bg-[#111113] border-b border-zinc-800/30">
                  <div className="flex items-center gap-3">
                    {/* View Mode Tabs */}
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-900/50 border border-zinc-700/30 backdrop-blur-sm shadow-lg">
                      <button
                        onClick={() => setViewMode('code')}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                          viewMode === 'code'
                            ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 shadow-lg shadow-amber-500/10"
                            : "text-zinc-500 hover:text-white hover:bg-zinc-700/50"
                        )}
                      >
                        <Code2 className="h-3.5 w-3.5" />
                        Code
                      </button>
                      <button
                        onClick={() => setViewMode('whiteboard')}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                          viewMode === 'whiteboard'
                            ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 shadow-lg shadow-purple-500/10"
                            : "text-zinc-500 hover:text-white hover:bg-zinc-700/50"
                        )}
                      >
                        <WhiteboardIcon className="h-3.5 w-3.5" />
                        Board
                      </button>
                      <button
                        onClick={() => setViewMode('cameras')}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium transition-all",
                          viewMode === 'cameras' 
                            ? "bg-blue-500/20 text-blue-400" 
                            : "text-zinc-500 hover:text-white hover:bg-zinc-700/50"
                        )}
                      >
                        <Grid3X3 className="h-3 w-3" />
                        Cameras
                      </button>
                    </div>

                    {/* Context-specific controls */}
                    {viewMode === 'code' && (
                      <>
                        <div className="w-px h-4 bg-zinc-800/50" />
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800/50 border border-zinc-700/30">
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            language === 'python' ? "bg-blue-400" :
                            language === 'javascript' ? "bg-yellow-400" :
                            language === 'java' ? "bg-orange-400" :
                            language === 'cpp' ? "bg-purple-400" :
                            language === 'go' ? "bg-cyan-400" :
                            "bg-zinc-400"
                          )} />
                          <span className="text-[10px] text-zinc-300 font-medium">
                            main.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'cpp' ? 'cpp' : language}
                          </span>
                        </div>
                        <Select value={language} onValueChange={handleLanguageChange} disabled={!hasMarkedAttendance}>
                          <SelectTrigger className="w-[110px] h-8 text-xs bg-zinc-800/30 border-zinc-700/30 focus:ring-2 focus:ring-amber-500/30 rounded-lg hover:bg-zinc-800/50 transition-all shadow-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#111113] border-zinc-700/50 shadow-2xl">
                            {LANGUAGES.map(l => (
                              <SelectItem key={l.value} value={l.value} className="text-xs hover:bg-zinc-800/50 transition-colors">
                                {l.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {typingUsersNames.length > 0 && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                            <div className="flex gap-0.5">
                              <span className="h-1 w-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="h-1 w-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="h-1 w-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-[9px] text-blue-400 font-medium">
                              {typingUsersNames.length === 1 ? `${typingUsersNames[0]} typing` : `${typingUsersNames.length} typing`}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {viewMode === 'whiteboard' && (
                      <>
                        <div className="w-px h-4 bg-zinc-800/50" />
                        {/* Whiteboard has built-in toolbar - no external controls needed */}
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                          <WhiteboardIcon className="h-3 w-3" />
                          <span>Shapes, arrows, text &amp; more in canvas toolbar</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right side controls */}
                  <div className="flex items-center gap-0.5">
                    {viewMode === 'code' && (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                    <Button
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleLanguageChange(language)} 
                              className="h-6 w-6 text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded"
                              disabled={!hasMarkedAttendance}
                            >
                              <RotateCcw className="h-3 w-3" />
                    </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">Reset Code</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                    <Button
                              variant="ghost" 
                              size="icon" 
                              onClick={() => { 
                                navigator.clipboard.writeText(code); 
                                setCopiedCode(true); 
                                setTimeout(() => setCopiedCode(false), 2000); 
                              }} 
                              className="h-6 w-6 text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded"
                            >
                              {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">Copy Code</TooltipContent>
                        </Tooltip>

                        <div className="w-px h-4 bg-zinc-800/50 mx-1" />

                        <Button
                      size="sm"
                          onClick={runCode}
                          disabled={isExecuting || !hasMarkedAttendance}
                          className={cn(
                            "relative h-8 text-xs gap-2 font-semibold px-4 rounded-lg transition-all duration-300 border shadow-lg overflow-hidden group",
                            isExecuting
                              ? "bg-amber-500/40 text-amber-100 border-amber-500/40 shadow-amber-500/20 backdrop-blur-xl"
                              : "bg-gradient-to-r from-emerald-600/50 to-green-600/50 hover:from-emerald-600/60 hover:to-green-600/60 text-white border-emerald-500/30 hover:border-emerald-400/40 backdrop-blur-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-105"
                          )}
                        >
                          {!isExecuting && (
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          )}
                          <div className="relative flex items-center gap-2">
                            {isExecuting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Running</> : <><Play className="h-3.5 w-3.5 fill-current" />Run</>}
                          </div>
                    </Button>
                      </>
                    )}

                    {viewMode === 'whiteboard' && (
                    <Button
                      size="sm"
                        onClick={clearWhiteboard}
                        disabled={!hasMarkedAttendance || whiteboardElements.length === 0}
                        className="h-6 text-[10px] gap-1 font-medium px-2.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400"
                    >
                        <Trash2 className="h-3 w-3" />
                        Clear Board
                    </Button>
              )}
            </div>
                </div>

                {/* Content Area - Changes based on viewMode */}
                <div className="flex-1 overflow-hidden">
                  {viewMode === 'code' && (
            <PanelGroup direction="vertical">
              <Panel defaultSize={70} minSize={40}>
                <div className="h-full relative">
                  <Editor
                    height="100%"
                            language={LANGUAGES.find(l => l.value === language)?.monacoId || 'python'}
                    value={code}
                            onChange={handleCodeChange}
                            theme="vs-dark"
                    options={{
                              fontSize: 13,
                              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                      fontLigatures: true,
                              minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      automaticLayout: true,
                              padding: { top: 12, bottom: 12 },
                              readOnly: !hasMarkedAttendance,
                              lineNumbers: 'on',
                              lineNumbersMinChars: 3,
                              renderLineHighlight: 'line',
                      cursorBlinking: 'smooth',
                      cursorSmoothCaretAnimation: 'on',
                              smoothScrolling: true,
                              tabSize: 4,
                      bracketPairColorization: { enabled: true },
                              guides: { bracketPairs: true },
                              scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
                            }}
                            onMount={(editor) => { editorRef.current = editor; }}
                          />
                          {!hasMarkedAttendance && (
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                              <div className="text-center p-6 rounded-xl bg-zinc-900/80 border border-zinc-800/50">
                                <Zap className="h-8 w-8 text-amber-400 mx-auto mb-3" />
                                <p className="text-sm font-medium text-white mb-1">Mark Attendance to Edit</p>
                                <p className="text-xs text-zinc-500">Click "Attend" in the header to start coding</p>
                              </div>
                            </div>
                          )}
                </div>
              </Panel>

                      <PanelResizeHandle className="h-1 bg-zinc-800/30 hover:bg-amber-500/50 transition-colors" />

                      <Panel defaultSize={30} minSize={15}>
                        <div className="h-full flex flex-col bg-[#0d0d0f]">
                          <div className="h-8 flex items-center justify-between px-3 bg-[#111113] border-b border-zinc-800/30">
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                <span className="h-2 w-2 rounded-full bg-red-500/80" />
                                <span className="h-2 w-2 rounded-full bg-amber-500/80" />
                                <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
                  </div>
                              <div className="h-3 w-px bg-zinc-800/50" />
                              <TerminalIcon className="h-3 w-3 text-emerald-400" />
                              <span className="text-[10px] font-medium text-zinc-400">Output</span>
                              {isExecuting && (
                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10">
                                  <Loader2 className="h-2.5 w-2.5 animate-spin text-amber-400" />
                                  <span className="text-[9px] text-amber-400">Running...</span>
                                </div>
                              )}
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setOutput('')} 
                              className="h-5 px-2 text-[9px] text-zinc-600 hover:text-white hover:bg-zinc-800/50 rounded"
                            >
                              Clear
                            </Button>
                          </div>
                          <ScrollArea className="flex-1 bg-[#0d0d0f]">
                            {output ? (
                              <div className="p-3">
                  <pre className={cn(
                                  "text-[11px] font-mono whitespace-pre-wrap leading-relaxed",
                                  output.includes('❌') || output.includes('Error') || output.includes('error') 
                                    ? 'text-red-400' 
                                    : output.includes('✅') || output.includes('Success') 
                                      ? 'text-emerald-400' 
                                      : 'text-zinc-300'
                                )}>
                                  {output}
                  </pre>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                                <div className="p-3 rounded-xl bg-zinc-800/30 mb-3">
                                  <TerminalIcon className="h-6 w-6 text-zinc-600" />
                                </div>
                                <p className="text-[11px] text-zinc-500 font-medium">Ready to execute</p>
                                <p className="text-[10px] text-zinc-700 mt-1">Click <span className="text-emerald-400 font-medium">Run</span> to see output here</p>
                              </div>
                            )}
                          </ScrollArea>
                </div>
              </Panel>
            </PanelGroup>
                  )}

                  {viewMode === 'whiteboard' && (
                    <div className="h-full">
                      <CollaborativeWhiteboard
                        key={`whiteboard-${sessionId}`}
                        elements={whiteboardElements}
                        onElementsChange={handleWhiteboardChange}
                        isEnabled={hasMarkedAttendance}
                        collaborators={whiteboardCollaborators}
                        onClear={clearWhiteboard}
                        onCursorMove={broadcastWhiteboardCursor}
                        currentUserId={currentUser?.id}
                      />
                    </div>
                  )}

                  {viewMode === 'cameras' && (
                    <div className="h-full p-4 overflow-auto">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-fr">
                        {/* Local Video - Large */}
                        {isInCall && (
                          <div className={cn(
                            "relative aspect-video rounded-xl overflow-hidden bg-zinc-900 ring-2 transition-all duration-150 group",
                            audioLevel > 15 && isAudioEnabled ? "ring-emerald-500/50 shadow-lg shadow-emerald-500/10" : "ring-zinc-800/50"
                          )}>
                            <video
                              ref={camerasViewVideoRef}
                              autoPlay
                              muted
                              playsInline
                              className={cn("w-full h-full object-cover", !isVideoEnabled && "hidden")}
                            />
                            {!isVideoEnabled && (
                              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                                {renderAvatar({ avatarUrl: currentUserProfile?.avatar_url, fullName: currentUserProfile?.full_name }, 'lg')}
                              </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-white">You</span>
                                <div className="flex items-center gap-2">
                                  {isAudioEnabled ? (
                                    <div className="flex items-center gap-0.5">
                                      <div className={cn("w-1 rounded-full bg-emerald-400 transition-all", audioLevel > 5 ? "h-2" : "h-1")} />
                                      <div className={cn("w-1 rounded-full bg-emerald-400 transition-all", audioLevel > 15 ? "h-3" : "h-1")} />
                                      <div className={cn("w-1 rounded-full bg-emerald-400 transition-all", audioLevel > 30 ? "h-2" : "h-1")} />
                                    </div>
                                  ) : (
                                    <MicOff className="h-4 w-4 text-red-400" />
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => setFocusedVideo({ type: 'local' })}
                              className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                            >
                              <Maximize2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}

                        {/* Local Screen Share */}
                        {localScreenStream && (
                          <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-900 ring-2 ring-emerald-500/30 group">
                            <video
                              ref={localScreenVideoRef}
                              autoPlay
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white">Your Screen</span>
                                <span className="text-[10px] text-emerald-400 font-bold">LIVE</span>
                              </div>
                            </div>
                            <button
                              onClick={() => setFocusedVideo({ type: 'localScreen' })}
                              className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                            >
                              <Maximize2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}

                        {/* Remote Tracks */}
                        {remoteTracks.map(rt => (
                          <div key={rt.id} className="relative aspect-video">
                            <RemoteVideoTile
                              {...rt}
                              onMaximize={() => setFocusedVideo({ type: 'remote', id: rt.id, fullName: rt.fullName })}
                            />
                          </div>
                        ))}

                        {/* Empty state for cameras view */}
                        {!isInCall && remoteTracks.length === 0 && (
                          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                            <div className="p-4 rounded-2xl bg-zinc-800/30 mb-4">
                              <Video className="h-10 w-10 text-zinc-600" />
                            </div>
                            <p className="text-lg font-medium text-zinc-400 mb-2">No Active Cameras</p>
                            <p className="text-sm text-zinc-600 max-w-sm">
                              Join the video call to see participants. Click "Join Call" in the header after marking attendance.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
          </Panel>
        </PanelGroup>
      </div>

        {/* Fullscreen Video Modal */}
        {focusedVideo && (
          <FullscreenVideoModal
            focusedVideo={focusedVideo}
            onClose={() => setFocusedVideo(null)}
            localStream={localStream}
            localScreenStream={localScreenStream}
            remoteTracks={remoteTracks}
            isVideoEnabled={isVideoEnabled}
            isAudioEnabled={isAudioEnabled}
            audioLevel={audioLevel}
            currentUserProfile={currentUserProfile}
          />
        )}
    </div>
    </TooltipProvider>
  );
}
