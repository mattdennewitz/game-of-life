import { Play, Square, Music, Cpu, Hand } from 'lucide-react'

interface HeaderProps {
  isPlaying: boolean
  controlMode: string
  onTogglePlay: () => void
  onSetControlMode: (mode: string) => void
}

export default function Header({ isPlaying, controlMode, onTogglePlay, onSetControlMode }: HeaderProps) {
  return (
    <header className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-zinc-950/50 backdrop-blur-xl z-50">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-white/10">
          <Music className="text-black" size={24} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tighter uppercase italic leading-none">Bio-Logic Mouse</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-indigo-500 animate-pulse' : 'bg-zinc-800'}`} />
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Engine v3.5 - High Res</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex bg-zinc-900 rounded-full p-1 border border-white/10 mr-4 shadow-inner">
          <button
            onClick={() => onSetControlMode('auto')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${controlMode === 'auto' ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Cpu size={14} /> Auto
          </button>
          <button
            onClick={() => onSetControlMode('manual')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${controlMode === 'manual' ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Hand size={14} /> Manual
          </button>
        </div>

        <button
          onClick={onTogglePlay}
          className={`group flex items-center gap-3 px-10 py-3 rounded-full font-black transition-all duration-500 active:scale-95 ${
            isPlaying
              ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white'
              : 'bg-white text-black hover:bg-zinc-200 shadow-2xl shadow-white/20'
          }`}
        >
          {isPlaying ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="group-hover:scale-110 transition-transform" />}
          {isPlaying ? 'HALT' : 'START'}
        </button>
      </div>
    </header>
  )
}
