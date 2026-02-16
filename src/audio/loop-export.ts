import { SCALES, type ScanResult } from './notes'
import {
  selectByConsonance, voiceChord, chooseMelodicNote, selectArpPattern, computeDynamics,
  createMelodicState,
} from './harmony'
import { MidiRecorder, downloadMidiFile } from './midi'

function isMicrotonal(scaleKey: string): boolean {
  const scale = SCALES[scaleKey]
  if (!scale) return false
  if (scale.type === 'ratio') return true
  return scale.offsets.some(o => o % 1 !== 0)
}

export function exportLoopAsMidi(
  loopBuffer: ScanResult[],
  settings: { treatment: string; tempo: number; dynamicSensitivity: number; scale: string },
): Uint8Array {
  const { treatment, tempo, dynamicSensitivity, scale } = settings
  const secondsPerBeat = 60.0 / tempo / 4

  const recorder = new MidiRecorder()
  recorder.singleChannel = !isMicrotonal(scale)
  recorder.start(0)

  let prevChord: number[] = []
  const melodicState = createMelodicState()
  let prevDensity: number | null = null

  for (let step = 0; step < loopBuffer.length; step++) {
    const scanResult = loopBuffer[step]
    const time = step * secondsPerBeat

    const selected = selectByConsonance(scanResult.notes, 8, scanResult.density)
    const dyn = computeDynamics(scanResult.density, prevDensity, step, dynamicSensitivity)
    prevDensity = scanResult.density

    if (dyn.rest || selected.length === 0) continue

    if (treatment === 'chord') {
      const voiced = voiceChord(selected, prevChord)
      prevChord = voiced.notes.map(n => n.midi)
      for (const n of voiced.notes) {
        const velocity = Math.min(127, dyn.velocity)
        recorder.recordNote(n.freq, time, secondsPerBeat * 2, velocity)
      }
    } else if (treatment === 'line') {
      const choice = chooseMelodicNote(selected, melodicState)
      if (choice.note) {
        const dur = secondsPerBeat * 3 * choice.duration
        const velocity = Math.min(127, dyn.velocity)
        recorder.recordNote(choice.note.freq, time, dur, velocity)
      }
    } else if (treatment === 'arpeggio') {
      const pattern = selectArpPattern(scanResult.density)
      const idx = pattern[step % pattern.length] % selected.length
      const note = selected[idx]
      const ageDur = note.age > 3 ? 1.4 : note.age > 1 ? 1.0 : 0.6
      const velocity = Math.min(127, dyn.velocity)
      recorder.recordNote(note.freq, time, secondsPerBeat * 2 * ageDur, velocity)
    }
  }

  recorder.stop()
  return recorder.exportSMF(tempo)
}

export function downloadLoopMidi(
  loopBuffer: ScanResult[],
  settings: { treatment: string; tempo: number; dynamicSensitivity: number; scale: string },
) {
  const data = exportLoopAsMidi(loopBuffer, settings)
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  downloadMidiFile(data, `loop-${ts}.mid`)
}
