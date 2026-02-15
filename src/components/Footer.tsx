interface FooterProps {
  isPlaying: boolean
  gridSize: number
  mutationRate: number
}

export default function Footer({ isPlaying, gridSize, mutationRate }: FooterProps) {
  return (
    <footer className="px-10 py-6 border-t border-white/5 flex items-center justify-between text-[9px] uppercase tracking-[0.4em] text-zinc-700 font-black bg-zinc-950">
      <div className="flex items-center gap-10">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-zinc-800'}`} />
          ENGINE: {isPlaying ? 'READY' : 'IDLE'}
        </div>
        <div className="text-zinc-500">RES: {gridSize}x{gridSize}</div>
        <div className="text-amber-500/50">CHAOS: {(mutationRate * 100).toFixed(2)}%</div>
      </div>
      <div className="text-white/20">BIO-LOGIC ENGINE V3.5</div>
    </footer>
  )
}
