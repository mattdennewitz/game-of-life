export function getNextGeneration(currentGrid: number[][], size: number, mutationRate: number): number[][] {
  const newGrid = currentGrid.map((row) => [...row])

  for (let y = 0; y < size; y++) {
    const row = currentGrid[y]
    const newRow = newGrid[y]
    for (let x = 0; x < size; x++) {
      let neighbors = 0

      for (let i = -1; i <= 1; i++) {
        const ny = (y + i + size) % size
        const neighborRow = currentGrid[ny]
        for (let j = -1; j <= 1; j++) {
          if (i === 0 && j === 0) continue
          const nx = (x + j + size) % size
          if (neighborRow[nx] === 1) neighbors++
        }
      }

      if (row[x] === 1) {
        if (neighbors < 2 || neighbors > 3) newRow[x] = 0
      } else {
        if (neighbors === 3) newRow[x] = 1
      }

      if (mutationRate > 0 && Math.random() < mutationRate) {
        newRow[x] = newRow[x] ? 0 : 1
      }
    }
  }
  return newGrid
}
