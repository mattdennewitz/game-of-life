import { useState, useEffect, useRef, useCallback, type MouseEvent } from 'react'
import { useSequencer, type SequencerSettings } from '@/hooks/useSequencer'
import { useGridInteraction } from '@/hooks/useGridInteraction'
import { createRandomGrid } from '@/simulation/random'
import Header from './Header'
import AppSidebar from './Sidebar'
import Grid from './Grid'
import Footer from './Footer'

export default function BioLogicMouse() {
  const [gridSize, setGridSize] = useState(32)
  const [grid, setGrid] = useState<number[][]>(() => Array(32).fill(null).map(() => Array(32).fill(0)))
  const [tempo, setTempo] = useState(120)
  const [scale, setScale] = useState('pentatonic')
  const [treatment, setTreatment] = useState('arpeggio')
  const [controlMode, setControlMode] = useState('centroid')
  const [mutationRate, setMutationRate] = useState(0.001)
  const [loopLock, setLoopLock] = useState(false)
  const [loopSteps, setLoopSteps] = useState(16)
  const [seed, setSeed] = useState('bio-mouse')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const mutableGridRef = useRef(grid)
  const manualMouseRef = useRef({ x: 16, y: 16 })
  const travelerRef = useRef({ x: 16, y: 16, vx: 0.3, vy: 0.3 })
  const settingsRef = useRef<SequencerSettings>({
    scale, treatment, tempo,
    controlMode, mutationRate, gridSize,
    loopLock, loopSteps,
  })

  // Keep settings ref in sync
  useEffect(() => {
    settingsRef.current = {
      scale, treatment, tempo,
      controlMode, mutationRate, gridSize,
      loopLock, loopSteps,
    }
  }, [scale, treatment, tempo, controlMode, mutationRate, gridSize, loopLock, loopSteps])

  const { isPlaying, togglePlay, centroid } = useSequencer(
    mutableGridRef, settingsRef, manualMouseRef, travelerRef, setGrid,
  )

  const { handleMouseDown, handleMouseEnter, handleMouseLeave } = useGridInteraction(
    grid, setGrid, mutableGridRef,
  )

  const randomizeGrid = useCallback((customSeed?: string, forcedSize?: number) => {
    const currentSeed = customSeed || Math.random().toString(36).substring(7)
    const size = forcedSize || gridSize
    setSeed(currentSeed)
    const newGrid = createRandomGrid(size, currentSeed)
    mutableGridRef.current = newGrid
    setGrid(newGrid)
  }, [gridSize])

  const clearGrid = useCallback(() => {
    const empty = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0) as number[])
    mutableGridRef.current = empty
    setGrid(empty)
  }, [gridSize])

  const changeGridSize = useCallback((newSize: number) => {
    setGridSize(newSize)
    randomizeGrid(seed, newSize)
  }, [seed, randomizeGrid])

  const handleGridMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const bounds = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - bounds.left) / bounds.width) * gridSize
    const y = ((e.clientY - bounds.top) / bounds.height) * gridSize
    manualMouseRef.current = { x, y }
  }, [gridSize])

  // Initialize on mount
  useEffect(() => {
    randomizeGrid('bio-mouse', 32)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex flex-col w-full select-none overflow-hidden">
      <Header
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onToggleSidebar={() => setSidebarOpen(o => !o)}
      />

      <AppSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        gridSize={gridSize}
        seed={seed}
        mutationRate={mutationRate}
        tempo={tempo}
        scale={scale}
        treatment={treatment}
        controlMode={controlMode}
        onChangeGridSize={changeGridSize}
        onSetSeed={setSeed}
        onRandomize={() => randomizeGrid()}
        onSetMutationRate={setMutationRate}
        onSetTempo={setTempo}
        onSetScale={setScale}
        onSetTreatment={setTreatment}
        onSetControlMode={setControlMode}
        loopLock={loopLock}
        loopSteps={loopSteps}
        onSetLoopLock={setLoopLock}
        onSetLoopSteps={setLoopSteps}
        onClear={clearGrid}
      />

      <main className="flex-1 flex flex-col p-4 overflow-hidden">
        <Grid
          grid={grid}
          gridSize={gridSize}
          centroid={centroid}
          controlMode={controlMode}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseMove={handleGridMouseMove}
        />
      </main>

      <Footer
        isPlaying={isPlaying}
        gridSize={gridSize}
        mutationRate={mutationRate}
      />
    </div>
  )
}
