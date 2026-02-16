import { useRef, useEffect, useCallback, type MouseEvent } from 'react'
import { Cpu, Hand, Compass, Orbit, Tv } from 'lucide-react'

interface GridProps {
  grid: number[][]
  gridSize: number
  centroid: { x: number; y: number }
  controlMode: string
  onMouseDown: (y: number, x: number) => void
  onMouseEnter: (y: number, x: number) => void
  onMouseLeave: () => void
  onMousePositionChange: (x: number, y: number) => void
}

// Resolve CSS custom properties (which may use oklch) to canvas-compatible rgb strings
let colorProbeEl: HTMLDivElement | null = null

function getCssColor(varName: string): string {
  if (!colorProbeEl) {
    colorProbeEl = document.createElement('div')
    colorProbeEl.style.display = 'none'
    document.body.appendChild(colorProbeEl)
  }
  colorProbeEl.style.color = `var(${varName})`
  const rgb = getComputedStyle(colorProbeEl).color
  return rgb
}

const CROSSHAIR_COLORS: Record<string, { line: string; glow: string }> = {
  manual:   { line: 'rgba(129,140,248,1)', glow: 'rgba(129,140,248,0.7)' },
  traveler: { line: 'rgba(251,191,36,1)',  glow: 'rgba(251,191,36,0.7)' },
  lorenz:   { line: 'rgba(251,113,133,1)', glow: 'rgba(251,113,133,0.7)' },
  dvd:      { line: 'rgba(192,132,252,1)', glow: 'rgba(192,132,252,0.7)' },
  centroid: { line: 'rgba(128,128,128,0.3)', glow: 'rgba(128,128,128,0.3)' },
}

