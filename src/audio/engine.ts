export class AudioEngine {
  ctx: AudioContext
  masterGain: GainNode

  constructor() {
    this.ctx = new AudioContext()
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 0.12
    this.masterGain.connect(this.ctx.destination)
  }

  playNote(freq: number, startTime: number, duration: number, type: OscillatorType = 'sine', volume = 0.2, attack = 0.02, release?: number) {
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(freq, startTime)

    const rel = release ?? duration * 0.3
    const sustainEnd = startTime + duration - rel

    g.gain.setValueAtTime(0, startTime)
    g.gain.linearRampToValueAtTime(volume, startTime + attack)
    if (sustainEnd > startTime + attack) {
      g.gain.setValueAtTime(volume, sustainEnd)
    }
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

    osc.connect(g)
    g.connect(this.masterGain)

    osc.start(startTime)
    osc.stop(startTime + duration)
  }

  resume() {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }
}
