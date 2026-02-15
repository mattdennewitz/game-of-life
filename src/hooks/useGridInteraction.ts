import { useState, useEffect, useCallback, type MutableRefObject } from 'react'

export function useGridInteraction(
  grid: number[][],
  setGrid: (g: number[][]) => void,
  mutableGridRef: MutableRefObject<number[][]>,
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
      mutableGridRef.current = next
      setGrid(next)
    },
    [grid, setGrid, mutableGridRef],
  )

  const handleMouseEnter = useCallback(
    (y: number, x: number) => {
      if (!isMouseDown) return
      const next = grid.map((row) => [...row])
      next[y][x] = drawMode
      mutableGridRef.current = next
      setGrid(next)
    },
    [isMouseDown, drawMode, grid, setGrid, mutableGridRef],
  )

  const handleMouseLeave = useCallback(() => {
    setIsMouseDown(false)
  }, [])

  return { handleMouseDown, handleMouseEnter, handleMouseLeave }
}
