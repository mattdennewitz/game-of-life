export interface NoteInfo {
  freq: number
  midi: number
  vol: number
  row: number
  col: number
  age: number
}

export interface ScanResult {
  notes: NoteInfo[]
  pos: { x: number; y: number }
  density: number
  totalFound: number
}

interface SemitoneScale { type: 'semitone'; offsets: number[] }
interface RatioScale    { type: 'ratio';    ratios: number[] }
export type ScaleDef = SemitoneScale | RatioScale

export const SCALES: Record<string, ScaleDef> = {
  diatonic:        { type: 'semitone', offsets: [0, 2, 4, 5, 7, 9, 11] },
  pentatonic:      { type: 'semitone', offsets: [0, 2, 4, 7, 9] },
  chromatic:       { type: 'semitone', offsets: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  dorian:          { type: 'semitone', offsets: [0, 2, 3, 5, 7, 9, 10] },
  'just-simple':   { type: 'ratio',    ratios: [1, 9/8, 5/4, 4/3, 3/2, 5/3, 15/8] },
  'just-extended': { type: 'ratio',    ratios: [1, 8/7, 7/6, 4/3, 3/2, 8/5, 7/4] },
  'quarter-tone':  { type: 'semitone', offsets: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5] },
}

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']

function formatSemitoneNote(midi: number): string {
  return NOTE_NAMES[((midi % 12) + 12) % 12] + Math.floor(midi / 12 - 1)
}

function formatQuarterToneNote(n: NoteInfo): string {
  const nearest = Math.round(n.midi)
  const diff = n.midi - nearest
  const name = formatSemitoneNote(nearest)
  if (diff > 0.25) return name + '↑'
  if (diff < -0.25) return name + '↓'
  return name
}

function formatRatioNote(n: NoteInfo, scale: RatioScale): string {
  // Reverse-lookup: find which ratio × root produced this frequency
  const octave = Math.floor(n.midi / 12)
  const rootMidi = octave * 12
  const rootFreq = Math.pow(2, (rootMidi - 69) / 12) * 440
  const actualRatio = n.freq / rootFreq

  let bestIdx = 0
  let bestDiff = Infinity
  for (let i = 0; i < scale.ratios.length; i++) {
    const diff = Math.abs(actualRatio - scale.ratios[i])
    if (diff < bestDiff) { bestDiff = diff; bestIdx = i }
  }

  const r = scale.ratios[bestIdx]
  // Format ratio as fraction or integer
  const label = formatRatioLabel(r)
  return `${label}·${octave - 1}`
}

function formatRatioLabel(r: number): string {
  if (r === 1) return '1'
  // Try common fractions
  for (const d of [2, 3, 4, 5, 6, 7, 8]) {
    const n = r * d
    if (Math.abs(n - Math.round(n)) < 0.001) {
      return `${Math.round(n)}/${d}`
    }
  }
  return r.toFixed(3)
}

export function formatPlayingNotes(notes: NoteInfo[], scaleKey: string): string {
  if (notes.length === 0) return '—'
  const scale = SCALES[scaleKey]
  if (scale.type === 'ratio') {
    return notes.map(n => formatRatioNote(n, scale)).join('  ')
  }
  if (scaleKey === 'quarter-tone') {
    return notes.map(n => formatQuarterToneNote(n)).join('  ')
  }
  return notes.map(n => formatSemitoneNote(n.midi)).join('  ')
}

export const SCALE_INFO: Record<string, { label: string; description: string }> = {
  diatonic:        { label: 'Diatonic',               description: 'Standard 7-note major scale' },
  pentatonic:      { label: 'Pentatonic',             description: 'Universal 5-note scale' },
  chromatic:       { label: 'Chromatic',              description: 'All 12 semitones' },
  dorian:          { label: 'Dorian',                 description: 'Minor scale with raised 6th' },
  'just-simple':   { label: 'Just Simple',            description: '5-limit pure ratios (5:4, 3:2, 5:3)' },
  'just-extended': { label: 'Just Extended',          description: '7-limit septimal ratios (7:6, 7:4)' },
  'quarter-tone':  { label: 'Quarter-tone (24-EDO)',  description: '24 equal divisions of the octave' },
}

