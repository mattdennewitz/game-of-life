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
  let targetX: number
  let targetY: number

  if (controlMode === 'manual') {
    targetX = manualPos.x
    targetY = manualPos.y
  } else if (controlMode === 'traveler') {
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
  const currentScale = SCALES[scaleKey]
  const scaleLen = scaleLength(currentScale)

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
