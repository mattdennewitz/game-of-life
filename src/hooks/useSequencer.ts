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

export function useSequencer(
  mutableGridRef: MutableRefObject<number[][]>,
  settingsRef: MutableRefObject<SequencerSettings>,
  manualMouseRef: MutableRefObject<{ x: number; y: number }>,
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

      const { notes, pos } = calculateNotes(
        mutableGridRef.current,
        gridSize,
        controlMode,
        manualMouseRef.current,
        scale,
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
  }, [mutableGridRef, settingsRef, manualMouseRef, setGrid])

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
