import { Dice5, Trash2, Sparkles, Grid3X3, Repeat } from 'lucide-react'
import { SCALES } from '@/audio/notes'
import { GRID_OPTIONS } from '@/simulation/constants'

interface SidebarProps {
  gridSize: number
  seed: string
  mutationRate: number
  tempo: number
  scale: string
  treatment: string
  onChangeGridSize: (size: number) => void
  onSetSeed: (seed: string) => void
  onRandomize: () => void
  onSetMutationRate: (rate: number) => void
  onSetTempo: (tempo: number) => void
  onSetScale: (scale: string) => void
  onSetTreatment: (treatment: string) => void
  loopLock: boolean
  loopSteps: number
  onSetLoopLock: (on: boolean) => void
  onSetLoopSteps: (steps: number) => void
  onClear: () => void
}

export default function Sidebar({
  gridSize, seed, mutationRate, tempo, scale, treatment,
  onChangeGridSize, onSetSeed, onRandomize, onSetMutationRate, onSetTempo,
  onSetScale, onSetTreatment, loopLock, loopSteps, onSetLoopLock, onSetLoopSteps, onClear,
}: SidebarProps) {
  return (
    <aside className="w-full lg:w-80 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar pb-10">
      <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-[2rem] space-y-8 shadow-inner shadow-black/50">

        {/* Grid Size */}
        <div>
          <label className="text-[10px] font-black text-zinc-600 uppercase mb-3 block tracking-[0.2em] flex items-center gap-2">
            <Grid3X3 size={12} className="text-white" /> Matrix Resolution
          </label>
          <div className="flex gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
            {GRID_OPTIONS.map((size) => (
              <button
                key={size}
                onClick={() => onChangeGridSize(size)}
                className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${
                  gridSize === size
                    ? 'bg-zinc-100 text-black shadow-lg'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {size}x{size}
              </button>
            ))}
          </div>
        </div>

        {/* Seed */}
        <div>
          <label className="text-[10px] font-black text-zinc-600 uppercase mb-3 block tracking-[0.2em]">Genotype Seed</label>
          <div className="flex gap-2">
            <input
              type="text" value={seed} onChange={(e) => onSetSeed(e.target.value)}
              className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-sm font-mono focus:ring-1 focus:ring-white outline-none"
            />
            <button onClick={onRandomize} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-400">
              <Dice5 size={20} />
            </button>
          </div>
        </div>

        {/* Mutation */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] flex items-center gap-2">
              <Sparkles size={10} className="text-amber-400" /> Entropy / Mutation
            </label>
            <span className="text-xs font-mono text-amber-400">{(mutationRate * 100).toFixed(2)}%</span>
          </div>
          <input
            type="range" min="0" max="0.01" step="0.0001" value={mutationRate}
            onChange={(e) => onSetMutationRate(Number(e.target.value))}
            className="w-full accent-amber-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Tempo */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Metronome</label>
            <span className="text-xs font-mono text-white">{tempo} BPM</span>
          </div>
          <input
            type="range" min="60" max="220" value={tempo}
            onChange={(e) => onSetTempo(Number(e.target.value))}
            className="w-full accent-white h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Scale */}
        <div>
          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-3 block text-indigo-400">Harmony</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(SCALES).map((s) => (
              <button
                key={s} onClick={() => onSetScale(s)}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                  scale === s ? 'bg-white border-white text-black' : 'bg-transparent border-white/10 text-zinc-500'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Treatment */}
        <div>
          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-3 block">Voice Treatment</label>
          <div className="space-y-1.5">
            {['chord', 'line', 'arpeggio'].map((t) => (
              <button
                key={t} onClick={() => onSetTreatment(t)}
                className={`w-full px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] text-left flex items-center justify-between border transition-all ${
                  treatment === t ? 'bg-zinc-100 border-white text-black' : 'bg-transparent border-white/5 text-zinc-600 hover:text-zinc-300'
                }`}
              >
                {t}
                <div className={`w-1.5 h-1.5 rounded-full ${treatment === t ? 'bg-black' : 'bg-zinc-800'}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Loop Lock */}
        <div>
          <label className="text-[10px] font-black text-zinc-600 uppercase mb-3 block tracking-[0.2em] flex items-center gap-2">
            <Repeat size={12} className="text-emerald-400" /> Loop Lock
          </label>
          <button
            onClick={() => onSetLoopLock(!loopLock)}
            className={`w-full px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] text-left flex items-center justify-between border transition-all mb-3 ${
              loopLock ? 'bg-emerald-500 border-emerald-400 text-black' : 'bg-transparent border-white/5 text-zinc-600 hover:text-zinc-300'
            }`}
          >
            {loopLock ? 'Locked' : 'Off'}
            <div className={`w-1.5 h-1.5 rounded-full ${loopLock ? 'bg-black' : 'bg-zinc-800'}`} />
          </button>
          <div className="flex gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
            {[4, 8, 16, 32].map((n) => (
              <button
                key={n}
                onClick={() => onSetLoopSteps(n)}
                className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${
                  loopSteps === n
                    ? 'bg-zinc-100 text-black shadow-lg'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={onClear}
        className="w-full bg-zinc-900/40 hover:bg-red-500/10 hover:text-red-500 border border-white/5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all"
      >
        <Trash2 size={16} /> Wipe Matrix
      </button>
    </aside>
  )
}
