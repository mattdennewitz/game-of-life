import { Play, Square, Music, Sun, Moon, PanelLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  isPlaying: boolean
  onTogglePlay: () => void
  onToggleSidebar: () => void
}

export default function Header({ isPlaying, onTogglePlay, onToggleSidebar }: HeaderProps) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') {
      document.documentElement.classList.add('dark')
      setDark(true)
    }
  }, [])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <header className="px-4 py-3 border-b border-border flex items-center justify-between bg-background/80 backdrop-blur-sm z-50">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
          <PanelLeft size={18} />
        </Button>
        <div className="w-9 h-9 bg-foreground rounded-xl flex items-center justify-center">
          <Music className="text-background" size={18} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight leading-none">Dennewitz's Game of Life</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
            <p className="text-xs text-muted-foreground">v3.5</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleDark} className="rounded-full">
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </Button>

        <Button
          onClick={onTogglePlay}
          variant={isPlaying ? 'destructive' : 'default'}
          className="gap-2"
        >
          {isPlaying ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          {isPlaying ? 'Halt' : 'Start'}
        </Button>
      </div>
    </header>
  )
}
