# CLAUDE.md

Interactive musical cellular automaton — React + TypeScript + Web Audio + MIDI.

## Commands

```
npm run dev       # Vite dev server on port 5135
npm run build     # tsc -b && vite build
npm run lint      # eslint
npm test          # vitest
make start        # docker compose up --build -d
make stop         # docker compose down
```

## Architecture

```
src/
├── components/
│   ├── Dennewitz.tsx       # Root component — all state lives here
│   ├── Grid.tsx            # Dual-canvas renderer (grid + crosshair overlay)
│   ├── Header.tsx          # Play/pause, recording controls, loop lock, sidebar toggle
│   ├── Sidebar.tsx         # Settings sheet (scale, tempo, mode, MIDI, etc.)
│   ├── Footer.tsx          # Status bar (engine, resolution, entropy, BPM, harmony, voice, dynamics)
│   └── ui/                 # shadcn/ui primitives — do not edit directly
├── hooks/
│   ├── useSequencer.ts     # Main loop: scheduling, grid evolution, note triggering, Lorenz/traveler updates
│   ├── useGridInteraction.ts # Mouse paint (click/drag to toggle cells)
│   └── useMidi.ts          # Web MIDI device access, recording state
├── simulation/
│   ├── game-of-life.ts     # getNextGeneration() — Conway rules + mutation on toroidal grid
│   ├── random.ts           # sfc32 PRNG, seedFromString(), createRandomGrid() (18% density)
│   └── constants.ts        # GRID_OPTIONS [32, 64, 128], LOOP_STEP_PRESETS [3, 4, 5, 8, 16, 32, 64]
├── audio/
│   ├── engine.ts           # AudioEngine — oscillator → gain envelope → master gain
│   ├── notes.ts            # calculateNotes() — 3-column scan, scale quantization, max 8 notes
│   └── midi.ts             # MidiOutput (real-time), MidiRecorder, SMF Format 0 export (480 PPQN)
└── lib/
    └── utils.ts            # cn() — clsx + tailwind-merge
```

## Key Patterns

- **Mutable refs for hot paths**: `mutableGridRef`, `liveCellsRef`, `settingsRef`, `manualMouseRef`, `travelerRef`, `lorenzRef` — React state only for UI re-renders.
- **settingsRef.current inside callbacks**: Always read settings from the ref, never close over state values, to avoid stale closures in the scheduling loop.
- **Toroidal wrapping**: `(coord + size) % size` everywhere — grid neighbor counting, traveler position, note column scan.
- **Grid evolves every 4 sequencer steps** (stepRef.current % 4 === 0).
- **Look-ahead scheduling**: 100ms buffer, 25ms setTimeout tick, all times in AudioContext seconds.
- **Set<number> for live cells**: Flat index `y * size + x` for O(1) membership and fast iteration.

## Conventions

- Path alias: `@/` → `src/`
- shadcn/ui style: new-york, with cult-ui registry
- OKLch color space for CSS theme variables (resolved to rgb via DOM probe for canvas)
- Tailwind CSS 4 with `@tailwindcss/vite` plugin
- Grid sizes: 32, 64 (default), 128
- 7 scales: diatonic, pentatonic, chromatic, dorian, just-simple, just-extended, quarter-tone
- 4 control modes: centroid, manual, traveler (Grey Pilgrim), lorenz
- 3 voice treatments: chord, line, arpeggio (pattern [3,2,1,0,1,2])
