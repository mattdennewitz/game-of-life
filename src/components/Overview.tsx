import { ChevronDown, Keyboard } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface OverviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-[11px] font-mono text-muted-foreground">
      {children}
    </kbd>
  )
}

export default function Overview({ open, onOpenChange }: OverviewProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" showCloseButton={false} className="w-80 sm:max-w-sm p-0">
        <SheetHeader className="p-4 pb-0">
          <SheetTitle>Overview</SheetTitle>
          <SheetDescription className="sr-only">How this app works</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 text-sm text-muted-foreground">
          <Section label="What is this?">
            <p>
              An interactive musical cellular automaton. Conway's Game of Life evolves on a toroidal grid while a sequencer scans live cells and turns them into notes.
            </p>
          </Section>

          <Section label="Controls">
            <ul className="space-y-1.5 list-disc list-inside">
              <li>Click or drag on the grid to paint cells on/off</li>
              <li>Use the sidebar (left) to change settings</li>
              <li>Press Start or <Kbd>Space</Kbd> to play</li>
            </ul>
          </Section>

          <Section label="Crosshair Modes">
            <p className="mb-2">The crosshair determines which column of the grid is scanned for notes.</p>
            <ul className="space-y-1.5">
              <li><span className="text-foreground font-medium">Centroid</span> — follows the center of mass of all living cells</li>
              <li><span className="text-foreground font-medium">Manual</span> — tracks your mouse position on the grid</li>
              <li><span className="text-foreground font-medium">Grey Pilgrim</span> — an autonomous traveler that wanders toward nearby living cells</li>
              <li><span className="text-foreground font-medium">Lorenz</span> — driven by a chaotic Lorenz attractor trajectory</li>
            </ul>
          </Section>

          <Section label="Scales">
            <ul className="space-y-1 list-disc list-inside">
              <li>Diatonic (C major)</li>
              <li>Pentatonic</li>
              <li>Chromatic</li>
              <li>Dorian</li>
              <li>Just Simple</li>
              <li>Just Extended</li>
              <li>Quarter-tone</li>
            </ul>
          </Section>

          <Section label="Voices">
            <ul className="space-y-1.5">
              <li><span className="text-foreground font-medium">Chord</span> — all detected notes play simultaneously</li>
              <li><span className="text-foreground font-medium">Line</span> — single melodic voice, one note per step</li>
              <li><span className="text-foreground font-medium">Arpeggio</span> — notes cycle in a rising/falling pattern</li>
            </ul>
          </Section>

          <Section label="Keyboard Shortcuts" icon={<Keyboard size={14} />}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Play / Pause</span>
                <Kbd>Space</Kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Record MIDI</span>
                <Kbd>Shift R</Kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Loop Lock</span>
                <Kbd>Shift L</Kbd>
              </div>
            </div>
          </Section>

          <Section label="How it works" defaultOpen={false}>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>The grid evolves (Conway rules + mutation) every 4 sequencer steps</li>
              <li>A 3-column scan around the crosshair reads live cells as note pitches</li>
              <li>Up to 8 notes per step, quantized to the selected scale</li>
              <li>The grid wraps toroidally — edges connect to the opposite side</li>
              <li>Entropy/mutation randomly flips cells to keep the pattern alive</li>
            </ul>
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
