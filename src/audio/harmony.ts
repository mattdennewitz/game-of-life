import type { NoteInfo } from './notes'

// --- Consonance scoring ---

// Interval (in semitones) → consonance score
const INTERVAL_SCORE: Record<number, number> = {
  0: 10,  // unison
  1: 1,   // min 2nd
  2: 3,   // maj 2nd
  3: 5,   // min 3rd
  4: 6,   // maj 3rd
  5: 7,   // P4
  6: 1,   // tritone
  7: 8,   // P5
  8: 4,   // min 6th
  9: 6,   // maj 6th (same weight as maj 3rd — inversion)
  10: 3,  // min 7th
  11: 2,  // maj 7th
}

function intervalScore(semitonesApart: number): number {
  const interval = Math.abs(Math.round(semitonesApart)) % 12
  return INTERVAL_SCORE[interval] ?? 1
}

function pairwiseConsonance(notes: NoteInfo[]): number {
  let score = 0
  for (let i = 0; i < notes.length; i++) {
    for (let j = i + 1; j < notes.length; j++) {
      score += intervalScore(notes[i].midi - notes[j].midi) * notes[i].vol * notes[j].vol
    }
  }
  return score
}

// --- Consonance-based note selection ---

export function selectByConsonance(candidates: NoteInfo[], maxNotes: number, density: number, minConsonance = 0): NoteInfo[] {
  // Fewer notes when sparse, more when dense
  const target = Math.max(2, Math.min(maxNotes, Math.round(2 + density * 24)))
  if (candidates.length <= target) return candidates

  // Greedy: start with highest note, add best consonance partner each round
  const selected: NoteInfo[] = [candidates[0]]
  const remaining = new Set(candidates.slice(1))

  while (selected.length < target && remaining.size > 0) {
    let bestCandidate: NoteInfo | null = null
    let bestScore = -1

    for (const candidate of remaining) {
      // Enforce consonance floor: reject candidates forming harsh intervals
      if (minConsonance > 0) {
        let dissonant = false
        for (const s of selected) {
          if (intervalScore(candidate.midi - s.midi) < minConsonance) {
            dissonant = true
            break
          }
        }
        if (dissonant) continue
      }

      let score = 0
      for (const s of selected) {
        score += intervalScore(candidate.midi - s.midi) * candidate.vol * s.vol
      }
      // Register spread: prefer notes that expand the range
      const avgMidi = selected.reduce((sum, n) => sum + n.midi, 0) / selected.length
      score += Math.abs(candidate.midi - avgMidi) * 0.3
      // Prefer stable (older) cells
      score += Math.min(candidate.age, 5) * 0.2
      if (score > bestScore) {
        bestScore = score
        bestCandidate = candidate
      }
    }

    if (bestCandidate) {
      selected.push(bestCandidate)
      remaining.delete(bestCandidate)
    } else {
      break  // all remaining candidates are dissonant with selected set
    }
  }

  // Sort high to low to maintain pitch ordering
  selected.sort((a, b) => b.freq - a.freq)
  return selected
}

// --- Chord voicing ---

export interface VoicedChord {
  notes: NoteInfo[]
  consonance: number
}

export function voiceChord(candidates: NoteInfo[], previousMidis: number[]): VoicedChord {
  if (candidates.length <= 3) {
    return { notes: candidates, consonance: pairwiseConsonance(candidates) }
  }

  // Target 3-5 voices from up to 8 candidates
  const targetMin = 3
  const targetMax = Math.min(5, candidates.length)

  let bestSubset: NoteInfo[] = candidates.slice(0, targetMin)
  let bestScore = -Infinity

  // Enumerate subsets of size targetMin..targetMax
  for (let size = targetMin; size <= targetMax; size++) {
    enumerateSubsets(candidates, size, (subset) => {
      let score = pairwiseConsonance(subset)

      // Voice leading: penalize movement, reward common tones
      if (previousMidis.length > 0) {
        let movementPenalty = 0
        let commonTones = 0
        for (const n of subset) {
          let minDist = Infinity
          for (const prev of previousMidis) {
            const dist = Math.abs(n.midi - prev)
            minDist = Math.min(minDist, dist)
            if (dist === 0) commonTones++
          }
          movementPenalty += minDist
        }
        score -= movementPenalty * 1.5
        score += commonTones * 4
      }

      // Penalize two voices within minor 3rd below ~250Hz (MIDI 59 = B3)
      for (let i = 0; i < subset.length; i++) {
        for (let j = i + 1; j < subset.length; j++) {
          if (subset[i].midi < 59 && subset[j].midi < 59 &&
              Math.abs(subset[i].midi - subset[j].midi) < 3) {
            score -= 8
          }
        }
      }

      if (score > bestScore) {
        bestScore = score
        bestSubset = [...subset]
      }
    })
  }

  bestSubset.sort((a, b) => b.freq - a.freq)
  return { notes: bestSubset, consonance: bestScore }
}

function enumerateSubsets(arr: NoteInfo[], size: number, callback: (subset: NoteInfo[]) => void) {
  const n = arr.length
  if (size > n) return

  const indices = Array.from({ length: size }, (_, i) => i)
  callback(indices.map(i => arr[i]))

  while (true) {
    let i = size - 1
    while (i >= 0 && indices[i] === i + n - size) i--
    if (i < 0) break
    indices[i]++
    for (let j = i + 1; j < size; j++) indices[j] = indices[j - 1] + 1
    callback(indices.map(idx => arr[idx]))
  }
}

