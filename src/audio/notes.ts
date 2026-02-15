export const SCALES: Record<string, number[]> = {
  diatonic: [0, 2, 4, 5, 7, 9, 11],
  pentatonic: [0, 2, 4, 7, 9],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  'just-simple': [0, 2, 4, 5, 7, 9, 11],
  'just-extended': [0, 2, 3, 5, 7, 8, 10],
  'quarter-tone': [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5],
}

export const SCALE_INFO: Record<string, { label: string; description: string }> = {
  diatonic:        { label: 'Diatonic',               description: 'Standard 7-note major scale' },
  pentatonic:      { label: 'Pentatonic',             description: 'Universal 5-note scale' },
  chromatic:       { label: 'Chromatic',              description: 'All 12 semitones' },
  dorian:          { label: 'Dorian',                 description: 'Minor scale with raised 6th' },
  'just-simple':   { label: 'Just Simple',            description: 'Pure ratios (3:2, 5:4, 6:5)' },
  'just-extended':  { label: 'Just Extended',         description: 'Higher primes (7, 11, 13-limit)' },
  'quarter-tone':  { label: 'Quarter-tone (24-EDO)',  description: '24 equal divisions of the octave' },
}

const BASE_OCTAVE = 3
const NUM_OCTAVES = 3
const MAX_NOTES = 8

export function calculateNotes(
  currentGrid: number[][],
  size: number,
  controlMode: string,
  manualPos: { x: number; y: number },
  scaleKey: string,
  travelerPos: { x: number; y: number } = { x: 16, y: 16 },
): { notes: number[]; pos: { x: number; y: number } } {
  let targetX: number
  let targetY: number

  if (controlMode === 'manual') {
    targetX = manualPos.x
    targetY = manualPos.y
  } else if (controlMode === 'traveler') {
    targetX = travelerPos.x
    targetY = travelerPos.y
  } else {
    let sumX = 0
    let sumY = 0
    let count = 0
    for (let y = 0; y < size; y++) {
      const row = currentGrid[y]
      for (let x = 0; x < size; x++) {
        if (row[x] === 1) {
          sumX += x
          sumY += y
          count++
        }
      }
    }

    if (count === 0) {
      targetX = size / 2
      targetY = size / 2
    } else {
      targetX = sumX / count
      targetY = sumY / count
    }
  }

  // Scan a 3-column window around the crosshair
  const centerCol = Math.round(targetX)
  const currentScale = SCALES[scaleKey]
  const scaleLen = currentScale.length

  const seen = new Set<number>()
  const notes: { freq: number; vol: number }[] = []

  for (let dc = -1; dc <= 1; dc++) {
    const col = ((centerCol + dc) % size + size) % size
    const vol = dc === 0 ? 1.0 : 0.6

    for (let row = 0; row < size; row++) {
      if (currentGrid[row][col] !== 1) continue

      const noteIndex = Math.floor((1 - row / size) * scaleLen * NUM_OCTAVES)
      const octave = BASE_OCTAVE + Math.floor(noteIndex / scaleLen)
      const degree = ((noteIndex % scaleLen) + scaleLen) % scaleLen
      const midi = currentScale[degree] + octave * 12

      if (seen.has(midi)) continue
      seen.add(midi)
      notes.push({ freq: Math.pow(2, (midi - 69) / 12) * 440, vol })
    }
  }

  // Sort high to low (top of grid = high pitch)
  notes.sort((a, b) => b.freq - a.freq)

  // Cap at MAX_NOTES
  const capped = notes.slice(0, MAX_NOTES)

  return {
    notes: capped.map((n) => n.freq),
    pos: { x: targetX, y: targetY },
  }
}
