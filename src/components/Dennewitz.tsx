import { useState, useEffect, useRef, useCallback } from 'react'
import { useSequencer, buildLiveCellsSet, type SequencerSettings, type LorenzState } from '@/hooks/useSequencer'
import { useGridInteraction } from '@/hooks/useGridInteraction'
import { useMidi } from '@/hooks/useMidi'
import { createRandomGrid } from '@/simulation/random'
import Header from './Header'
import AppSidebar from './Sidebar'
import Grid from './Grid'
import Footer from './Footer'

export default function Dennewitz() {
  const [gridSize, setGridSize] = useState(32)
  const [grid, setGrid] = useState<number[][]>(() => Array(32).fill(null).map(() => Array(32).fill(0)))
  const [tempo, setTempo] = useState(120)
  const [scale, setScale] = useState('pentatonic')
  const [treatment, setTreatment] = useState('arpeggio')
  const [controlMode, setControlMode] = useState('centroid')
  const [mutationRate, setMutationRate] = useState(0.001)
  const [loopLock, setLoopLock] = useState(false)
  const [loopSteps, setLoopSteps] = useState(16)
  const [seed, setSeed] = useState('dennewitz')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const mutableGridRef = useRef(grid)
  const liveCellsRef = useRef(new Set<number>())
  const manualMouseRef = useRef({ x: 16, y: 16 })
  const travelerRef = useRef({ x: 16, y: 16, vx: 0.3, vy: 0.3 })
  const lorenzRef = useRef<LorenzState>({ x: 1, y: 1, z: 1, gridX: 16, gridY: 16 })
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

  const midi = useMidi()

  const { isPlaying, togglePlay, centroid, engineRef } = useSequencer(
    mutableGridRef, liveCellsRef, settingsRef, manualMouseRef, travelerRef, lorenzRef, setGrid,
    midi.midiOutputRef, midi.midiRecorderRef,
  )

  const { handleMouseDown, handleMouseEnter, handleMouseLeave } = useGridInteraction(
    grid, setGrid, mutableGridRef, liveCellsRef, gridSize,
  )

  const randomizeGrid = useCallback((customSeed?: string, forcedSize?: number) => {
    const currentSeed = customSeed || Math.random().toString(36).substring(7)
    const size = forcedSize || gridSize
    setSeed(currentSeed)
    const newGrid = createRandomGrid(size, currentSeed)
    mutableGridRef.current = newGrid
    liveCellsRef.current = buildLiveCellsSet(newGrid, size)
    setGrid(newGrid)
  }, [gridSize])

  const clearGrid = useCallback(() => {
    const empty = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0) as number[])
    mutableGridRef.current = empty
    liveCellsRef.current = new Set()
    setGrid(empty)
  }, [gridSize])

  const changeGridSize = useCallback((newSize: number) => {
    setGridSize(newSize)
    randomizeGrid(seed, newSize)
  }, [seed, randomizeGrid])

  const handleGridMousePosition = useCallback((x: number, y: number) => {
    manualMouseRef.current = { x, y }
  }, [])

  const handleToggleRecording = useCallback(() => {
    const ctx = engineRef.current?.ctx
    if (ctx) midi.toggleRecording(ctx.currentTime)
  }, [engineRef, midi])

  // Keyboard shortcuts (skip when typing in inputs)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      } else if (e.shiftKey && e.key === 'R') {
        e.preventDefault()
        handleToggleRecording()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [togglePlay, handleToggleRecording])

  // Initialize on mount
  useEffect(() => {
    randomizeGrid('dennewitz', 32)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex flex-col w-full select-none overflow-hidden">
      <Header
        isPlaying={isPlaying}
        isRecording={midi.isRecording}
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
        midiSupported={midi.midiSupported}
        midiEnabled={midi.midiEnabled}
        onSetMidiEnabled={midi.setMidiEnabled}
        midiOutputs={midi.outputs}
        selectedMidiOutput={midi.selectedOutputId}
        onSetSelectedMidiOutput={midi.setSelectedOutputId}
        isRecording={midi.isRecording}
        onToggleRecording={handleToggleRecording}
        hasRecordedEvents={midi.hasRecordedEvents}
        onDownloadMidi={() => midi.downloadRecording(tempo)}
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
          onMousePositionChange={handleGridMousePosition}
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
