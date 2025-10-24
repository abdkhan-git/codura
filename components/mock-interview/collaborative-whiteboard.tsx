'use client'

import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface CollaborativeWhiteboardProps {
  onDrawingChange?: (imageData: string) => void
  sendDataMessage?: (message: any) => void
  initialPosition?: { x: number; y: number }
  initialSize?: { width: number; height: number }
}

export interface CollaborativeWhiteboardHandle {
  applyRemoteDrawing: (imageData: string) => void
  clear: () => void
}

type DrawingTool = 'pen' | 'eraser'

export const CollaborativeWhiteboard = forwardRef<CollaborativeWhiteboardHandle, CollaborativeWhiteboardProps>(({
  onDrawingChange,
  sendDataMessage,
  initialPosition = { x: 100, y: 100 },
  initialSize = { width: 600, height: 400 },
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Drawing states
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState<DrawingTool>('pen')
  const [color, setColor] = useState('#ffffff')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [isTransparent, setIsTransparent] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  // Position and size states
  const [position, setPosition] = useState(initialPosition)
  const [size, setSize] = useState(initialSize)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })

  const lastPositionRef = useRef({ x: 0, y: 0 })
  const isRemoteDrawingRef = useRef(false)

  // Colors palette
  const colors = [
    '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff'
  ]

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = size.width - 16 // Account for padding
    canvas.height = size.height - 100 // Account for toolbar height

    // Fill with background (transparent if enabled, dark otherwise)
    if (!isTransparent) {
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [size, isTransparent])

  // Resize canvas when size changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) return

    // Save current canvas content
    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height
    tempCtx.drawImage(canvas, 0, 0)

    // Resize main canvas
    canvas.width = size.width - 16
    canvas.height = size.height - 100

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Restore background (transparent if enabled, dark otherwise)
    if (!isTransparent) {
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    // Restore previous content
    ctx.drawImage(tempCanvas, 0, 0)
  }, [size.width, size.height, isTransparent])

  // Update canvas background when transparency changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Save current drawing
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // Clear and set new background
    if (!isTransparent) {
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    // Restore drawing
    ctx.putImageData(imageData, 0, 0)
  }, [isTransparent])

  // Get canvas coordinates from mouse event
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  // Start drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e)
    lastPositionRef.current = coords
    setIsDrawing(true)
  }

  // Draw on canvas
  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    const coords = getCanvasCoordinates(e)

    ctx.beginPath()
    ctx.moveTo(lastPositionRef.current.x, lastPositionRef.current.y)
    ctx.lineTo(coords.x, coords.y)

    if (tool === 'pen') {
      ctx.strokeStyle = color
      ctx.lineWidth = strokeWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    } else {
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = strokeWidth * 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }

    ctx.stroke()
    lastPositionRef.current = coords

    // Send drawing data to remote peer
    if (!isRemoteDrawingRef.current && sendDataMessage) {
      const imageData = canvas.toDataURL()
      sendDataMessage({
        type: 'whiteboard-draw',
        imageData,
      })
    }
  }, [isDrawing, tool, color, strokeWidth, sendDataMessage])

  // Stop drawing
  const stopDrawing = () => {
    setIsDrawing(false)

    // Notify about drawing change
    if (canvasRef.current && onDrawingChange) {
      const imageData = canvasRef.current.toDataURL()
      onDrawingChange(imageData)
    }
  }

  // Clear canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    // Clear based on transparency mode
    if (!isTransparent) {
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    if (sendDataMessage) {
      sendDataMessage({
        type: 'whiteboard-clear',
      })
    }
  }

  // Download canvas as image
  const downloadCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `whiteboard-${Date.now()}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  // Apply remote drawing
  const applyRemoteDrawing = useCallback((imageData: string) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    isRemoteDrawingRef.current = true
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      isRemoteDrawingRef.current = false
    }
    img.src = imageData
  }, [])

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    applyRemoteDrawing,
    clear: clearCanvas,
  }), [applyRemoteDrawing])

  // Handle dragging
  const handleDragStart = (e: React.MouseEvent) => {
    if (isResizing) return
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  const handleDrag = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    })
  }, [isDragging, dragOffset])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Handle resizing
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsResizing(true)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    })
  }

  const handleResize = useCallback((e: MouseEvent) => {
    if (!isResizing) return

    const deltaX = e.clientX - resizeStart.x
    const deltaY = e.clientY - resizeStart.y

    setSize({
      width: Math.max(400, resizeStart.width + deltaX),
      height: Math.max(300, resizeStart.height + deltaY),
    })
  }, [isResizing, resizeStart])

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false)
  }, [])

  // Add mouse event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag)
      window.addEventListener('mouseup', handleDragEnd)
    }
    return () => {
      window.removeEventListener('mousemove', handleDrag)
      window.removeEventListener('mouseup', handleDragEnd)
    }
  }, [isDragging, handleDrag, handleDragEnd])

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResize)
      window.addEventListener('mouseup', handleResizeEnd)
    }
    return () => {
      window.removeEventListener('mousemove', handleResize)
      window.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [isResizing, handleResize, handleResizeEnd])

  if (isMinimized) {
    return (
      <div
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 100,
        }}
        className="bg-background border-2 border-black rounded-lg shadow-2xl"
      >
        <div
          className="flex items-center justify-center p-2 cursor-move bg-muted/50 relative"
          onMouseDown={handleDragStart}
        >
          <span className="text-sm font-medium">Whiteboard</span>
          {/* Expand button in corner */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsMinimized(false)
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center hover:bg-muted/80 rounded transition-colors border border-black"
            title="Expand"
          >
            <span className="text-[10px] font-bold">□</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: 100,
      }}
      className={cn(
        'flex flex-col rounded-lg shadow-2xl overflow-hidden border-2 border-black',
        isTransparent ? 'bg-transparent' : 'bg-background'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-center p-2 cursor-move border-b border-black relative',
          isTransparent ? 'bg-muted/70 backdrop-blur-md' : 'bg-muted/50'
        )}
        onMouseDown={handleDragStart}
      >
        <span className="text-sm font-medium">Whiteboard (Drag to move)</span>
        {/* Minimize button in corner */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsMinimized(true)
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center hover:bg-muted/80 rounded transition-colors"
          title="Minimize"
        >
          <span className="text-xs font-bold">_</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className={cn(
        'p-2 border-b border-black',
        isTransparent ? 'bg-muted/70 backdrop-blur-md' : 'bg-muted/30'
      )}>
        <div className="flex items-center gap-1 flex-wrap">
          {/* Tools */}
          <Button
            variant={tool === 'pen' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTool('pen')}
          >
            Pen
          </Button>
          <Button
            variant={tool === 'eraser' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTool('eraser')}
          >
            Eraser
          </Button>

          {/* Color Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <div
                  className="w-4 h-4 rounded border border-black"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs">Color</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Select Color</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-2 grid grid-cols-5 gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      'w-8 h-8 rounded border-2 transition-all hover:scale-110',
                      color === c ? 'border-primary ring-2 ring-primary' : 'border-border'
                    )}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Width Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <span className="text-xs">Width: {strokeWidth}px</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Stroke Width</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-3 space-y-2">
                <Slider
                  value={[strokeWidth]}
                  onValueChange={(value) => setStrokeWidth(value[0])}
                  min={1}
                  max={20}
                  step={1}
                  className="w-full"
                />
                <div className="text-center text-xs text-muted-foreground">
                  {strokeWidth}px
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={clearCanvas}
          >
            Clear
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadCanvas}
          >
            Save
          </Button>

          {/* Transparent Toggle */}
          <Button
            variant={isTransparent ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsTransparent(!isTransparent)}
            title={isTransparent ? 'Opaque mode' : 'Transparent mode'}
          >
            Transparent
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className={cn(
        'flex-1 p-2 overflow-hidden',
        isTransparent && 'bg-transparent'
      )}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="rounded cursor-crosshair w-full h-full border border-black"
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeStart}
        className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize hover:bg-primary/20 transition-colors flex items-center justify-center"
      >
        <span className="text-xs text-muted-foreground">⤡</span>
      </div>
    </div>
  )
})

CollaborativeWhiteboard.displayName = 'CollaborativeWhiteboard'

export default CollaborativeWhiteboard
