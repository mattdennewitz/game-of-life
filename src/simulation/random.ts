export function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0
    const t = (a + b | 0) + d | 0
    d = d + 1 | 0
    a = b ^ b >>> 9
    b = c + (c << 3) | 0
    c = (c << 21 | c >>> 11)
    c = c + t | 0
    return (t >>> 0) / 4294967296
  }
}

export function seedFromString(s: string): number {
  return s.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
}

export function createRandomGrid(size: number, seed: string): number[][] {
  const seedVal = seedFromString(seed)
  const rand = sfc32(0x9E3779B9, 0x243F6A88, 0xB7E15162, seedVal)

  return Array(size).fill(null).map(() =>
    Array(size).fill(null).map(() => (rand() > 0.82 ? 1 : 0))
  )
}
