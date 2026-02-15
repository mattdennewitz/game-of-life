import { useState, useEffect, useRef, useCallback } from 'react'
import { MidiOutput, MidiRecorder, downloadMidiFile } from '@/audio/midi'

export function useMidi() {
  const [midiSupported] = useState(() => typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator)
  const [midiEnabled, setMidiEnabled] = useState(false)
  const [outputs, setOutputs] = useState<MIDIOutput[]>([])
  const [selectedOutputId, setSelectedOutputId] = useState<string>('')
  const [isRecording, setIsRecording] = useState(false)
  const [hasRecordedEvents, setHasRecordedEvents] = useState(false)

  const midiAccessRef = useRef<MIDIAccess | null>(null)
  const midiOutputRef = useRef<MidiOutput>(new MidiOutput())
  const midiRecorderRef = useRef<MidiRecorder>(new MidiRecorder())

  // Request MIDI access when enabled
  useEffect(() => {
    if (!midiEnabled || !midiSupported) {
      midiOutputRef.current.setPort(null)
      setOutputs([])
      setSelectedOutputId('')
      return
    }

    let cancelled = false

    navigator.requestMIDIAccess().then((access) => {
      if (cancelled) return
      midiAccessRef.current = access

      const updatePorts = () => {
        const ports = Array.from(access.outputs.values())
        setOutputs(ports)
        // If selected port is gone, clear it
        setSelectedOutputId((prev) => {
          if (prev && !ports.find((p) => p.id === prev)) {
            midiOutputRef.current.setPort(null)
            return ''
          }
          return prev
        })
      }

      updatePorts()
      access.onstatechange = updatePorts

      return () => {
        access.onstatechange = null
      }
    }).catch(() => {
      // MIDI access denied or failed
    })

    return () => {
      cancelled = true
      if (midiAccessRef.current) {
        midiAccessRef.current.onstatechange = null
      }
    }
  }, [midiEnabled, midiSupported])

  // Update active port when selection changes
  useEffect(() => {
    if (selectedOutputId) {
      const port = outputs.find((p) => p.id === selectedOutputId) ?? null
      midiOutputRef.current.setPort(port)
    } else {
      midiOutputRef.current.setPort(null)
    }
  }, [selectedOutputId, outputs])

  const toggleRecording = useCallback((audioCtxCurrentTime: number) => {
    if (midiRecorderRef.current.isActive()) {
      midiRecorderRef.current.stop()
      setIsRecording(false)
      setHasRecordedEvents(midiRecorderRef.current.hasEvents())
    } else {
      midiRecorderRef.current.start(audioCtxCurrentTime)
      setIsRecording(true)
      setHasRecordedEvents(false)
    }
  }, [])

  const downloadRecording = useCallback((tempo: number) => {
    if (!midiRecorderRef.current.hasEvents()) return
    const data = midiRecorderRef.current.exportSMF(tempo)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    downloadMidiFile(data, `dennewitz-${timestamp}.mid`)
  }, [])

  return {
    midiSupported,
    midiEnabled,
    setMidiEnabled,
    outputs,
    selectedOutputId,
    setSelectedOutputId,
    isRecording,
    toggleRecording,
    hasRecordedEvents,
    downloadRecording,
    midiOutputRef,
    midiRecorderRef,
  }
}
