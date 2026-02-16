import { SCALE_INFO, formatPlayingNotes, type NoteInfo } from '@/audio/notes'

interface FooterProps {
  isPlaying: boolean
  gridSize: number
  mutationRate: number
  tempo: number
  scale: string
  treatment: string
  dynamicSensitivity: number
  playingNotes: NoteInfo[]
}

export default function Footer({ isPlaying, gridSize, mutationRate, tempo, scale, treatment, dynamicSensitivity, playingNotes }: FooterProps) {
  return (
    <footer className="px-6 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
          Engine: {isPlaying ? 'Playing' : 'Stopped'}
        </div>
        <div>Res: {gridSize}x{gridSize}</div>
        <div>Entropy: {(mutationRate * 100).toFixed(2)}%</div>
        <div>BPM: {tempo}</div>
        <div>Harmony: {SCALE_INFO[scale]?.label ?? scale}</div>
        <div>Voice: {treatment}</div>
        <div>Dynamics: {Math.round(dynamicSensitivity * 100)}%</div>
        <div className="font-mono">Notes: {formatPlayingNotes(playingNotes, scale)}</div>
      </div>
      <div className="text-muted-foreground/50">Dennewitz</div>
    </footer>
  )
}
