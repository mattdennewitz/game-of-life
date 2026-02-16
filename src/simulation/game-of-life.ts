export function getNextGeneration(
  currentGrid: number[][],
  ageGrid: number[][],
  size: number,
  mutationRate: number,
): { grid: number[][]; ages: number[][] } {
  const newGrid = currentGrid.map((row) => [...row])
  const newAges = ageGrid.map((row) => [...row])

  for (let y = 0; y < size; y++) {
    const row = currentGrid[y]
    const newRow = newGrid[y]
    const newAgeRow = newAges[y]
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
        if (neighbors < 2 || neighbors > 3) {
          newRow[x] = 0
          newAgeRow[x] = 0
        } else {
          newAgeRow[x] = ageGrid[y][x] + 1
        }
      } else {
        if (neighbors === 3) {
          newRow[x] = 1
          newAgeRow[x] = 1
        } else {
          newAgeRow[x] = 0
        }
      }

      if (mutationRate > 0 && Math.random() < mutationRate) {
        newRow[x] = newRow[x] ? 0 : 1
        newAgeRow[x] = newRow[x] ? 1 : 0
      }
    }
  }
  return { grid: newGrid, ages: newAges }
}
