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

// ImageCapture API type declaration
declare global {
  class ImageCapture {
    constructor(track: MediaStreamTrack)
    grabFrame(): Promise<ImageBitmap>
  }
}

interface CollaborativeWhiteboardProps {
  onDrawingChange?: (imageData: string) => void
  sendDataMessage?: (message: any) => void
  initialPosition?: { x: number; y: number }
  initialSize?: { width: number; height: number }
}

export interface CollaborativeWhiteboardHandle {
  applyRemoteDrawing: (imageData: string) => void
  applyRemoteStroke: (strokeData: StrokeData) => void
  clear: (options?: { broadcast?: boolean }) => void
  applyRemoteSettings: (settings: WhiteboardSettingsUpdate) => void
}

interface StrokeData {
  tool: DrawingTool
  color: string
  strokeWidth: number
  fromX: number
  fromY: number
  toX: number
  toY: number
}

type DrawingTool = 'pen' | 'eraser'
type WhiteboardSettingsUpdate = {
  isTransparent?: boolean
  position?: { x: number; y: number }
  size?: { width: number; height: number }
}

export const CollaborativeWhiteboard = forwardRef<CollaborativeWhiteboardHandle, CollaborativeWhiteboardProps>(({
  onDrawingChange,
  sendDataMessage,
  initialPosition = { x: 100, y: 100 },
  initialSize = { width: 600, height: 400 },
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Drawing states
  // @ts-ignore - Keep for potential future UI feedback
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
  const isApplyingRemoteStrokeRef = useRef(false)
  const isDrawingRef = useRef(false)

  const broadcastSettings = useCallback((overrides?: WhiteboardSettingsUpdate) => {
    if (!sendDataMessage) return

    // Only broadcast position/size when transparent mode is active
    const finalTransparent = overrides?.isTransparent ?? isTransparent

    const payload: WhiteboardSettingsUpdate = {
      isTransparent: finalTransparent,
      // Only include position and size if transparent
      ...(finalTransparent && {
        position: overrides?.position ?? position,
        size: overrides?.size ?? size,
      }),
    }

    sendDataMessage({
      type: 'whiteboard-settings',
      settings: payload,
    })
  }, [sendDataMessage, isTransparent, position, size])

  const handleTransparentToggle = useCallback(() => {
    const nextTransparent = !isTransparent
    setIsTransparent(nextTransparent)
    broadcastSettings({ isTransparent: nextTransparent })
  }, [isTransparent, broadcastSettings])

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

    console.log('[Whiteboard] Initializing canvas')

    // Set canvas size
    canvas.width = size.width - 16 // Account for padding
    canvas.height = size.height - 100 // Account for toolbar height

    // Reset canvas context to default state
    ctx.globalCompositeOperation = 'source-over'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

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

    // Reset canvas context to default state after resize
    ctx.globalCompositeOperation = 'source-over'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

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

    // Reset canvas context to default state
    ctx.globalCompositeOperation = 'source-over'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

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
    isDrawingRef.current = true
    setIsDrawing(true)
    console.log('[Whiteboard] Started drawing at', coords, 'isDrawingRef:', isDrawingRef.current)
  }

  // Draw stroke helper function
  const drawStroke = useCallback((fromX: number, fromY: number, toX: number, toY: number, drawTool: DrawingTool, drawColor: string, drawWidth: number) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) {
      console.warn('[Whiteboard] Cannot draw - canvas or context not available')
      return
    }

    // Always ensure we start with the correct composite operation
    ctx.globalCompositeOperation = 'source-over'

    ctx.beginPath()
    ctx.moveTo(fromX, fromY)
    ctx.lineTo(toX, toY)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (drawTool === 'pen') {
      ctx.strokeStyle = drawColor
      ctx.lineWidth = drawWidth
    } else {
      // Eraser: if board is opaque simply paint with background color,
      // otherwise punch holes via destination-out.
      if (isTransparent) {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.strokeStyle = 'rgba(0,0,0,1)'
      } else {
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = '#1a1a1a'
      }
      ctx.lineWidth = drawWidth * 3
    }

    ctx.stroke()

    // Always reset to source-over after drawing
    ctx.globalCompositeOperation = 'source-over'
  }, [isTransparent])

  // Draw on canvas
  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    console.log('[Whiteboard] draw() called, isDrawingRef:', isDrawingRef.current)

    if (!isDrawingRef.current) {
      return
    }

    const canvas = canvasRef.current
    if (!canvas) {
      console.warn('[Whiteboard] Cannot draw - canvas not available')
      return
    }

    const coords = getCanvasCoordinates(e)
    const fromX = lastPositionRef.current.x
    const fromY = lastPositionRef.current.y
    const toX = coords.x
    const toY = coords.y

    console.log('[Whiteboard] Drawing stroke from', {fromX, fromY}, 'to', {toX, toY})

    // Draw locally
    drawStroke(fromX, fromY, toX, toY, tool, color, strokeWidth)

    // Send stroke data to remote peer (only if this is not a remote stroke being applied)
    if (sendDataMessage) {
      sendDataMessage({
        type: 'whiteboard-stroke',
        strokeData: {
          tool,
          color,
          strokeWidth,
          fromX,
          fromY,
          toX,
          toY,
        },
      })
    }

    lastPositionRef.current = coords
  }, [tool, color, strokeWidth, sendDataMessage, drawStroke])

  // Stop drawing
  const stopDrawing = () => {
    console.log('[Whiteboard] Stopped drawing')
    isDrawingRef.current = false
    setIsDrawing(false)

    // Notify about drawing change
    if (canvasRef.current && onDrawingChange) {
      const imageData = canvasRef.current.toDataURL()
      onDrawingChange(imageData)
    }
  }

  // Clear canvas. Optionally skip broadcasting to avoid loops when responding to remote clears.
  const clearCanvas = useCallback((options?: { broadcast?: boolean }) => {
    const shouldBroadcast = options?.broadcast ?? true
    const canvas = canvasRef.current
    if (!canvas) return

    // Fully reset drawing references so next stroke starts fresh
    isDrawingRef.current = false
    setIsDrawing(false)
    lastPositionRef.current = { x: 0, y: 0 }

    // Reset intrinsic canvas size to flush any lingering context state
    const width = canvas.width
    const height = canvas.height
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    console.log('[Whiteboard] Clearing canvas')

    ctx.globalCompositeOperation = 'source-over'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (!isTransparent) {
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(0, 0, width, height)
    } else {
      ctx.clearRect(0, 0, width, height)
    }

    ctx.beginPath()

    if (shouldBroadcast && sendDataMessage) {
      console.log('[Whiteboard] Canvas cleared locally, broadcasting to peers')
      sendDataMessage({
        type: 'whiteboard-clear',
      })
    }
  }, [isTransparent, sendDataMessage])

  // Download canvas as image
  const downloadCanvas = useCallback(async () => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas) return

    const fileName = `whiteboard-${Date.now()}.png`

    // For opaque mode, just export the canvas directly
    if (!isTransparent) {
      console.log('[Whiteboard] Exporting opaque whiteboard')
      const link = document.createElement('a')
      link.download = fileName
      link.href = canvas.toDataURL('image/png')
      link.click()
      console.log('[Whiteboard] Download complete')
      return
    }

    // For transparent mode, use screen capture API
    console.log('[Whiteboard] Attempting to capture screen for transparent whiteboard...')

    try {
      // Request screen capture
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
        },
        audio: false,
      })

      const videoTrack = displayStream.getVideoTracks()[0]
      const imageCapture = new ImageCapture(videoTrack)

      // Capture a frame from the screen
      const bitmap = await imageCapture.grabFrame()

      // Stop the stream immediately
      displayStream.getTracks().forEach(track => track.stop())

      console.log('[Whiteboard] Screen captured:', bitmap.width, 'x', bitmap.height)

      // Get whiteboard position on screen
      const containerRect = container!.getBoundingClientRect()
      const canvasRect = canvas.getBoundingClientRect()

      console.log('[Whiteboard] Container position:', containerRect)
      console.log('[Whiteboard] Canvas position:', canvasRect)

      // Create a canvas to extract the whiteboard region from the screenshot
      const exportCanvas = document.createElement('canvas')
      exportCanvas.width = canvas.width
      exportCanvas.height = canvas.height
      const exportCtx = exportCanvas.getContext('2d')
      if (!exportCtx) return

      // Draw the captured screen region that corresponds to the whiteboard
      // Scale from screen coordinates to canvas coordinates
      const scaleX = bitmap.width / window.screen.width
      const scaleY = bitmap.height / window.screen.height

      const sourceX = canvasRect.left * scaleX
      const sourceY = canvasRect.top * scaleY
      const sourceWidth = canvasRect.width * scaleX
      const sourceHeight = canvasRect.height * scaleY

      console.log('[Whiteboard] Cropping region:', { sourceX, sourceY, sourceWidth, sourceHeight })

      exportCtx.drawImage(
        bitmap,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, canvas.width, canvas.height
      )

      // Now overlay the whiteboard drawing on top
      const drawingImage = new Image()
      await new Promise<void>((resolve, reject) => {
        drawingImage.onload = () => {
          exportCtx.drawImage(drawingImage, 0, 0, canvas.width, canvas.height)
          console.log('[Whiteboard] Drawing overlaid on screenshot')
          resolve()
        }
        drawingImage.onerror = reject
        drawingImage.src = canvas.toDataURL('image/png')
      })

      // Download the combined image
      const link = document.createElement('a')
      link.download = fileName
      link.href = exportCanvas.toDataURL('image/png')
      link.click()

      console.log('[Whiteboard] Transparent whiteboard with background saved!')
    } catch (error) {
      console.error('[Whiteboard] Screen capture failed:', error)
      console.log('[Whiteboard] Falling back to drawing-only export')

      // Fallback to just the drawing
      const link = document.createElement('a')
      link.download = fileName
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
  }, [isTransparent])

  const handleDownloadClick = useCallback(() => {
    void downloadCanvas()
  }, [downloadCanvas])

  // Apply remote drawing (for backward compatibility, not actively used)
  const applyRemoteDrawing = useCallback((imageData: string) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
    }
    img.src = imageData
  }, [])

  // Apply remote stroke (real-time drawing)
  const applyRemoteStroke = useCallback((strokeData: StrokeData) => {
    console.log('[Whiteboard] Received remote stroke', strokeData)
    isApplyingRemoteStrokeRef.current = true

    // Draw the remote stroke on our canvas
    drawStroke(
      strokeData.fromX,
      strokeData.fromY,
      strokeData.toX,
      strokeData.toY,
      strokeData.tool,
      strokeData.color,
      strokeData.strokeWidth
    )

    // Reset flag immediately after drawing
    isApplyingRemoteStrokeRef.current = false
  }, [drawStroke])

  const applyRemoteSettings = useCallback((settings: WhiteboardSettingsUpdate) => {
    if (typeof settings.isTransparent === 'boolean') {
      setIsTransparent(settings.isTransparent)
    }
    if (settings.position) {
      setIsDragging(false)
      setPosition(settings.position)
    }
    if (settings.size) {
      setIsResizing(false)
      setSize({
        width: Math.max(400, settings.size.width),
        height: Math.max(300, settings.size.height),
      })
    }
  }, [])

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    applyRemoteDrawing,
    applyRemoteStroke,
    clear: clearCanvas,
    applyRemoteSettings,
  }), [applyRemoteDrawing, applyRemoteStroke, clearCanvas, applyRemoteSettings])

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
    // Only broadcast position when transparent
    if (isTransparent) {
      broadcastSettings()
    }
  }, [broadcastSettings, isTransparent])

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
    // Only broadcast size when transparent
    if (isTransparent) {
      broadcastSettings()
    }
  }, [broadcastSettings, isTransparent])

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
            onClick={() => clearCanvas()}
          >
            Clear
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadClick}
          >
            Save
          </Button>

          {/* Transparent Toggle */}
          <Button
            variant={isTransparent ? 'default' : 'outline'}
            size="sm"
            onClick={handleTransparentToggle}
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