// --- Melodic intelligence ---

export interface MelodicState {
  lastNote: number | null  // MIDI number
  direction: 1 | -1
  stepsSinceRest: number
  stepsSinceLeap: number
}

export function createMelodicState(): MelodicState {
  return { lastNote: null, direction: 1, stepsSinceRest: 0, stepsSinceLeap: 0 }
}

export interface MelodicChoice {
  note: NoteInfo | null  // null = rest
  duration: number       // multiplier for base duration
}

export function chooseMelodicNote(
  candidates: NoteInfo[],
  state: MelodicState,
): MelodicChoice {
  if (candidates.length === 0) {
    state.stepsSinceRest = 0
    return { note: null, duration: 1 }
  }

  // Insert rest after 6-10 steps when candidates are sparse
  if (state.stepsSinceRest > 6 && candidates.length < 3) {
    state.stepsSinceRest = 0
    return { note: null, duration: 1 }
  }
  if (state.stepsSinceRest > 10) {
    state.stepsSinceRest = 0
    return { note: null, duration: 1 }
  }

  // No previous note — pick center of range
  if (state.lastNote === null) {
    const mid = Math.floor(candidates.length / 2)
    const note = candidates[mid]
    state.lastNote = note.midi
    state.stepsSinceRest++
    state.stepsSinceLeap++
    return { note, duration: ageToDuration(note.age) }
  }

  // Score each candidate
  let bestNote = candidates[0]
  let bestScore = -Infinity

  for (const c of candidates) {
    const dist = Math.abs(c.midi - state.lastNote)
    let score = 0

    // Prefer stepwise motion (within 4 semitones)
    if (dist <= 4) {
      score += 10 - dist
    } else if (dist <= 7) {
      score += 3
    } else {
      score += 1
    }

    // Prefer motion in current direction
    const movesInDir = (state.direction === 1 && c.midi > state.lastNote) ||
                       (state.direction === -1 && c.midi < state.lastNote)
    if (movesInDir) score += 2

    // Occasional leap incentive
    if (state.stepsSinceLeap > 8 && dist > 5) {
      score += 4
    }

    // Prefer consonant intervals with last note
    score += intervalScore(c.midi - state.lastNote) * 0.5

    // Weight by column volume
    score *= c.vol

    if (score > bestScore) {
      bestScore = score
      bestNote = c
    }
  }

  // Update state
  if (bestNote.midi !== state.lastNote) {
    state.direction = bestNote.midi > state.lastNote ? 1 : -1
  }
  if (Math.abs(bestNote.midi - state.lastNote) > 4) {
    state.stepsSinceLeap = 0
  } else {
    state.stepsSinceLeap++
  }
  state.lastNote = bestNote.midi
  state.stepsSinceRest++

  return { note: bestNote, duration: ageToDuration(bestNote.age) }
}

function ageToDuration(age: number): number {
  if (age > 3) return 1.5
  if (age > 1) return 1.0
  return 0.6
}

// --- Arpeggio pattern bank ---

const ARP_PATTERNS: Record<string, number[]> = {
  pendulum:   [3, 2, 1, 0, 1, 2],
  ascending:  [0, 1, 2, 3],
  descending: [3, 2, 1, 0],
  skip:       [0, 2, 1, 3, 0, 3],
  spiral:     [0, 3, 1, 2],
}

const PATTERN_KEYS = Object.keys(ARP_PATTERNS)

export function selectArpPattern(density: number): number[] {
  // Deterministic selection based on density ranges
  let idx: number
  if (density < 0.05) {
    idx = 0  // pendulum — gentle
  } else if (density < 0.12) {
    idx = 1  // ascending
  } else if (density < 0.22) {
    idx = 4  // spiral
  } else if (density < 0.35) {
    idx = 2  // descending
  } else {
    idx = 3  // skip — energetic
  }
  return ARP_PATTERNS[PATTERN_KEYS[idx]]
}

// --- Dynamic range ---

export interface DynamicsResult {
  volume: number     // 0-1 overall volume
  velocity: number   // MIDI velocity 0-127
  rest: boolean      // true = produce silence
}

export function computeDynamics(
  density: number,
  previousDensity: number | null,
  step: number,
  sensitivity: number,  // 0-1, 0 = flat dynamics
): DynamicsResult {
  // Normalize density to 0-1 with compression at extremes
  let normalized: number
  if (density < 0.03) {
    normalized = 0
  } else if (density > 0.5) {
    normalized = 1
  } else {
    normalized = Math.pow((density - 0.03) / 0.47, 0.7)
  }

  // Sensitivity scales the dynamic RANGE around center volume.
  // At sensitivity 0: flat at 0.5 regardless of density.
  // At sensitivity 1: full range from 0.05 to 0.95.
  const center = 0.5
  const halfRange = sensitivity * 0.45
  const volume = center - halfRange + normalized * halfRange * 2

  // Accent from density change
  let accent = 0
  if (previousDensity !== null) {
    const change = Math.abs(density - previousDensity)
    if (change > 0.03) accent = 10
    if (change > 0.06) accent = 20
    if (change > 0.1) accent = 30
  }

  // Metric feel
  let beatAccent = 0
  if (step % 16 === 0) beatAccent = 12
  else if (step % 4 === 0) beatAccent = 6

  const baseVelocity = Math.round(volume * 100)
  const velocity = Math.min(127, baseVelocity + Math.round((accent + beatAccent) * sensitivity))

  const rest = density < 0.03 && sensitivity > 0.3

  return { volume, velocity, rest }
}
