import { useState, useEffect, useRef } from 'react'
import './App.css'
import noti from './assets/noti.mp3'

interface TimerItem {
  id: number
  name: string
  initialTime: number
  remainingTime: number
}

interface Preset {
  name: string
  timers: TimerItem[]
}

const NumberRoll = ({
  value,
  min,
  max,
  onChange
}: {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [currentValue, setCurrentValue] = useState(value)

  const numbers = Array.from({ length: max - min + 1 }, (_, i) => i + min)

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    setStartY(e.clientY)
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId)
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    
    const deltaY = startY - e.clientY
    const sensitivity = 5 // Pixels per step
    const steps = Math.round(deltaY / sensitivity)
    const newValue = Math.min(max, Math.max(min, value + steps))
    
    if (newValue !== currentValue) {
      setCurrentValue(newValue)
      onChange(newValue)
    }
  }

  const handlePointerUp = () => {
    setIsDragging(false)
  }

  return (
    <div 
      ref={containerRef}
      className={`number-roll ${isDragging ? 'dragging' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="number-display">
        {numbers.map((n) => (
          <div
            key={n}
            className={`number-item ${n === currentValue ? 'selected' : ''}`}
            style={{ transform: `translateY(${(n - currentValue) * 100}%)` }}
          >
            {n.toString().padStart(2, '0')}
          </div>
        ))}
      </div>
    </div>
  )
}

function App() {
  const [timers, setTimers] = useState<TimerItem[]>([])
  const [currentTimerIndex, setCurrentTimerIndex] = useState<number>(-1)
  const [isRunning, setIsRunning] = useState(false)
  const [name, setName] = useState('')
  const [hours, setHours] = useState('0')
  const [minutes, setMinutes] = useState('0')
  const [seconds, setSeconds] = useState('0')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [presetName, setPresetName] = useState('')
  const [savedPresets, setSavedPresets] = useState<Preset[]>([])

  useEffect(() => {
    let interval: number
    if (isRunning && currentTimerIndex !== -1) {
      interval = setInterval(() => {
        setTimers(prev => {
          if (prev.length === 0 || currentTimerIndex >= prev.length) {
            setIsRunning(false);
            return prev;
          }
          
          const newTimers = [...prev]
          const current = newTimers[currentTimerIndex]
          
          if (current && current.remainingTime > 0) {
            current.remainingTime -= 1
          } else if (current) {
            if (currentTimerIndex < newTimers.length - 1) {
              setCurrentTimerIndex(currentTimerIndex + 1)
            } else {
              setIsRunning(false)
              try {
                const audio = new Audio(noti);
                audioRef.current = audio;
                audio.play().catch(err => {
                  console.warn('Could not play notification sound:', err);
                  const audioContext = new AudioContext();
                  const oscillator = audioContext.createOscillator();
                  const gainNode = audioContext.createGain();
                  
                  oscillator.type = 'sine';
                  oscillator.frequency.value = 800;
                  gainNode.gain.value = 0.5;
                  
                  oscillator.connect(gainNode);
                  gainNode.connect(audioContext.destination);
                  
                  oscillator.start();
                  setTimeout(() => oscillator.stop(), 1000);
                });
              } catch (error) {
                console.error('Error playing notification sound:', error);
              }
            }
          }
          return newTimers
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning, currentTimerIndex])

  useEffect(() => {
    const presets = JSON.parse(localStorage.getItem('timerPresets') || '[]')
    setSavedPresets(presets)
  }, [])

  const addItem = () => {
    const totalSeconds = 
      parseInt(hours) * 3600 + 
      parseInt(minutes) * 60 + 
      parseInt(seconds)
    
    if (name && totalSeconds > 0) {
      const newTimer: TimerItem = {
        id: Date.now(),
        name,
        initialTime: totalSeconds,
        remainingTime: totalSeconds
      }
      setTimers([...timers, newTimer])
      setName('')
      setHours('0')
      setMinutes('0')
      setSeconds('0')
    }
  }

  const start = () => {
    if (timers.length > 0) {
      setCurrentTimerIndex(0)
      setIsRunning(true)
    }
  }

  const reset = () => {
    setIsRunning(false)
    setCurrentTimerIndex(-1)
    setTimers(timers.map(t => ({
      ...t,
      remainingTime: t.initialTime
    })))
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }

  const clearAll = () => {
    setIsRunning(false)
    setCurrentTimerIndex(-1)
    setTimers([])
  }

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const savePreset = () => {
    if (presetName && timers.length > 0) {
      const newPreset: Preset = {
        name: presetName,
        timers: timers.map(t => ({
          ...t,
          remainingTime: t.initialTime
        }))
      }
      
      const presets = JSON.parse(localStorage.getItem('timerPresets') || '[]')
      const newPresets = [...presets, newPreset]
      localStorage.setItem('timerPresets', JSON.stringify(newPresets))
      setSavedPresets(newPresets)
      setPresetName('')
    }
  }

  const loadPreset = (preset: Preset) => {
    if (confirm('Load this preset? Current timers will be lost.')) {
      setTimers(preset.timers)
      setIsRunning(false)
      setCurrentTimerIndex(-1)
    }
  }

  const exportPresets = () => {
    const dataStr = JSON.stringify(savedPresets, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `timer-presets-${new Date().toISOString().slice(0,10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const importPresets = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsedPresets = JSON.parse(e.target?.result as string)
        
        // Basic validation
        if (!Array.isArray(parsedPresets) || 
            !parsedPresets.every(p => p.name && Array.isArray(p.timers))) {
          throw new Error('Invalid preset file format')
        }

        const importedPresets = [...savedPresets, ...parsedPresets]
        localStorage.setItem('timerPresets', JSON.stringify(importedPresets))
        setSavedPresets(importedPresets)
        alert('Successfully imported presets!')
      } catch (error) {
        console.error('Import failed:', error)
        alert('Failed to import presets. Invalid file format.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <>
      <h1>Bio Timer</h1>
      <div className="card">
        <div className="preset-controls">
          <div className="preset-io-buttons">
            <button className="export-btn" onClick={exportPresets} disabled={savedPresets.length === 0}>
              Export Presets
            </button>
            <label className="import-btn">
              Import Presets
              <input
                type="file"
                accept=".json"
                onChange={importPresets}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          
          <input
            type="text"
            placeholder="Preset name"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
          />
          <button onClick={savePreset} disabled={!presetName || timers.length === 0}>
            Save Preset
          </button>
          
          <div className="preset-list">
            {savedPresets.map((preset, index) => (
              <button
                key={index}
                className="preset-item"
                onClick={() => loadPreset(preset)}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div className="timer-controls">
          <input
            type="text"
            placeholder="Timer name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isRunning}
          />
          <div className="time-inputs">
            <div className="time-column">
              <NumberRoll
                value={parseInt(hours)}
                min={0}
                max={23}
                onChange={(val) => setHours(val.toString())}
              />
              <span>h</span>
            </div>
            <div className="time-column">
              <NumberRoll
                value={parseInt(minutes)}
                min={0}
                max={59}
                onChange={(val) => setMinutes(val.toString())}
              />
              <span>m</span>
            </div>
            <div className="time-column">
              <NumberRoll
                value={parseInt(seconds)}
                min={0}
                max={59}
                onChange={(val) => setSeconds(val.toString())}
              />
              <span>s</span>
            </div>
          </div>
          <button onClick={addItem} disabled={isRunning}>Add item</button>
        </div>

        <div className="timer-list">
          {timers.map((timer, index) => (
            <div 
              key={timer.id}
              className={`timer-item ${index === currentTimerIndex ? 'active' : ''}`}
            >
              <span>{index + 1}. {timer.name}</span>
              <span>{formatTime(timer.remainingTime)}</span>
            </div>
          ))}
        </div>

        <div className="controls">
          <button className="square-btn" onClick={start} disabled={isRunning || timers.length === 0}>
            Start
          </button>
          <button className="square-btn" onClick={() => setIsRunning(false)} disabled={!isRunning}>
            Pause
          </button>
          <button className="square-btn" onClick={reset} disabled={timers.length === 0}>
            Reset
          </button>
          <button className="square-btn" onClick={clearAll} disabled={timers.length === 0}>
            Clear All
          </button>
        </div>
      </div>
    </>
  )
}

export default App