export default function Grid({
  grid, gridSize, centroid, controlMode,
  onMouseDown, onMouseEnter, onMouseLeave, onMousePositionChange,
}: GridProps) {
  const gridCanvasRef = useRef<HTMLCanvasElement>(null)
  const crosshairCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isMouseDownRef = useRef(false)
  const lastCellRef = useRef<{ y: number; x: number } | null>(null)

  // Draw grid cells
  useEffect(() => {
    const canvas = gridCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const w = rect.width
    const h = rect.height

    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    // Read theme colors — resolve oklch to rgb via DOM
    const fgColor = getCssColor('--foreground')
    const bgColor = getCssColor('--background')
    const borderColor = getCssColor('--border')

    // Fill background (gap color)
    ctx.fillStyle = borderColor
    ctx.fillRect(0, 0, w, h)

    const cellW = w / gridSize
    const cellH = h / gridSize
    const gap = Math.max(0.5, cellW * 0.04)

    for (let y = 0; y < gridSize; y++) {
      const row = grid[y]
      for (let x = 0; x < gridSize; x++) {
        ctx.fillStyle = row[x] === 1 ? fgColor : bgColor
        ctx.fillRect(
          x * cellW + gap * 0.5,
          y * cellH + gap * 0.5,
          cellW - gap,
          cellH - gap,
        )
      }
    }
  }, [grid, gridSize])

  // Draw crosshair overlay
  useEffect(() => {
    const canvas = crosshairCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const w = rect.width
    const h = rect.height

    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    const colors = CROSSHAIR_COLORS[controlMode] || CROSSHAIR_COLORS.centroid
    const cx = (centroid.x / gridSize) * w
    const cy = (centroid.y / gridSize) * h

    // Horizontal line
    ctx.save()
    ctx.strokeStyle = colors.line
    ctx.lineWidth = 1
    ctx.shadowColor = colors.glow
    ctx.shadowBlur = 20
    ctx.beginPath()
    ctx.moveTo(0, cy)
    ctx.lineTo(w, cy)
    ctx.stroke()
    ctx.restore()

    // Vertical line
    ctx.save()
    ctx.strokeStyle = colors.line
    ctx.lineWidth = 1
    ctx.shadowColor = colors.glow
    ctx.shadowBlur = 20
    ctx.beginPath()
    ctx.moveTo(cx, 0)
    ctx.lineTo(cx, h)
    ctx.stroke()
    ctx.restore()

    // Circle
    ctx.save()
    ctx.strokeStyle = colors.line
    ctx.lineWidth = 2
    ctx.shadowColor = colors.glow
    ctx.shadowBlur = 10
    const circleRadius = controlMode === 'manual' ? 24 : controlMode === 'centroid' ? 20 : 22
    ctx.beginPath()
    ctx.arc(cx, cy, circleRadius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()

    // Center dot (pulsing effect via opacity)
    ctx.save()
    ctx.fillStyle = colors.line
    ctx.globalAlpha = 0.8
    ctx.beginPath()
    ctx.arc(cx, cy, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }, [centroid, gridSize, controlMode])

  const getCellFromEvent = useCallback((e: MouseEvent<HTMLCanvasElement | HTMLDivElement>) => {
    const canvas = gridCanvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * gridSize)
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * gridSize)
    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return null
    return { y, x }
  }, [gridSize])

  const handleCanvasMouseDown = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    const cell = getCellFromEvent(e)
    if (!cell) return
    isMouseDownRef.current = true
    lastCellRef.current = cell
    onMouseDown(cell.y, cell.x)
  }, [getCellFromEvent, onMouseDown])

  const handleCanvasMouseMove = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    // Report fractional position for manual mode tracking
    const canvas = gridCanvasRef.current
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * gridSize
      const y = ((e.clientY - rect.top) / rect.height) * gridSize
      onMousePositionChange(x, y)
    }

    if (!isMouseDownRef.current) return
    const cell = getCellFromEvent(e)
    if (!cell) return
    if (lastCellRef.current && lastCellRef.current.y === cell.y && lastCellRef.current.x === cell.x) return
    lastCellRef.current = cell
    onMouseEnter(cell.y, cell.x)
  }, [getCellFromEvent, onMouseEnter, onMousePositionChange, gridSize])

  const handleCanvasMouseLeave = useCallback(() => {
    isMouseDownRef.current = false
    lastCellRef.current = null
    onMouseLeave()
  }, [onMouseLeave])

  // Global mouseup to cancel drag
  useEffect(() => {
    const up = () => {
      isMouseDownRef.current = false
      lastCellRef.current = null
    }
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  return (
    <div className="flex-1 bg-muted/30 rounded-2xl border border-border relative overflow-hidden flex items-center justify-center p-6 lg:p-10">

      {/* Grid + Crosshair wrapper */}
      <div ref={containerRef} className="relative w-full max-w-[min(100%,70vh)] aspect-square z-10">
        {/* Grid canvas */}
        <canvas
          ref={gridCanvasRef}
          className="absolute inset-0 w-full h-full rounded-lg cursor-crosshair"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={handleCanvasMouseLeave}
        />
        {/* Crosshair canvas */}
        <canvas
          ref={crosshairCanvasRef}
          className="absolute inset-0 w-full h-full rounded-lg pointer-events-none z-20"
        />
      </div>

      {/* Mode indicator */}
      <div className="absolute bottom-6 left-6 flex items-center gap-3 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border text-xs text-muted-foreground z-30">
        {controlMode === 'centroid' ? (
          <><Cpu size={14} /> Centroid Dynamics</>
        ) : controlMode === 'traveler' ? (
          <><Compass size={14} className="text-amber-500" /> Grey Pilgrim</>
        ) : controlMode === 'lorenz' ? (
          <><Orbit size={14} className="text-rose-500" /> Lorenz Attractor</>
        ) : controlMode === 'dvd' ? (
          <><Tv size={14} className="text-purple-500" /> DVD Bounce</>
        ) : (
          <><Hand size={14} className="text-indigo-500" /> Manual Coordinate Input</>
        )}
      </div>
    </div>
  )
}
