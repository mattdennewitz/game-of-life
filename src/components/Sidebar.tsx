import { useState, type KeyboardEvent } from 'react'
import { Dice5, Trash2, Sparkles, Grid3X3, Repeat, Cpu, ChevronDown, Music, Circle, Download, Loader2 } from 'lucide-react'
import { SCALE_INFO } from '@/audio/notes'
import { GRID_OPTIONS, LOOP_STEP_PRESETS } from '@/simulation/constants'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface SidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gridSize: number
  seed: string
  mutationRate: number
  tempo: number
  scale: string
  treatment: string
  controlMode: string
  onChangeGridSize: (size: number) => void
  onSetSeed: (seed: string) => void
  onRandomize: () => void
  onSetMutationRate: (rate: number) => void
  onSetTempo: (tempo: number) => void
  onSetScale: (scale: string) => void
  onSetTreatment: (treatment: string) => void
  onSetControlMode: (mode: string) => void
  dynamicSensitivity: number
  onSetDynamicSensitivity: (v: number) => void
  loopLock: boolean
  loopSteps: number
  onSetLoopLock: (on: boolean) => void
  onSetLoopSteps: (steps: number) => void
  isLoopFull: boolean
  loopRecordedSteps: number
  onExportLoop: () => void
  onClear: () => void
  midiSupported: boolean
  midiEnabled: boolean
  onSetMidiEnabled: (on: boolean) => void
  midiOutputs: MIDIOutput[]
  selectedMidiOutput: string
  onSetSelectedMidiOutput: (id: string) => void
  isRecording: boolean
  onToggleRecording: () => void
  hasRecordedEvents: boolean
  onDownloadMidi: () => void
}

