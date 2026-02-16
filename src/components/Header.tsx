import { Play, Square, Sun, Moon, PanelLeft, Info, Circle, Download, Repeat, Loader2 } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { LOOP_STEP_PRESETS } from '@/simulation/constants'

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
  onSetLoopSteps: (steps: number) => void
  onExportLoop: () => void
  onToggleOverview: () => void
}

export default function Header({
  isPlaying, isRecording, onTogglePlay, onToggleSidebar,
  onToggleRecording, hasRecordedEvents, onDownloadMidi,
  loopLock, onToggleLoopLock, isLoopFull, loopRecordedSteps, loopSteps, onSetLoopSteps, onExportLoop,
  onToggleOverview,
}: HeaderProps) {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') document.documentElement.classList.add('dark')
    return document.documentElement.classList.contains('dark')
  })
  const isCustomLoopSteps = !(LOOP_STEP_PRESETS as readonly number[]).includes(loopSteps)
  const [loopDraft, setLoopDraft] = useState<string | null>(null)
  const loopInput = loopDraft ?? (isCustomLoopSteps ? String(loopSteps) : '')

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const commitLoopInput = () => {
    const n = parseInt(loopInput, 10)
    setLoopDraft(null)
    if (!isNaN(n) && n >= 1) onSetLoopSteps(n)
  }

  const handleLoopKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') commitLoopInput()
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

          {/* Loop Steps Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="xs" className="font-mono text-muted-foreground">
                {loopSteps}st
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="end">
              <div className="flex gap-1 mb-2">
                {LOOP_STEP_PRESETS.map((n) => (
                  <Button
                    key={n}
                    variant={loopSteps === n ? 'default' : 'ghost'}
                    size="xs"
                    className="font-mono"
                    onClick={() => onSetLoopSteps(n)}
                  >
                    {n}
                  </Button>
                ))}
              </div>
              <Input
                type="number"
                min={1}
                value={loopInput}
                onChange={(e) => setLoopDraft(e.target.value)}
                onBlur={commitLoopInput}
                onKeyDown={handleLoopKeyDown}
                className="h-7 font-mono text-xs"
                placeholder="Custom length…"
              />
            </PopoverContent>
          </Popover>

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

          <Button variant="ghost" size="icon" onClick={onToggleOverview}>
            <Info size={18} />
          </Button>

          <Button variant="ghost" size="icon" onClick={toggleDark} className="rounded-full">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </Button>

          <Button
            onClick={onTogglePlay}
            variant={isPlaying ? 'destructive' : 'default'}
            className="gap-2"
          >
            {isPlaying ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
            {isPlaying ? 'Stop' : 'Start'}
          </Button>
        </div>
      </header>
    </TooltipProvider>
  )
}
