interface FooterProps {
  isPlaying: boolean
  gridSize: number
  mutationRate: number
}

export default function Footer({ isPlaying, gridSize, mutationRate }: FooterProps) {
  return (
    <footer className="px-6 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
          Engine: {isPlaying ? 'Ready' : 'Idle'}
        </div>
        <div>Res: {gridSize}x{gridSize}</div>
        <div>Chaos: {(mutationRate * 100).toFixed(2)}%</div>
      </div>
      <div className="text-muted-foreground/50">Dennewitz v3.5</div>
    </footer>
  )
}