function scaleLength(scale: ScaleDef): number {
  return scale.type === 'semitone' ? scale.offsets.length : scale.ratios.length
}

function scaleNoteToFreq(scale: ScaleDef, octave: number, degree: number): { freq: number; midi: number } {
  if (scale.type === 'semitone') {
    const midi = scale.offsets[degree] + octave * 12
    return { freq: Math.pow(2, (midi - 69) / 12) * 440, midi }
  }
  // Ratio scale: root of this octave * ratio
  const rootMidi = octave * 12  // C of this octave in MIDI
  const rootFreq = Math.pow(2, (rootMidi - 69) / 12) * 440
  const freq = rootFreq * scale.ratios[degree]
  // Approximate MIDI for compatibility (nearest semitone)
  const midi = Math.round(12 * Math.log2(freq / 440) + 69)
  return { freq, midi }
}

const BASE_OCTAVE = 3
const NUM_OCTAVES = 3

/**
 * Music Mouse-inspired manual mode.
 *
 * Generates scale degrees spanning roughly one octave below to one octave
 * above the cursor's root pitch.  Each candidate is cell-gated so the
 * automaton still sculpts the output.  Chord mode picks consonant subsets
 * via selectByConsonance/voiceChord; line and arpeggio modes get enough
 * stepwise candidates for real melodies.
 *
 * X-axis spread displaces upper degrees across extra octaves (close voicing
 * at center, open voicing at edges).
 */
const MANUAL_HALF_SPAN = 7  // degrees above and below root to scan

function buildManualVoices(
  x: number, y: number, size: number,
  currentScale: ScaleDef, scaleLen: number,
  currentGrid: number[][], ageGrid?: number[][],
): { notes: NoteInfo[], density: number, totalFound: number } {
  const totalDegrees = scaleLen * NUM_OCTAVES
  // Y axis → root scale degree (top = high, bottom = low)
  const rootDegree = Math.floor((1 - y / size) * (totalDegrees - 1))
  // X axis → voicing spread (0 at center, 1 at edges)
  const spread = Math.abs(x - size / 2) / (size / 2)

  const col = Math.round(x)
  const notes: NoteInfo[] = []
  const seen = new Set<number>()

  // Count cells in ±5 radius for density
  let densityCount = 0
  for (let dr = -5; dr <= 5; dr++) {
    for (let dc = -5; dc <= 5; dc++) {
      const r = ((Math.round(y) + dr) % size + size) % size
      const c = ((col + dc) % size + size) % size
      if (currentGrid[r][c] === 1) densityCount++
    }
  }

  for (let offset = -MANUAL_HALF_SPAN; offset <= MANUAL_HALF_SPAN; offset++) {
    // Spread displacement: degrees further from root get pushed into higher octaves
    const spreadShift = offset > 0 ? Math.round((offset / MANUAL_HALF_SPAN) * spread * scaleLen) : 0
    const degree = rootDegree + offset + spreadShift

    if (degree < 0 || degree >= totalDegrees) continue

    const octave = BASE_OCTAVE + Math.floor(degree / scaleLen)
    const degInScale = ((degree % scaleLen) + scaleLen) % scaleLen
    const { freq, midi } = scaleNoteToFreq(currentScale, octave, degInScale)

    // Dedup by pitch
    const freqKey = Math.round(freq * 100)
    if (seen.has(freqKey)) continue
    seen.add(freqKey)

    // Map pitch back to grid row
    const voiceRow = Math.round((1 - degree / (totalDegrees - 1)) * (size - 1))

    // Check ±3 rows, ±1 col neighborhood for a living cell (toroidal)
    let gated = false
    let cellAge = 0
    for (let dr = -3; dr <= 3 && !gated; dr++) {
      for (let dc = -1; dc <= 1 && !gated; dc++) {
        const r = ((voiceRow + dr) % size + size) % size
        const c = ((col + dc) % size + size) % size
        if (currentGrid[r][c] === 1) {
          gated = true
          cellAge = ageGrid ? ageGrid[r][c] : 0
        }
      }
    }

    if (gated) {
      // Root and chord tones (3rd, 5th, 7th) get full volume; passing tones softer
      const isChordTone = (offset === 0 || offset === 2 || offset === 4 || offset === 6)
      const vol = isChordTone ? 1.0 : 0.6
      notes.push({ freq, midi, vol, row: voiceRow, col, age: cellAge })
    }
  }

  notes.sort((a, b) => b.freq - a.freq)
  const area = 11 * 11 // ±5 radius
  return { notes, density: densityCount / area, totalFound: densityCount }
}

