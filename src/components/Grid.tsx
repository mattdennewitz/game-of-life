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
    <div className="flex-1 bg-zinc-900/20 rounded-[3rem] border border-white/5 relative overflow-hidden flex items-center justify-center p-8 lg:p-12 shadow-2xl shadow-black">

      {/* Grid + Crosshair wrapper — crosshair is positioned relative to the grid, not the outer padded container */}
      <div className="relative w-full max-w-[min(100%,70vh)] aspect-square z-10">
        {/* Crosshair overlay */}
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          <div
            className={`absolute w-full h-[1px] transition-all duration-75 ease-linear ${controlMode === 'manual' ? 'bg-indigo-400 shadow-[0_0_20px_rgba(129,140,248,0.7)]' : controlMode === 'traveler' ? 'bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.7)]' : 'bg-white/40 shadow-[0_0_15px_rgba(255,255,255,0.4)]'}`}
            style={{ top: `${(centroid.y / gridSize) * 100}%` }}
          />
          <div
            className={`absolute h-full w-[1px] transition-all duration-75 ease-linear ${controlMode === 'manual' ? 'bg-indigo-400 shadow-[0_0_20px_rgba(129,140,248,0.7)]' : controlMode === 'traveler' ? 'bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.7)]' : 'bg-white/40 shadow-[0_0_15px_rgba(255,255,255,0.4)]'}`}
            style={{ left: `${(centroid.x / gridSize) * 100}%` }}
          />
          <div
            className={`absolute w-10 h-10 border-2 rounded-full -translate-x-1/2 -translate-y-1/2 transition-all duration-75 ease-linear flex items-center justify-center ${controlMode === 'manual' ? 'border-indigo-400 scale-125' : controlMode === 'traveler' ? 'border-amber-400 scale-110' : 'border-white opacity-50'}`}
            style={{ top: `${(centroid.y / gridSize) * 100}%`, left: `${(centroid.x / gridSize) * 100}%` }}
          >
            <div className={`w-2 h-2 rounded-full animate-ping ${controlMode === 'manual' ? 'bg-indigo-400' : controlMode === 'traveler' ? 'bg-amber-400' : 'bg-white'}`} />
          </div>
        </div>

        {/* Grid */}
        <div
          className="grid gap-[1px] bg-white/5 p-[1px] rounded-lg w-full h-full shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden"
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
                  w-full h-full cursor-crosshair transition-all duration-300
                  ${cell
                    ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)] z-10'
                    : 'bg-black hover:bg-zinc-900'
                  }
                `}
              />
            )),
          )}
        </div>
      </div>

      {/* Mode indicator */}
      <div className="absolute bottom-10 left-10 flex items-center gap-4 bg-black/80 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 text-[10px] text-zinc-400 font-black tracking-widest uppercase z-30 shadow-2xl">
        {controlMode === 'centroid' ? (
          <><Cpu size={14} className="text-white" /> Centroid Dynamics</>
        ) : controlMode === 'traveler' ? (
          <><Compass size={14} className="text-amber-400" /> Wandering Traveler</>
        ) : (
          <><Hand size={14} className="text-indigo-400" /> Manual Coordinate Input</>
        )}
      </div>

      {/* Radial gradient overlay */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.03),transparent_70%)] pointer-events-none" />
    </div>
  )
}
