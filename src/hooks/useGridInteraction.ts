import { useState, useEffect, useCallback, type MutableRefObject } from 'react'

export function useGridInteraction(
  grid: number[][],
  setGrid: (g: number[][]) => void,
  mutableGridRef: MutableRefObject<number[][]>,
  liveCellsRef: MutableRefObject<Set<number>>,
  gridSize: number,
) {
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [drawMode, setDrawMode] = useState(1)

  useEffect(() => {
    const up = () => setIsMouseDown(false)
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  const handleMouseDown = useCallback(
    (y: number, x: number) => {
      const currentVal = grid[y][x]
      const newMode = currentVal ? 0 : 1
      setDrawMode(newMode)
      setIsMouseDown(true)
      const next = grid.map((row) => [...row])
      next[y][x] = newMode
      const idx = y * gridSize + x
      if (newMode) liveCellsRef.current.add(idx)
      else liveCellsRef.current.delete(idx)
      mutableGridRef.current = next
      setGrid(next)
    },
    [grid, setGrid, mutableGridRef, liveCellsRef, gridSize],
  )

  const handleMouseEnter = useCallback(
    (y: number, x: number) => {
      if (!isMouseDown) return
      const next = grid.map((row) => [...row])
      next[y][x] = drawMode
      const idx = y * gridSize + x
      if (drawMode) liveCellsRef.current.add(idx)
      else liveCellsRef.current.delete(idx)
      mutableGridRef.current = next
      setGrid(next)
    },
    [isMouseDown, drawMode, grid, setGrid, mutableGridRef, liveCellsRef, gridSize],
  )

  const handleMouseLeave = useCallback(() => {
    setIsMouseDown(false)
  }, [])

  return { handleMouseDown, handleMouseEnter, handleMouseLeave }
}