function Section({ label, icon, children, defaultOpen = true }: {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-1 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer rounded-md hover:bg-accent transition-colors">
        <span className="flex items-center gap-2">
          {icon}
          {label}
        </span>
        <ChevronDown size={14} className="transition-transform [[data-state=closed]_&]:-rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 pb-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}

export default function AppSidebar({
  open, onOpenChange,
  gridSize, seed, mutationRate, tempo, scale, treatment, controlMode,
  onChangeGridSize, onSetSeed, onRandomize, onSetMutationRate, onSetTempo,
  onSetScale, onSetTreatment, onSetControlMode, dynamicSensitivity, onSetDynamicSensitivity, loopLock, loopSteps, onSetLoopLock, onSetLoopSteps, isLoopFull, loopRecordedSteps, onExportLoop, onClear,
  midiSupported, midiEnabled, onSetMidiEnabled, midiOutputs, selectedMidiOutput, onSetSelectedMidiOutput,
  isRecording, onToggleRecording, hasRecordedEvents, onDownloadMidi,
}: SidebarProps) {
  const isCustomLoopSteps = !(LOOP_STEP_PRESETS as readonly number[]).includes(loopSteps)
  const [loopDraft, setLoopDraft] = useState<string | null>(null)
  const loopInput = loopDraft ?? (isCustomLoopSteps ? String(loopSteps) : '')

  const commitLoopInput = () => {
    const n = parseInt(loopInput, 10)
    setLoopDraft(null)
    if (!isNaN(n) && n >= 1) onSetLoopSteps(n)
  }

  const handleLoopKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') commitLoopInput()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" showCloseButton={false} className="w-80 sm:max-w-sm p-0">
        <SheetHeader className="p-4 pb-0">
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription className="sr-only">Application settings</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          {/* Crosshair Mode */}
          <Section label="Crosshair Mode" icon={<Cpu size={14} />}>
            <Select value={controlMode} onValueChange={onSetControlMode}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {([
                  { key: 'centroid', label: 'Centroid', description: 'Follows center of mass of living cells' },
                  { key: 'manual', label: 'Manual', description: 'Mouse-controlled coordinate input' },
                  { key: 'traveler', label: 'Grey Pilgrim', description: 'Wanders toward nearby living cells' },
                  { key: 'lorenz', label: 'Lorenz', description: 'Chaotic butterfly attractor trajectory' },
                  { key: 'dvd', label: 'DVD Bounce', description: 'Bounces off grid edges like a DVD logo' },
                ] as const).map(({ key, label, description }) => (
                  <SelectItem key={key} value={key} label={label} description={description} />
                ))}
              </SelectContent>
            </Select>
          </Section>

          {/* Matrix Resolution */}
          <Section label="Matrix Resolution" icon={<Grid3X3 size={14} />}>
            <div className="flex rounded-md border border-input overflow-hidden">
              {GRID_OPTIONS.map((size) => (
                <button
                  key={size}
                  onClick={() => onChangeGridSize(size)}
                  className={`flex-1 px-2 py-1.5 text-sm font-medium transition-colors border-r last:border-r-0 border-input ${
                    gridSize === size
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-accent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {size}x{size}
                </button>
              ))}
            </div>
          </Section>

          {/* Genotype Seed */}
          <Section label="Genotype Seed">
            <div className="flex gap-2">
              <Input
                type="text"
                value={seed}
                onChange={(e) => onSetSeed(e.target.value)}
                className="flex-1 font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={onRandomize}>
                <Dice5 size={16} />
              </Button>
            </div>
          </Section>

          {/* Entropy / Mutation */}
          <Section label="Entropy / Mutation" icon={<Sparkles size={14} className="text-amber-500" />}>
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Rate</span>
              <span className="font-mono">{(mutationRate * 100).toFixed(2)}%</span>
            </div>
            <Slider
              min={0}
              max={0.01}
              step={0.0001}
              value={[mutationRate]}
              onValueChange={([v]) => onSetMutationRate(v)}
            />
          </Section>

          {/* Metronome */}
          <Section label="Metronome">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Tempo</span>
              <span className="font-mono">{tempo} BPM</span>
            </div>
            <Slider
              min={60}
              max={220}
              step={1}
              value={[tempo]}
              onValueChange={([v]) => onSetTempo(v)}
            />
          </Section>

          {/* Harmony */}
          <Section label="Harmony">
            <Select value={scale} onValueChange={onSetScale}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SCALE_INFO).map(([key, { label, description }]) => (
                  <SelectItem key={key} value={key} label={label} description={description} />
                ))}
              </SelectContent>
            </Select>
          </Section>

          {/* Voice Treatment */}
          <Section label="Voice Treatment">
            <Select value={treatment} onValueChange={onSetTreatment}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {([
                  { key: 'chord', label: 'Chord', description: 'All notes played simultaneously' },
                  { key: 'line', label: 'Line', description: 'Single melodic voice' },
                  { key: 'arpeggio', label: 'Arpeggio', description: 'Notes played in sequence' },
                ] as const).map(({ key, label, description }) => (
                  <SelectItem key={key} value={key} label={label} description={description} />
                ))}
              </SelectContent>
            </Select>
          </Section>

          {/* Dynamic Sensitivity */}
          <Section label="Dynamic Sensitivity">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Sensitivity</span>
              <span className="font-mono">{Math.round(dynamicSensitivity * 100)}%</span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[dynamicSensitivity]}
              onValueChange={([v]) => onSetDynamicSensitivity(v)}
            />
          </Section>

          {/* MIDI */}
          <Section label="MIDI" icon={<Music size={14} />}>
            {!midiSupported ? (
              <p className="text-xs text-muted-foreground">Not supported in this browser</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Send to MIDI output</span>
                  <Switch checked={midiEnabled} onCheckedChange={onSetMidiEnabled} />
                </div>

                {midiEnabled && (
                  <>
                    <Select
                      value={selectedMidiOutput}
                      onValueChange={onSetSelectedMidiOutput}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={midiOutputs.length === 0 ? 'No ports' : 'Select output'} />
                      </SelectTrigger>
                      <SelectContent>
                        {midiOutputs.map((port) => (
                          <SelectItem key={port.id} value={port.id} label={port.name || port.id} />
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex gap-2">
                      <Button
                        variant={isRecording ? 'destructive' : 'outline'}
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={onToggleRecording}
                      >
                        <Circle size={12} fill={isRecording ? 'currentColor' : 'none'} />
                        {isRecording ? 'Stop' : 'Record'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5"
                        disabled={!hasRecordedEvents}
                        onClick={onDownloadMidi}
                      >
                        <Download size={12} />
                        .mid
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </Section>

          {/* Loop Lock */}
          <Section label="Loop Lock" icon={<Repeat size={14} className="text-emerald-500" />}>
            <div className={`flex items-center justify-between ${loopLock ? 'mb-3' : ''}`}>
              <span className="text-sm text-muted-foreground">Record loop buffer</span>
              <Switch checked={loopLock} onCheckedChange={onSetLoopLock} />
            </div>
            {loopLock && (
              <>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {LOOP_STEP_PRESETS.map((n) => (
                    <Button
                      key={n}
                      variant={loopSteps === n ? 'default' : 'outline'}
                      size="sm"
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
                  className="font-mono text-sm"
                  placeholder="Custom length…"
                />
                {!isLoopFull && (
                  <div className="flex items-center justify-center gap-2 mt-3 py-2 text-sm text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" />
                    Recording loop… {loopRecordedSteps}/{loopSteps}
                  </div>
                )}
                {isLoopFull && (
                  <Button variant="outline" size="sm" className="w-full mt-3 gap-1.5" onClick={onExportLoop}>
                    <Download size={12} />
                    Export .mid
                  </Button>
                )}
              </>
            )}
          </Section>

          {/* Wipe Matrix */}
          <div className="pt-2">
            <Button
              variant="destructive"
              className="w-full gap-2"
              onClick={onClear}
            >
              <Trash2 size={16} /> Wipe Matrix
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
