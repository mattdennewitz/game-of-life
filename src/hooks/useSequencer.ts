import { useState, useRef, useEffect, useCallback, type MutableRefObject } from 'react'
import { AudioEngine } from '@/audio/engine'
import { calculateNotes } from '@/audio/notes'
import { getNextGeneration } from '@/simulation/game-of-life'

export interface SequencerSettings {
  scale: string
  treatment: string
  tempo: number
  controlMode: string
  mutationRate: number
  gridSize: number
}

function updateTraveler(
  travelerRef: MutableRefObject<{ x: number; y: number; vx: number; vy: number }>,
  grid: number[][],
  gridSize: number,
) {
  const t = travelerRef.current
  // Compute gravity from nearby living cells
  let gx = 0
  let gy = 0
  const radius = 7
  for (let y = 0; y < gridSize; y++) {
    const row = grid[y]
    for (let x = 0; x < gridSize; x++) {
      if (row[x] !== 1) continue
      let dx = x - t.x
      let dy = y - t.y
      // Toroidal shortest distance
      if (dx > gridSize / 2) dx -= gridSize
      if (dx < -gridSize / 2) dx += gridSize
      if (dy > gridSize / 2) dy -= gridSize
      if (dy < -gridSize / 2) dy += gridSize
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 0 && dist < radius) {
        const strength = 1 / (dist * dist)
        gx += dx * strength
        gy += dy * strength
      }
    }
  }

  // Normalize gravity
  const gMag = Math.sqrt(gx * gx + gy * gy)
  if (gMag > 0) {
    gx /= gMag
    gy /= gMag
  }

  // Random perturbation
  const angle = Math.random() * Math.PI * 2
  const jitter = 0.3
  const rx = Math.cos(angle) * jitter
  const ry = Math.sin(angle) * jitter

  // Combine momentum + gravity + jitter
  const decay = 0.85
  let vx = t.vx * decay + gx * 0.4 + rx
  let vy = t.vy * decay + gy * 0.4 + ry

  // Normalize to fixed speed
  const speed = 0.5
  const vMag = Math.sqrt(vx * vx + vy * vy)
  if (vMag > 0) {
    vx = (vx / vMag) * speed
    vy = (vy / vMag) * speed
  }

  // Update position with toroidal wrapping
  t.vx = vx
  t.vy = vy
  t.x = ((t.x + vx) % gridSize + gridSize) % gridSize
  t.y = ((t.y + vy) % gridSize + gridSize) % gridSize
}

export function useSequencer(
  mutableGridRef: MutableRefObject<number[][]>,
  settingsRef: MutableRefObject<SequencerSettings>,
  manualMouseRef: MutableRefObject<{ x: number; y: number }>,
  travelerRef: MutableRefObject<{ x: number; y: number; vx: number; vy: number }>,
  setGrid: (g: number[][]) => void,
) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [centroid, setCentroid] = useState({ x: 16, y: 16 })

  const engineRef = useRef<AudioEngine | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextNoteTimeRef = useRef(0)
  const stepRef = useRef(0)

  useEffect(() => {
    engineRef.current = new AudioEngine()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const scheduleNextStep = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return

    const { tempo, treatment, gridSize, scale, controlMode, mutationRate } = settingsRef.current
    const secondsPerBeat = 60.0 / tempo / 4

    while (nextNoteTimeRef.current < engine.ctx.currentTime + 0.1) {
      const time = nextNoteTimeRef.current

      if (stepRef.current % 4 === 0) {
        const nextGrid = getNextGeneration(mutableGridRef.current, gridSize, mutationRate)
        mutableGridRef.current = nextGrid
        requestAnimationFrame(() => setGrid(nextGrid))
      }

      if (controlMode === 'traveler') {
        updateTraveler(travelerRef, mutableGridRef.current, gridSize)
      }

      const { notes, pos } = calculateNotes(
        mutableGridRef.current,
        gridSize,
        controlMode,
        manualMouseRef.current,
        scale,
        travelerRef.current,
      )
      requestAnimationFrame(() => setCentroid(pos))

      if (notes.length > 0) {
        if (treatment === 'chord') {
          notes.forEach((f, i) =>
            engine.playNote(f, time, secondsPerBeat * 2, 'triangle', 0.15 - i * 0.02),
          )
        } else if (treatment === 'line') {
          const note = notes[stepRef.current % notes.length]
          engine.playNote(note, time, secondsPerBeat * 3, 'sine', 0.2)
        } else if (treatment === 'arpeggio') {
          const arpPattern = [3, 2, 1, 0, 1, 2]
          const note = notes[arpPattern[stepRef.current % arpPattern.length]]
          engine.playNote(note, time, secondsPerBeat * 2, 'sine', 0.2)
        }
      }

      stepRef.current++
      nextNoteTimeRef.current += secondsPerBeat
    }

    timerRef.current = setTimeout(scheduleNextStep, 25)
  }, [mutableGridRef, settingsRef, manualMouseRef, travelerRef, setGrid])

  const togglePlay = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return

    if (!isPlaying) {
      engine.resume()
      nextNoteTimeRef.current = engine.ctx.currentTime + 0.05
      scheduleNextStep()
    } else {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying, scheduleNextStep])

  return { isPlaying, togglePlay, centroid }
}
