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
import html2canvas from 'html2canvas'

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
  remoteWhiteboardOpen?: boolean
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
  remoteWhiteboardOpen = false,
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
  const [remoteUserDrawing, setRemoteUserDrawing] = useState(false)
  const [bothWhiteboardsOpen, setBothWhiteboardsOpen] = useState(false)

  // Position and size states
  const [position, setPosition] = useState(initialPosition)
  const [size, setSize] = useState(initialSize)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })

  const lastPositionRef = useRef({ x: 0, y: 0 })
  const isApplyingRemoteStrokeRef = useRef(false)

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
    setIsDrawing(true)
  }

  // Draw stroke helper function with interpolation for smooth lines
  const drawStroke = useCallback((fromX: number, fromY: number, toX: number, toY: number, drawTool: DrawingTool, drawColor: string, drawWidth: number) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) {
      return
    }

    // Set up context settings
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (drawTool === 'pen') {
      ctx.globalCompositeOperation = 'source-over'
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

    // Interpolate aggressively to avoid gaps when moving fast
    const distance = Math.hypot(toX - fromX, toY - fromY)
    const steps = Math.max(1, Math.ceil(distance / 2)) // 2px step for dense coverage
    const stepX = (toX - fromX) / steps
    const stepY = (toY - fromY) / steps

    let prevX = fromX
    let prevY = fromY
    for (let i = 1; i <= steps; i++) {
      const nextX = fromX + stepX * i
      const nextY = fromY + stepY * i
      ctx.beginPath()
      ctx.moveTo(prevX, prevY)
      ctx.lineTo(nextX, nextY)
      ctx.stroke()
      prevX = nextX
      prevY = nextY
    }

    // Always reset to source-over after drawing
    ctx.globalCompositeOperation = 'source-over'
  }, [isTransparent])

  // Draw on canvas
  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    const coords = getCanvasCoordinates(e)

    // Reuse stroke helper for consistent interpolation
    drawStroke(
      lastPositionRef.current.x,
      lastPositionRef.current.y,
      coords.x,
      coords.y,
      tool,
      color,
      strokeWidth
    )

    // Send stroke data to remote peer (only if this is not a remote stroke being applied)
    if (!isApplyingRemoteStrokeRef.current && sendDataMessage) {
      sendDataMessage({
        type: 'whiteboard-stroke',
        strokeData: {
          tool,
          color,
          strokeWidth,
          fromX: lastPositionRef.current.x,
          fromY: lastPositionRef.current.y,
          toX: coords.x,
          toY: coords.y,
        },
      })
    }

    lastPositionRef.current = coords
  }, [isDrawing, tool, color, strokeWidth, sendDataMessage, isTransparent])

  // Stop drawing
  const stopDrawing = () => {
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
    setIsDrawing(false)
    lastPositionRef.current = { x: 0, y: 0 }

    // Reset intrinsic canvas size to flush any lingering context state
    const width = canvas.width
    const height = canvas.height
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return

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
      sendDataMessage({
        type: 'whiteboard-clear',
      })
    }
  }, [isTransparent, sendDataMessage])

  // Download canvas as image
  const downloadCanvas = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const fileName = `whiteboard-${Date.now()}.png`

    // For opaque mode, just export the canvas directly
    if (!isTransparent) {
      const link = document.createElement('a')
      link.download = fileName
      link.href = canvas.toDataURL('image/png')
      link.click()
      return
    }

    // For transparent mode, try DOM capture first (no permission prompt). Fallback to screen capture.

    try {
      // Capture full page; includes background behind transparent canvas
      const fullCanvas = await html2canvas(document.body, {
        backgroundColor: null,
        scale: window.devicePixelRatio || 1,
        logging: false,
        useCORS: true,
      })

      // Get whiteboard position on screen (prefer full container so buttons/borders are captured)
      const canvasRect = canvas.getBoundingClientRect()
      const containerRect = containerRef.current?.getBoundingClientRect()
      const targetRect = containerRect || canvasRect

      // Ratios from viewport CSS px to captured canvas px
      const ratioX = fullCanvas.width / window.innerWidth
      const ratioY = fullCanvas.height / window.innerHeight

      // Compute crop rect in captured pixel space
      const sourceX = targetRect.left * ratioX
      const sourceY = targetRect.top * ratioY
      const sourceWidth = targetRect.width * ratioX
      const sourceHeight = targetRect.height * ratioY

      console.log('[Whiteboard] Cropping region (DOM capture):', { sourceX, sourceY, sourceWidth, sourceHeight, fullWidth: fullCanvas.width, fullHeight: fullCanvas.height })

      // Prepare export canvas at cropped resolution
      const exportCanvas = document.createElement('canvas')
      exportCanvas.width = Math.round(sourceWidth)
      exportCanvas.height = Math.round(sourceHeight)
      const exportCtx = exportCanvas.getContext('2d')
      if (!exportCtx) return

      // Draw cropped screenshot
      exportCtx.drawImage(
        fullCanvas,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, exportCanvas.width, exportCanvas.height
      )

      // Now overlay the whiteboard drawing on top
      const drawingImage = new Image()
      await new Promise<void>((resolve, reject) => {
        drawingImage.onload = () => {
          // Position drawing where the canvas sits within the container so buttons/borders remain visible
          const drawScaleX = exportCanvas.width / (targetRect.width * ratioX)
          const drawScaleY = exportCanvas.height / (targetRect.height * ratioY)
          const offsetX = (canvasRect.left - targetRect.left) * ratioX * drawScaleX
          const offsetY = (canvasRect.top - targetRect.top) * ratioY * drawScaleY

          exportCtx.drawImage(
            drawingImage,
            offsetX,
            offsetY,
            canvasRect.width * ratioX * drawScaleX,
            canvasRect.height * ratioY * drawScaleY
          )
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

      console.log('[Whiteboard] Transparent whiteboard with background saved via DOM capture!')
    } catch (error) {
      console.error('[Whiteboard] DOM capture failed, falling back to screen capture:', error)

      try {
        // Request screen capture
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'window', // Prefer current window to simplify coordinate mapping
            preferCurrentTab: true,
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

        // Get whiteboard position on screen (prefer full container so buttons/borders are captured)
        const canvasRect = canvas.getBoundingClientRect()
        const containerRect = containerRef.current?.getBoundingClientRect()
        const targetRect = containerRect || canvasRect

        // Create a canvas to extract the whiteboard region from the screenshot
        const exportCanvas = document.createElement('canvas')
        exportCanvas.width = Math.round(targetRect.width)
        exportCanvas.height = Math.round(targetRect.height)
        const exportCtx = exportCanvas.getContext('2d')
        if (!exportCtx) return

        // Map CSS pixels (viewport) to captured bitmap pixels.
        const captureWidth = bitmap.width
        const captureHeight = bitmap.height
        const scaleX = captureWidth / window.innerWidth
        const scaleY = captureHeight / window.innerHeight

        const sourceX = targetRect.left * scaleX
        const sourceY = targetRect.top * scaleY
        const sourceWidth = targetRect.width * scaleX
        const sourceHeight = targetRect.height * scaleY

        console.log('[Whiteboard] Cropping region (window capture):', { sourceX, sourceY, sourceWidth, sourceHeight, captureWidth, captureHeight })

        exportCtx.drawImage(
          bitmap,
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, exportCanvas.width, exportCanvas.height
        )

        // Now overlay the whiteboard drawing on top
        const drawingImage = new Image()
        await new Promise<void>((resolve, reject) => {
          drawingImage.onload = () => {
            // Position drawing where the canvas sits within the container so buttons/borders remain visible
            const drawScaleX = exportCanvas.width / targetRect.width
            const drawScaleY = exportCanvas.height / targetRect.height
            const offsetX = (canvasRect.left - targetRect.left) * drawScaleX
            const offsetY = (canvasRect.top - targetRect.top) * drawScaleY

            exportCtx.drawImage(
              drawingImage,
              offsetX,
              offsetY,
              canvasRect.width * drawScaleX,
              canvasRect.height * drawScaleY
            )
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

        console.log('[Whiteboard] Transparent whiteboard with background saved (screen capture fallback)!')
      } catch (fallbackError) {
        console.error('[Whiteboard] Screen capture failed:', fallbackError)
        console.log('[Whiteboard] Falling back to drawing-only export')

        // Fallback to just the drawing
        const link = document.createElement('a')
        link.download = fileName
        link.href = canvas.toDataURL('image/png')
        link.click()
      }
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

    // Indicate remote user is drawing
    setRemoteUserDrawing(true)
    setTimeout(() => setRemoteUserDrawing(false), 500)

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

  // Broadcast that whiteboard is open when component mounts
  useEffect(() => {
    if (sendDataMessage) {
      sendDataMessage({
        type: 'whiteboard-opened',
      })
    }
    // Broadcast closed when unmounting
    return () => {
      if (sendDataMessage) {
        sendDataMessage({
          type: 'whiteboard-closed',
        })
      }
    }
  }, [sendDataMessage])

  // Clear canvas when both whiteboards become open
  useEffect(() => {
    const nowBothOpen = remoteWhiteboardOpen
    if (nowBothOpen && !bothWhiteboardsOpen) {
      setBothWhiteboardsOpen(true)
      clearCanvas({ broadcast: false })
    } else if (!nowBothOpen && bothWhiteboardsOpen) {
      setBothWhiteboardsOpen(false)
    }
  }, [remoteWhiteboardOpen, bothWhiteboardsOpen, clearCanvas])

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
          'flex items-center justify-between p-2 cursor-move border-b border-black relative',
          isTransparent ? 'bg-muted/70 backdrop-blur-md' : 'bg-muted/50'
        )}
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            remoteWhiteboardOpen ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-gray-400"
          )} />
          <span className="text-sm font-medium">Whiteboard</span>
          {remoteUserDrawing && (
            <span className="text-xs text-muted-foreground">(Partner drawing...)</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">Drag to move</span>
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
