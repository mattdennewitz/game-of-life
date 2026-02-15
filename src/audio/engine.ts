export class AudioEngine {
  ctx: AudioContext
  masterGain: GainNode

  constructor() {
    this.ctx = new AudioContext()
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 0.12
    this.masterGain.connect(this.ctx.destination)
  }

  playNote(freq: number, startTime: number, duration: number, type: OscillatorType = 'sine', volume = 0.2) {
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(freq, startTime)

    g.gain.setValueAtTime(0, startTime)
    g.gain.linearRampToValueAtTime(volume, startTime + 0.02)
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