export function calculateNotes(
  currentGrid: number[][],
  size: number,
  controlMode: string,
  manualPos: { x: number; y: number },
  scaleKey: string,
  travelerPos: { x: number; y: number } = { x: 16, y: 16 },
  lorenzPos: { gridX: number; gridY: number } = { gridX: 16, gridY: 16 },
  bouncePos: { x: number; y: number } = { x: 16, y: 16 },
  liveCells?: Set<number>,
  ageGrid?: number[][],
): ScanResult {
  const currentScale = SCALES[scaleKey]
  const scaleLen = scaleLength(currentScale)

  // Manual mode: Music Mouse-style harmonic space
  if (controlMode === 'manual') {
    const { notes, density, totalFound } = buildManualVoices(
      manualPos.x, manualPos.y, size, currentScale, scaleLen, currentGrid, ageGrid,
    )
    return { notes, pos: { x: manualPos.x, y: manualPos.y }, density, totalFound }
  }

  let targetX: number
  let targetY: number

  if (controlMode === 'traveler') {
    targetX = travelerPos.x
    targetY = travelerPos.y
  } else if (controlMode === 'lorenz') {
    targetX = lorenzPos.gridX
    targetY = lorenzPos.gridY
  } else if (controlMode === 'dvd') {
    targetX = bouncePos.x
    targetY = bouncePos.y
  } else if (liveCells && liveCells.size > 0) {
    let sumX = 0
    let sumY = 0
    for (const idx of liveCells) {
      sumX += idx % size
      sumY += Math.floor(idx / size)
    }
    targetX = sumX / liveCells.size
    targetY = sumY / liveCells.size
  } else {
    targetX = size / 2
    targetY = size / 2
  }

  // Scan a 3-column window around the crosshair
  const centerCol = Math.round(targetX)

  const seen = new Set<number>()
  const notes: NoteInfo[] = []
  let foundCount = 0

  for (let dc = -1; dc <= 1; dc++) {
    const col = ((centerCol + dc) % size + size) % size
    const vol = dc === 0 ? 1.0 : 0.6

    for (let row = 0; row < size; row++) {
      if (currentGrid[row][col] !== 1) continue
      foundCount++

      const noteIndex = Math.floor((1 - row / size) * scaleLen * NUM_OCTAVES)
      const octave = BASE_OCTAVE + Math.floor(noteIndex / scaleLen)
      const degree = ((noteIndex % scaleLen) + scaleLen) % scaleLen
      const { freq, midi } = scaleNoteToFreq(currentScale, octave, degree)

      // Dedup by frequency (cent-level precision for JI and quarter-tone)
      const freqKey = Math.round(freq * 100)
      if (seen.has(freqKey)) continue
      seen.add(freqKey)

      const age = ageGrid ? ageGrid[row][col] : 0
      notes.push({ freq, midi, vol, row, col, age })
    }
  }

  // Sort high to low (top of grid = high pitch)
  notes.sort((a, b) => b.freq - a.freq)

  return {
    notes,
    pos: { x: targetX, y: targetY },
    density: foundCount / (3 * size),
    totalFound: foundCount,
  }
}
