export const SCALES: Record<string, number[]> = {
  diatonic: [0, 2, 4, 5, 7, 9, 11],
  pentatonic: [0, 2, 4, 7, 9],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
}

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

  const currentScale = SCALES[scaleKey]
  const scaleDegree = targetX / size
  const scaleIndex = Math.floor(scaleDegree * currentScale.length * 2)
  const baseOctave = Math.floor((1 - targetY / size) * 5) + 1

  const midiNotes = [
    currentScale[scaleIndex % currentScale.length] + baseOctave * 12,
    currentScale[(scaleIndex + 2) % currentScale.length] + baseOctave * 12,
    currentScale[(scaleIndex + 4) % currentScale.length] + (baseOctave + 1) * 12,
    currentScale[(scaleIndex + 1) % currentScale.length] + (baseOctave - 1) * 12,
  ]

  return {
    notes: midiNotes.map((n) => Math.pow(2, (n - 69) / 12) * 440),
    pos: { x: targetX, y: targetY },
  }
}
