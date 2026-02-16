import { Play, Square, Sun, Moon, PanelLeft, Circle, Download, Repeat, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

interface HeaderProps {
  isPlaying: boolean
  isRecording?: boolean
  onTogglePlay: () => void
  onToggleSidebar: () => void
  onToggleRecording: () => void
  hasRecordedEvents: boolean
  onDownloadMidi: () => void
  loopLock: boolean
  onToggleLoopLock: () => void
  isLoopFull: boolean
  loopRecordedSteps: number
  loopSteps: number
  onExportLoop: () => void
}

export default function Header({
  isPlaying, isRecording, onTogglePlay, onToggleSidebar,
  onToggleRecording, hasRecordedEvents, onDownloadMidi,
  loopLock, onToggleLoopLock, isLoopFull, loopRecordedSteps, loopSteps, onExportLoop,
}: HeaderProps) {
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
    <TooltipProvider delayDuration={400}>
      <header className="px-4 py-3 border-b border-border flex items-center justify-between bg-background/80 backdrop-blur-sm z-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
            <PanelLeft size={18} />
          </Button>
          <h1 className="text-lg font-bold tracking-tight leading-none">Dennewitz's Game of Life</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Global MIDI Recording */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="xs"
                onClick={onToggleRecording}
                className={isRecording ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}
              >
                <Circle size={12} fill={isRecording ? 'currentColor' : 'none'} className={isRecording ? 'animate-pulse' : ''} />
                REC
                <kbd className="px-1 py-0.5 rounded border border-border bg-muted text-[10px] font-mono text-muted-foreground">Shift R</kbd>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Record MIDI</TooltipContent>
          </Tooltip>

          {hasRecordedEvents && !isRecording && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-xs" onClick={onDownloadMidi}>
                  <Download size={12} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download MIDI recording</TooltipContent>
            </Tooltip>
          )}

          <Separator orientation="vertical" className="h-4" />

          {/* Loop Lock */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="xs"
                onClick={onToggleLoopLock}
                className={loopLock ? 'text-emerald-500' : 'text-muted-foreground'}
              >
                <Repeat size={12} />
                <kbd className="px-1 py-0.5 rounded border border-border bg-muted text-[10px] font-mono text-muted-foreground">Shift L</kbd>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Loop Lock</TooltipContent>
          </Tooltip>

          {loopLock && !isLoopFull && (
            <span className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
              <Loader2 size={12} className="animate-spin" />
              {loopRecordedSteps}/{loopSteps}
            </span>
          )}

          {loopLock && isLoopFull && (
            <span className="flex items-center gap-1.5">
              <span className="text-xs font-mono text-emerald-500">{loopRecordedSteps}/{loopSteps}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-xs" onClick={onExportLoop}>
                    <Download size={12} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export loop as MIDI</TooltipContent>
              </Tooltip>
            </span>
          )}

          <Separator orientation="vertical" className="h-4" />

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
    </TooltipProvider>
  )
}
