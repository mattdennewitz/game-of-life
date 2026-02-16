import { useState, useRef, useEffect, useCallback, type MutableRefObject } from 'react'
import { AudioEngine } from '@/audio/engine'
import { calculateNotes, type ScanResult } from '@/audio/notes'
import {
  selectByConsonance, voiceChord, chooseMelodicNote, selectArpPattern, computeDynamics,
  createMelodicState, type MelodicState,
} from '@/audio/harmony'
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
  dynamicSensitivity: number
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
  ageGridRef: MutableRefObject<number[][]>,
  midiOutputRef?: MutableRefObject<MidiOutput>,
  midiRecorderRef?: MutableRefObject<MidiRecorder>,
) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [centroid, setCentroid] = useState({ x: 16, y: 16 })
  const [isLoopFull, setIsLoopFull] = useState(false)
  const [loopRecordedSteps, setLoopRecordedSteps] = useState(0)

  const engineRef = useRef<AudioEngine | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextNoteTimeRef = useRef(0)
  const stepRef = useRef(0)
  const loopBufferRef = useRef<ScanResult[]>([])
  const prevChordRef = useRef<number[]>([])
  const melodicStateRef = useRef<MelodicState>(createMelodicState())
  const prevDensityRef = useRef<number | null>(null)

  useEffect(() => {
    engineRef.current = new AudioEngine()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // Poll buffer ref at UI frequency to update loop recording state
  useEffect(() => {
    if (!isPlaying) {
      setIsLoopFull(false)
      setLoopRecordedSteps(0)
      return
    }
    const id = setInterval(() => {
      const { loopLock, loopSteps } = settingsRef.current
      if (loopLock) {
        const len = loopBufferRef.current.length
        setLoopRecordedSteps(Math.min(len, loopSteps))
        setIsLoopFull(len >= loopSteps)
      } else {
        setIsLoopFull(false)
        setLoopRecordedSteps(0)
      }
    }, 100)
    return () => clearInterval(id)
  }, [isPlaying, settingsRef])

  const scheduleNextStep = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return

    const { tempo, treatment, gridSize, scale, controlMode, mutationRate, loopLock, loopSteps, dynamicSensitivity } = settingsRef.current
    const secondsPerBeat = 60.0 / tempo / 4

    while (nextNoteTimeRef.current < engine.ctx.currentTime + 0.1) {
      const time = nextNoteTimeRef.current

      const loopFull = loopLock && loopBufferRef.current.length >= loopSteps

      // Pause evolution and movement when loop is replaying
      if (!loopFull) {
        if (stepRef.current % 4 === 0) {
          const { grid: nextGrid, ages } = getNextGeneration(mutableGridRef.current, ageGridRef.current, gridSize, mutationRate)
          mutableGridRef.current = nextGrid
          ageGridRef.current = ages
          liveCellsRef.current = buildLiveCellsSet(nextGrid, gridSize)
          requestAnimationFrame(() => setGrid(nextGrid))
        }

        if (controlMode === 'traveler') {
          updateTraveler(travelerRef, liveCellsRef.current, gridSize)
        } else if (controlMode === 'lorenz') {
          updateLorenz(lorenzRef, gridSize)
        }
      }

      let scanResult: ScanResult

      if (loopFull) {
        scanResult = loopBufferRef.current[stepRef.current % loopSteps]
      } else {
        scanResult = calculateNotes(
          mutableGridRef.current,
          gridSize,
          controlMode,
          manualMouseRef.current,
          scale,
          travelerRef.current,
          lorenzRef.current,
          liveCellsRef.current,
          ageGridRef.current,
        )

        if (loopLock) {
          loopBufferRef.current.push(scanResult)
        }
      }

      if (!loopLock) {
        loopBufferRef.current = []
      }

      requestAnimationFrame(() => setCentroid(scanResult.pos))

      // Consonance-based note selection — density controls note count
      const selected = selectByConsonance(scanResult.notes, 8, scanResult.density)

      // Compute dynamics from density
      const dyn = computeDynamics(scanResult.density, prevDensityRef.current, stepRef.current, dynamicSensitivity)
      prevDensityRef.current = scanResult.density

      if (!dyn.rest && selected.length > 0) {
        if (treatment === 'chord') {
          const voiced = voiceChord(selected, prevChordRef.current)
          prevChordRef.current = voiced.notes.map(n => n.midi)
          voiced.notes.forEach((n) => {
            const ageFactor = Math.min(1.3, 0.7 + n.age * 0.1)
            const vol = Math.min(0.15, dyn.volume * n.vol * ageFactor * 0.4 / voiced.notes.length)
            const velocity = Math.min(127, dyn.velocity)
            engine.playNote(n.freq, time, secondsPerBeat * 2, 'triangle', vol, 0.02, secondsPerBeat * 0.6)
            midiOutputRef?.current.sendNote(n.freq, time, secondsPerBeat * 2, velocity, engine.ctx.currentTime)
            if (midiRecorderRef?.current.isActive()) midiRecorderRef.current.recordNote(n.freq, time, secondsPerBeat * 2, velocity)
          })
        } else if (treatment === 'line') {
          const choice = chooseMelodicNote(selected, melodicStateRef.current)
          if (choice.note) {
            const dur = secondsPerBeat * 3 * choice.duration
            const vol = dyn.volume * choice.note.vol * 0.2
            const velocity = Math.min(127, dyn.velocity)
            engine.playNote(choice.note.freq, time, dur, 'sine', vol, 0.01)
            midiOutputRef?.current.sendNote(choice.note.freq, time, dur, velocity, engine.ctx.currentTime)
            if (midiRecorderRef?.current.isActive()) midiRecorderRef.current.recordNote(choice.note.freq, time, dur, velocity)
          }
        } else if (treatment === 'arpeggio') {
          const pattern = selectArpPattern(scanResult.density)
          const idx = pattern[stepRef.current % pattern.length] % selected.length
          const note = selected[idx]
          const ageDur = note.age > 3 ? 1.4 : note.age > 1 ? 1.0 : 0.6
          const vol = dyn.volume * note.vol * 0.2
          const velocity = Math.min(127, dyn.velocity)
          engine.playNote(note.freq, time, secondsPerBeat * 2 * ageDur, 'sine', vol, 0.01)
          midiOutputRef?.current.sendNote(note.freq, time, secondsPerBeat * 2 * ageDur, velocity, engine.ctx.currentTime)
          if (midiRecorderRef?.current.isActive()) midiRecorderRef.current.recordNote(note.freq, time, secondsPerBeat * 2 * ageDur, velocity)
        }
      }

      stepRef.current++
      nextNoteTimeRef.current += secondsPerBeat
    }

    timerRef.current = setTimeout(scheduleNextStep, 25)
  }, [mutableGridRef, liveCellsRef, settingsRef, manualMouseRef, travelerRef, lorenzRef, setGrid, ageGridRef, midiOutputRef, midiRecorderRef])

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

  return { isPlaying, togglePlay, centroid, engineRef, loopBufferRef, isLoopFull, loopRecordedSteps }
}
