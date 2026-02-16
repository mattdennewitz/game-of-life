# Dennewitz's Game of Life

A musical cellular automaton that sonifies Conway's Game of Life in real time. A crosshair scans a living grid and converts cell positions into pitched notes, producing evolving generative music from emergent patterns.

## Features

- Canvas-rendered Game of Life on a toroidal grid (32, 64, or 128 cells; default 64x64)
- 4 control modes for the scan crosshair: Centroid, Manual, Grey Pilgrim, Lorenz Attractor
- 7 scale systems: Diatonic, Pentatonic, Chromatic, Dorian, Just Simple, Just Extended, Quarter-tone (24-EDO)
- 3 voice treatments: Chord, Line, Arpeggio
- MIDI output to external hardware/software, recording, and Standard MIDI File export
- Loop lock with configurable step count
- Mutation/entropy injection for sustained evolution
- Seeded deterministic grids via sfc32 PRNG
- Click/drag cell painting
- Dark/light theme

## How It Works

### Conway's Game of Life

The grid follows standard Conway rules — cells survive with 2–3 neighbors, dead cells with exactly 3 neighbors are born. The grid uses **toroidal topology**: edges wrap, so every cell has 8 neighbors regardless of position. An optional **mutation layer** randomly flips cells each generation to prevent the grid from settling into static patterns.

### Grid-to-Music Mapping

A 3-column window centered on the crosshair scans for living cells. Each live cell's vertical position maps to a pitch across 3 octaves (octaves 3–5), quantized to the selected scale. Center-column cells play at full volume; flanking columns at 60%. Notes are sorted high-to-low and capped at 8 to prevent harmonic overload.

### Control Modes

- **Centroid** — the crosshair follows the center of mass of all living cells
- **Manual** — the crosshair tracks the mouse cursor position on the grid
- **Grey Pilgrim** — an autonomous wanderer influenced by gravity from nearby living cells (radius 7), with velocity decay (0.85), random angular jitter, and fixed speed (0.5 cells/step). Wraps toroidally.
- **Lorenz** — driven by the Lorenz chaotic attractor (σ=10, ρ=28, β=8/3, dt=0.005, 3 sub-steps per tick). The x and y coordinates of the attractor are mapped onto the grid.

### Audio Engine

Each note is a Web Audio oscillator routed through a gain envelope (20ms linear attack, exponential decay to silence) into a master gain node. Chord treatment uses triangle waves with volume-balanced polyphony; Line and Arpeggio treatments use sine waves.

### Voice Treatments

- **Chord** — all scanned notes play simultaneously, with volume inversely proportional to note count (max 0.15 per voice)
- **Line** — cycles through the note array one note per step
- **Arpeggio** — follows the index pattern [3, 2, 1, 0, 1, 2], wrapping into the available notes

### Sequencer Architecture

The sequencer uses a **look-ahead scheduling model**: a `setTimeout` loop fires every 25ms and schedules all notes whose start time falls within the next 100ms window. Times are expressed in AudioContext seconds for sample-accurate playback. The grid evolves every 4 sequencer steps; control mode positions update every step.

### MIDI

Frequencies are converted to MIDI note numbers via `12 * log2(f/440) + 69`, clamped to 0–127. Real-time output uses the Web MIDI API, scheduling note-on/off messages with `performance.now()` offsets synchronized to AudioContext time. Recording captures events with relative timestamps; export produces a **Standard MIDI File Format 0** with a single track, 480 PPQN resolution, and VLQ-encoded delta times.

### Seeded Randomness

Grid initialization uses the **sfc32** PRNG (Simple Fast Counter) seeded from a string hash. The threshold is 0.82, yielding approximately 18% initial cell density — enough to sustain interesting Life patterns without overcrowding.

### Canvas Rendering

Two stacked canvases: the bottom canvas draws the grid cells (foreground/background colors resolved from CSS custom properties via a DOM probe, since OKLch values aren't directly usable in canvas), and the top canvas draws the crosshair overlay with mode-specific colors and glow effects. Both canvases scale by `devicePixelRatio` for sharp rendering on high-DPI displays.

### Performance

Performance-critical state (grid array, live cell set, settings, positions) is stored in mutable refs rather than React state to avoid re-render overhead in the scheduling hot path. The live cell set uses flat `y * size + x` indices in a `Set<number>` for O(1) lookup. Visual updates are batched via `requestAnimationFrame`.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play / Pause |
| Shift+R | Toggle MIDI recording |
| Shift+L | Toggle loop lock |

## Tech Stack

React 19, TypeScript, Vite 7, Tailwind CSS 4, shadcn/ui, Radix UI, Web Audio API, Web MIDI API

## Getting Started

```bash
npm install
npm run dev
```

Or with Docker:

```bash
make start    # builds and runs in background
make logs     # follow container logs
make stop     # tear down
```

Open [http://localhost:5135](http://localhost:5135), click play, and listen.
