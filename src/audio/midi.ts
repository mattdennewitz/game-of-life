export function freqToMidi(freq: number): number {
  return Math.max(0, Math.min(127, Math.round(12 * Math.log2(freq / 440) + 69)))
}

export class MidiOutput {
  private port: MIDIOutput | null = null

  setPort(port: MIDIOutput | null) {
    this.port = port
  }

  sendNote(
    freq: number,
    startTime: number,
    duration: number,
    velocity: number,
    audioCtxCurrentTime: number,
  ) {
    if (!this.port) return
    const note = freqToMidi(freq)
    const now = performance.now()
    const offset = (startTime - audioCtxCurrentTime) * 1000
    const onTime = now + offset
    const offTime = onTime + duration * 1000

    this.port.send([0x90, note, velocity], onTime)
    this.port.send([0x80, note, 0], offTime)
  }
}

interface MidiEvent {
  type: 'noteOn' | 'noteOff'
  note: number
  velocity: number
  time: number // seconds relative to start
}

export class MidiRecorder {
  private events: MidiEvent[] = []
  private startTime = 0
  private active = false

  start(audioCtxTime: number) {
    this.events = []
    this.startTime = audioCtxTime
    this.active = true
  }

  stop() {
    this.active = false
  }

  isActive(): boolean {
    return this.active
  }

  recordNote(freq: number, time: number, duration: number, velocity: number) {
    const note = freqToMidi(freq)
    const rel = time - this.startTime
    this.events.push({ type: 'noteOn', note, velocity, time: rel })
    this.events.push({ type: 'noteOff', note, velocity: 0, time: rel + duration })
  }

  hasEvents(): boolean {
    return this.events.length > 0
  }

  exportSMF(tempo: number): Uint8Array {
    const ppqn = 480
    const usPerBeat = Math.round(60_000_000 / tempo)

    const sorted = [...this.events].sort((a, b) => a.time - b.time || (a.type === 'noteOff' ? -1 : 1))

    // Build track data
    const trackBytes: number[] = []

    // Tempo meta-event: delta=0, FF 51 03 <3 bytes>
    trackBytes.push(0x00, 0xff, 0x51, 0x03)
    trackBytes.push((usPerBeat >> 16) & 0xff, (usPerBeat >> 8) & 0xff, usPerBeat & 0xff)

    let prevTick = 0
    for (const evt of sorted) {
      const tick = Math.round((evt.time / 60) * tempo * ppqn)
      const delta = Math.max(0, tick - prevTick)
      prevTick = tick
      writeVLQ(trackBytes, delta)

      if (evt.type === 'noteOn') {
        trackBytes.push(0x90, evt.note, evt.velocity)
      } else {
        trackBytes.push(0x80, evt.note, 0)
      }
    }

    // End of track
    trackBytes.push(0x00, 0xff, 0x2f, 0x00)

    // Header chunk: MThd, length=6, format=0, tracks=1, ppqn
    const header = [
      0x4d, 0x54, 0x68, 0x64, // MThd
      0x00, 0x00, 0x00, 0x06, // length
      0x00, 0x00,             // format 0
      0x00, 0x01,             // 1 track
      (ppqn >> 8) & 0xff, ppqn & 0xff,
    ]

    // Track chunk: MTrk, length, data
    const trackLen = trackBytes.length
    const track = [
      0x4d, 0x54, 0x72, 0x6b, // MTrk
      (trackLen >> 24) & 0xff, (trackLen >> 16) & 0xff, (trackLen >> 8) & 0xff, trackLen & 0xff,
      ...trackBytes,
    ]

    return new Uint8Array([...header, ...track])
  }
}

function writeVLQ(out: number[], value: number) {
  if (value < 0) value = 0
  const bytes: number[] = []
  bytes.push(value & 0x7f)
  value >>= 7
  while (value > 0) {
    bytes.push((value & 0x7f) | 0x80)
    value >>= 7
  }
  bytes.reverse()
  out.push(...bytes)
}

export function downloadMidiFile(data: Uint8Array, filename: string) {
  const blob = new Blob([data.buffer as ArrayBuffer], { type: 'audio/midi' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
