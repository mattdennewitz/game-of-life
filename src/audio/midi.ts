export interface MicrotonalMidi {
  note: number        // nearest MIDI note (0-127)
  pitchBend: number   // 14-bit (0-16383, center 8192)
  centsOff: number    // deviation from 12-TET
}

export function freqToMicrotonalMidi(freq: number, bendRange = 2): MicrotonalMidi {
  const exactMidi = 12 * Math.log2(freq / 440) + 69
  const note = Math.max(0, Math.min(127, Math.round(exactMidi)))
  const centsOff = (exactMidi - note) * 100
  // Map cents to 14-bit pitch bend: bendRange semitones = full range
  const bendPerCent = 8192 / (bendRange * 100)
  const pitchBend = Math.max(0, Math.min(16383, Math.round(8192 + centsOff * bendPerCent)))
  return { note, pitchBend, centsOff }
}

export function freqToMidi(freq: number): number {
  return freqToMicrotonalMidi(freq).note
}

const DRUM_CHANNEL = 9

export class MidiOutput {
  private port: MIDIOutput | null = null
  private nextChannel = 0

  setPort(port: MIDIOutput | null) {
    this.port = port
  }

  private allocateChannel(): number {
    let ch = this.nextChannel
    if (ch === DRUM_CHANNEL) ch = (ch + 1) % 16
    this.nextChannel = (ch + 1) % 16
    if (this.nextChannel === DRUM_CHANNEL) this.nextChannel = (this.nextChannel + 1) % 16
    return ch
  }

  sendNote(
    freq: number,
    startTime: number,
    duration: number,
    velocity: number,
    audioCtxCurrentTime: number,
  ) {
    if (!this.port) return
    const micro = freqToMicrotonalMidi(freq)
    const ch = this.allocateChannel()
    const now = performance.now()
    const offset = (startTime - audioCtxCurrentTime) * 1000
    const onTime = now + offset
    const offTime = onTime + duration * 1000

    // Send pitch bend before note-on if microtonal
    if (Math.abs(micro.centsOff) > 0.5) {
      const lsb = micro.pitchBend & 0x7f
      const msb = (micro.pitchBend >> 7) & 0x7f
      this.port.send([0xe0 | ch, lsb, msb], onTime - 1)
    }

    this.port.send([0x90 | ch, micro.note, velocity], onTime)
    this.port.send([0x80 | ch, micro.note, 0], offTime)
  }
}

interface MidiEvent {
  type: 'noteOn' | 'noteOff' | 'pitchBend'
  channel: number
  note: number
  velocity: number
  pitchBend: number   // 14-bit, only used for pitchBend type
  time: number        // seconds relative to start
}

export class MidiRecorder {
  private events: MidiEvent[] = []
  private startTime = 0
  private active = false
  private nextChannel = 0
  singleChannel = false

  start(audioCtxTime: number) {
    this.events = []
    this.startTime = audioCtxTime
    this.active = true
    this.nextChannel = 0
  }

  stop() {
    this.active = false
  }

  isActive(): boolean {
    return this.active
  }

  private allocateChannel(): number {
    if (this.singleChannel) return 0
    let ch = this.nextChannel
    if (ch === DRUM_CHANNEL) ch = (ch + 1) % 16
    this.nextChannel = (ch + 1) % 16
    if (this.nextChannel === DRUM_CHANNEL) this.nextChannel = (this.nextChannel + 1) % 16
    return ch
  }

  recordNote(freq: number, time: number, duration: number, velocity: number) {
    const micro = freqToMicrotonalMidi(freq)
    const ch = this.allocateChannel()
    const rel = time - this.startTime

    // Emit pitch bend before note-on when microtonal
    if (Math.abs(micro.centsOff) > 0.5) {
      this.events.push({
        type: 'pitchBend', channel: ch,
        note: 0, velocity: 0, pitchBend: micro.pitchBend, time: rel,
      })
    }

    this.events.push({
      type: 'noteOn', channel: ch,
      note: micro.note, velocity, pitchBend: 0, time: rel,
    })
    this.events.push({
      type: 'noteOff', channel: ch,
      note: micro.note, velocity: 0, pitchBend: 0, time: rel + duration,
    })
  }

  hasEvents(): boolean {
    return this.events.length > 0
  }

  exportSMF(tempo: number): Uint8Array {
    const ppqn = 480
    const usPerBeat = Math.round(60_000_000 / tempo)

    // Sort: by time, then pitchBend → noteOff → noteOn
    const ORDER: Record<string, number> = { pitchBend: 0, noteOff: 1, noteOn: 2 }
    const sorted = [...this.events].sort((a, b) =>
      a.time - b.time || (ORDER[a.type] ?? 2) - (ORDER[b.type] ?? 2)
    )

    // Build track data
    const trackBytes: number[] = []

    // Tempo meta-event: delta=0, FF 51 03 <3 bytes>
    trackBytes.push(0x00, 0xff, 0x51, 0x03)
    trackBytes.push((usPerBeat >> 16) & 0xff, (usPerBeat >> 8) & 0xff, usPerBeat & 0xff)

    // RPN pitch bend range init (2 semitones) for all 16 channels
    for (let ch = 0; ch < 16; ch++) {
      // RPN MSB=0, LSB=0 (pitch bend range)
      trackBytes.push(0x00); trackBytes.push(0xb0 | ch, 101, 0)
      trackBytes.push(0x00); trackBytes.push(0xb0 | ch, 100, 0)
      // Data Entry MSB=2 (semitones), LSB=0 (cents)
      trackBytes.push(0x00); trackBytes.push(0xb0 | ch, 6, 2)
      trackBytes.push(0x00); trackBytes.push(0xb0 | ch, 38, 0)
    }

    let prevTick = 0
    for (const evt of sorted) {
      const tick = Math.round((evt.time / 60) * tempo * ppqn)
      const delta = Math.max(0, tick - prevTick)
      prevTick = tick
      writeVLQ(trackBytes, delta)

      if (evt.type === 'pitchBend') {
        const lsb = evt.pitchBend & 0x7f
        const msb = (evt.pitchBend >> 7) & 0x7f
        trackBytes.push(0xe0 | evt.channel, lsb, msb)
      } else if (evt.type === 'noteOn') {
        trackBytes.push(0x90 | evt.channel, evt.note, evt.velocity)
      } else {
        trackBytes.push(0x80 | evt.channel, evt.note, 0)
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
