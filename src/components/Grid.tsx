import { type MouseEvent } from 'react'
import { Cpu, Hand, Compass } from 'lucide-react'

interface GridProps {
  grid: number[][]
  gridSize: number
  centroid: { x: number; y: number }
  controlMode: string
  onMouseDown: (y: number, x: number) => void
  onMouseEnter: (y: number, x: number) => void
  onMouseLeave: () => void
  onMouseMove: (e: MouseEvent<HTMLDivElement>) => void
}

export default function Grid({
  grid, gridSize, centroid, controlMode,
  onMouseDown, onMouseEnter, onMouseLeave, onMouseMove,
}: GridProps) {
  return (
    <div className="flex-1 bg-muted/30 rounded-2xl border border-border relative overflow-hidden flex items-center justify-center p-6 lg:p-10">

      {/* Grid + Crosshair wrapper */}
      <div className="relative w-full max-w-[min(100%,70vh)] aspect-square z-10">
        {/* Crosshair overlay */}
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          <div
            className={`absolute w-full h-[1px] transition-all duration-75 ease-linear ${controlMode === 'manual' ? 'bg-indigo-400 shadow-[0_0_20px_rgba(129,140,248,0.7)]' : controlMode === 'traveler' ? 'bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.7)]' : 'bg-foreground/30 shadow-[0_0_15px_rgba(128,128,128,0.3)]'}`}
            style={{ top: `${(centroid.y / gridSize) * 100}%` }}
          />
          <div
            className={`absolute h-full w-[1px] transition-all duration-75 ease-linear ${controlMode === 'manual' ? 'bg-indigo-400 shadow-[0_0_20px_rgba(129,140,248,0.7)]' : controlMode === 'traveler' ? 'bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.7)]' : 'bg-foreground/30 shadow-[0_0_15px_rgba(128,128,128,0.3)]'}`}
            style={{ left: `${(centroid.x / gridSize) * 100}%` }}
          />
          <div
            className={`absolute w-10 h-10 border-2 rounded-full -translate-x-1/2 -translate-y-1/2 transition-all duration-75 ease-linear flex items-center justify-center ${controlMode === 'manual' ? 'border-indigo-400 scale-125' : controlMode === 'traveler' ? 'border-amber-400 scale-110' : 'border-foreground/40'}`}
            style={{ top: `${(centroid.y / gridSize) * 100}%`, left: `${(centroid.x / gridSize) * 100}%` }}
          >
            <div className={`w-2 h-2 rounded-full animate-ping ${controlMode === 'manual' ? 'bg-indigo-400' : controlMode === 'traveler' ? 'bg-amber-400' : 'bg-foreground/50'}`} />
          </div>
        </div>

        {/* Grid */}
        <div
          className="grid gap-[1px] bg-border p-[1px] rounded-lg w-full h-full border border-border overflow-hidden"
          style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
        >
          {grid.map((row, y) =>
            row.map((cell, x) => (
              <div
                key={`${y}-${x}`}
                onMouseDown={() => onMouseDown(y, x)}
                onMouseEnter={() => onMouseEnter(y, x)}
                className={`
                  w-full h-full cursor-crosshair transition-colors duration-300
                  ${cell
                    ? 'bg-foreground z-10'
                    : 'bg-background hover:bg-muted'
                  }
                `}
              />
            )),
          )}
        </div>
      </div>

      {/* Mode indicator */}
      <div className="absolute bottom-6 left-6 flex items-center gap-3 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border text-xs text-muted-foreground z-30">
        {controlMode === 'centroid' ? (
          <><Cpu size={14} /> Centroid Dynamics</>
        ) : controlMode === 'traveler' ? (
          <><Compass size={14} className="text-amber-500" /> Wandering Traveler</>
        ) : (
          <><Hand size={14} className="text-indigo-500" /> Manual Coordinate Input</>
        )}
      </div>
    </div>
  )
}
