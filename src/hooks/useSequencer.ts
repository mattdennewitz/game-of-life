import { useState, useRef, useEffect, useCallback, type MutableRefObject } from 'react'
import { AudioEngine } from '@/audio/engine'
import { calculateNotes } from '@/audio/notes'
import { getNextGeneration } from '@/simulation/game-of-life'
import type { MidiOutput, MidiRecorder } from '@/audio/midi'

export interface LorenzState {
  x: number
  y: number
  z: number
  gridX: number
  gridY: number
}

function updateLorenz(lorenzRef: MutableRefObject<LorenzState>, gridSize: number) {
  const s = lorenzRef.current
  const sigma = 10
  const rho = 28
  const beta = 8 / 3
  const dt = 0.005
  const subSteps = 3

  for (let i = 0; i < subSteps; i++) {
    const dx = sigma * (s.y - s.x)
    const dy = s.x * (rho - s.z) - s.y
    const dz = s.x * s.y - beta * s.z
    s.x += dx * dt
    s.y += dy * dt
    s.z += dz * dt
  }

  // Map Lorenz x ∈ ~[-20,20] and y ∈ ~[-25,25] to [0, gridSize)
  s.gridX = Math.max(0, Math.min(gridSize - 0.01, ((s.x + 20) / 40) * gridSize))
  s.gridY = Math.max(0, Math.min(gridSize - 0.01, ((s.y + 25) / 50) * gridSize))
}

export interface SequencerSettings {
  scale: string
  treatment: string
  tempo: number
  controlMode: string
  mutationRate: number
  gridSize: number
  loopLock: boolean
  loopSteps: number
}

function updateTraveler(
  travelerRef: MutableRefObject<{ x: number; y: number; vx: number; vy: number }>,
  liveCells: Set<number>,
  gridSize: number,
) {
  const t = travelerRef.current
  // Compute gravity from nearby living cells
  let gx = 0
  let gy = 0
  const radius = 7
  for (const idx of liveCells) {
    const x = idx % gridSize
    const y = Math.floor(idx / gridSize)
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

export function buildLiveCellsSet(grid: number[][], size: number): Set<number> {
  const set = new Set<number>()
  for (let y = 0; y < size; y++) {
    const row = grid[y]
    for (let x = 0; x < size; x++) {
      if (row[x] === 1) set.add(y * size + x)
    }
  }
  return set
}

export function useSequencer(
  mutableGridRef: MutableRefObject<number[][]>,
  liveCellsRef: MutableRefObject<Set<number>>,
  settingsRef: MutableRefObject<SequencerSettings>,
  manualMouseRef: MutableRefObject<{ x: number; y: number }>,
  travelerRef: MutableRefObject<{ x: number; y: number; vx: number; vy: number }>,
  lorenzRef: MutableRefObject<LorenzState>,
  setGrid: (g: number[][]) => void,
  midiOutputRef?: MutableRefObject<MidiOutput>,
  midiRecorderRef?: MutableRefObject<MidiRecorder>,
) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [centroid, setCentroid] = useState({ x: 16, y: 16 })

  const engineRef = useRef<AudioEngine | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextNoteTimeRef = useRef(0)
  const stepRef = useRef(0)
  const loopBufferRef = useRef<{ notes: number[]; pos: { x: number; y: number } }[]>([])

  useEffect(() => {
    engineRef.current = new AudioEngine()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const scheduleNextStep = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return

    const { tempo, treatment, gridSize, scale, controlMode, mutationRate, loopLock, loopSteps } = settingsRef.current
    const secondsPerBeat = 60.0 / tempo / 4

    while (nextNoteTimeRef.current < engine.ctx.currentTime + 0.1) {
      const time = nextNoteTimeRef.current

      const loopFull = loopLock && loopBufferRef.current.length >= loopSteps

      // Pause evolution and movement when loop is replaying
      if (!loopFull) {
        if (stepRef.current % 4 === 0) {
          const nextGrid = getNextGeneration(mutableGridRef.current, gridSize, mutationRate)
          mutableGridRef.current = nextGrid
          liveCellsRef.current = buildLiveCellsSet(nextGrid, gridSize)
          requestAnimationFrame(() => setGrid(nextGrid))
        }

        if (controlMode === 'traveler') {
          updateTraveler(travelerRef, liveCellsRef.current, gridSize)
        } else if (controlMode === 'lorenz') {
          updateLorenz(lorenzRef, gridSize)
        }
      }

      let notes: number[]
      let pos: { x: number; y: number }

      if (loopFull) {
        const entry = loopBufferRef.current[stepRef.current % loopSteps]
        notes = entry.notes
        pos = entry.pos
      } else {
        const live = calculateNotes(
          mutableGridRef.current,
          gridSize,
          controlMode,
          manualMouseRef.current,
          scale,
          travelerRef.current,
          lorenzRef.current,
          liveCellsRef.current,
        )
        notes = live.notes
        pos = live.pos

        if (loopLock) {
          loopBufferRef.current.push({ notes, pos })
        }
      }

      if (!loopLock) {
        loopBufferRef.current = []
      }

      requestAnimationFrame(() => setCentroid(pos))

      if (notes.length > 0) {
        if (treatment === 'chord') {
          const vol = Math.min(0.15, 0.4 / notes.length)
          const velocity = Math.round(Math.min(127, vol / 0.2 * 100))
          notes.forEach((f) => {
            engine.playNote(f, time, secondsPerBeat * 2, 'triangle', vol)
            midiOutputRef?.current.sendNote(f, time, secondsPerBeat * 2, velocity, engine.ctx.currentTime)
            if (midiRecorderRef?.current.isActive()) midiRecorderRef.current.recordNote(f, time, secondsPerBeat * 2, velocity)
          })
        } else if (treatment === 'line') {
          const note = notes[stepRef.current % notes.length]
          engine.playNote(note, time, secondsPerBeat * 3, 'sine', 0.2)
          midiOutputRef?.current.sendNote(note, time, secondsPerBeat * 3, 100, engine.ctx.currentTime)
          if (midiRecorderRef?.current.isActive()) midiRecorderRef.current.recordNote(note, time, secondsPerBeat * 3, 100)
        } else if (treatment === 'arpeggio') {
          const arpPattern = [3, 2, 1, 0, 1, 2]
          const idx = arpPattern[stepRef.current % arpPattern.length] % notes.length
          const note = notes[idx]
          engine.playNote(note, time, secondsPerBeat * 2, 'sine', 0.2)
          midiOutputRef?.current.sendNote(note, time, secondsPerBeat * 2, 100, engine.ctx.currentTime)
          if (midiRecorderRef?.current.isActive()) midiRecorderRef.current.recordNote(note, time, secondsPerBeat * 2, 100)
        }
      }

      stepRef.current++
      nextNoteTimeRef.current += secondsPerBeat
    }

    timerRef.current = setTimeout(scheduleNextStep, 25)
  }, [mutableGridRef, liveCellsRef, settingsRef, manualMouseRef, travelerRef, lorenzRef, setGrid, midiOutputRef, midiRecorderRef])

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

  return { isPlaying, togglePlay, centroid, engineRef }
}
