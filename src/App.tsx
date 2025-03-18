import { useState, useEffect, useRef } from 'react'
import './App.css'
import noti from './assets/noti.mp3'
import Cookies from 'js-cookie'


declare module 'js-cookie' {
  export function get(name: string): string | undefined;
  export function set(name: string, value: string, options?: any): void;
  export function remove(name: string, options?: any): void;
}

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

interface SidebarProps {
  show: boolean;
  toggleSidebar: () => void;
  presets: Preset[];
  loadPreset: (preset: Preset) => void;
  exportPresets: () => void;
  importPresets: (event: React.ChangeEvent<HTMLInputElement>) => void;
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
  const range = max - min + 1

  // Generate extended array for infinite scroll illusion
  const numbers = [-1, 0, 1].map(offset => {
    const n = ((value + offset - min + range) % range) + min
    const isCurrent = offset === 0
    return (
      <div
        key={n}
        className={`number-item ${isCurrent ? 'selected' : ''}`}
        style={{
          transform: `translateY(${offset * 100}%)`,
          opacity: isCurrent ? 1 : 0.3,
          color: isCurrent ? 'white' : 'gray'
        }}
      >
        {n.toString().padStart(2, '0')}
      </div>
    )
  })

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    setStartY(e.clientY)
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId)
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    
    e.preventDefault(); // Prevent default scroll behavior

    const deltaY = startY - e.clientY
    const sensitivity = 3
    const steps = Math.round(deltaY / sensitivity)
    let newValue = value + steps
    
    // Handle circular wrapping
    newValue = ((newValue - min + range) % range) + min
    
    if (newValue !== currentValue) {
      setCurrentValue(newValue)
      onChange(newValue)
      setStartY(e.clientY)
    }
  }

  const handlePointerUp = () => {
    setIsDragging(false)
    // Snap to nearest integer
    const finalValue = Math.round(currentValue)
    setCurrentValue(finalValue)
    onChange(finalValue)
  }

  return (
    <div 
      ref={containerRef}
      className="number-roll"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ overflow: 'hidden' }} // Disable scroll
    >
      <div className="number-display">
        {numbers}
      </div>
    </div>
  )
}

const Sidebar: React.FC<SidebarProps> = ({ show, toggleSidebar, presets, loadPreset, exportPresets, importPresets }) => (
  <div className={`fixed top-0 right-0 h-full bg-black shadow-md transition-transform transform ${show ? 'translate-x-0' : 'translate-x-full'}`} style={{ width: '300px' }}>
    <button onClick={toggleSidebar} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded m-4">
      Close
    </button>
    <div className="flex flex-col gap-2 mt-4 max-h-52 overflow-y-auto p-2 bg-black rounded">
      <div className='flex gap-2'>
        <button
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-2xl disabled:opacity-50"
          onClick={exportPresets}
          disabled={presets.length === 0}
        >
          Export Presets
        </button>
        <label className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg cursor-pointer">
          Import Presets
          <input
            type="file"
            accept=".json"
            onChange={importPresets}
            className="hidden"
          />
        </label>
      </div>
      {presets.map((preset, index) => (
        <button
          key={index}
          className="bg-indigo-200 hover:bg-indigo-300 text-white font-semibold py-2 px-4 rounded"
          onClick={() => loadPreset(preset)}
        >
          {preset.name}
        </button>
      ))}
    </div>
  </div>
);

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
  const [showSidebar, setShowSidebar] = useState(false)

  useEffect(() => {
    const cookiePresets = Cookies.get('timerPresets');
    if (cookiePresets) {
      setSavedPresets(JSON.parse(cookiePresets));
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | number
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
      };
      
      const newPresets = [...savedPresets, newPreset];
      Cookies.set('timerPresets', JSON.stringify(newPresets), { expires: 365 });
      setSavedPresets(newPresets);
      setPresetName('');
    }
  };

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
        
        if (!Array.isArray(parsedPresets) || 
            !parsedPresets.every(p => p.name && Array.isArray(p.timers))) {
          throw new Error('Invalid preset file format')
        }

        const importedPresets = [...savedPresets, ...parsedPresets]
        Cookies.set('timerPresets', JSON.stringify(importedPresets), { expires: 365 });
        setSavedPresets(importedPresets)
        alert('Successfully imported presets!')
      } catch (error) {
        console.error('Import failed:', error)
        alert('Failed to import presets. Invalid file format.')
      }
    }
    reader.readAsText(file)
  }

  const toggleSidebar = () => {
    setShowSidebar(prev => !prev);
  };

  const clearPresets = () => {
    Cookies.remove('timerPresets');
    setSavedPresets([]);
  };

  const calculateTotalTime = () => {
    return timers.reduce((total, timer) => total + timer.remainingTime, 0);
  };

  const formatTotalTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className='bg-black h-screen overflow-hidden flex flex-col justify-center items-center'>
      <div> bio timer</div>
      <div className="text-white text-[70px] font-bold mb-4">
        {formatTotalTime(calculateTotalTime())}
      </div>
      <button onClick={toggleSidebar} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg m-4 absolute bottom-4 left-4">
        <span className={`transform transition-transform ${showSidebar ? 'rotate-180' : ''}`}>▶</span>
      </button>

      <div className="flex flex-col gap-4 mb-8 p-4 bg-black rounded-lg shadow-md w-full max-w-2xl">
        <input
          type="text"
          placeholder="Timer name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isRunning}
          className="p-2 border border-indigo-500 rounded bg-black text-white"
        />
        <div className="flex gap-4 justify-center items-center">
          <NumberRoll
            value={parseInt(hours)}
            min={0}
            max={23}
            onChange={(val) => setHours(val.toString())}
          />
          <span>h</span>
          <NumberRoll
            value={parseInt(minutes)}
            min={0}
            max={59}
            onChange={(val) => setMinutes(val.toString())}
          />
          <span>m</span>
          <NumberRoll
            value={parseInt(seconds)}
            min={0}
            max={59}
            onChange={(val) => setSeconds(val.toString())}
          />
          <span>s</span>
          <button
            onClick={addItem}
            disabled={isRunning}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-4 rounded w-16 h-24 disabled:opacity-50"
          >
          Add
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-8 max-h-80 overflow-y-auto p-2 bg-black rounded-lg shadow-md w-full max-w-2xl">
        {timers.map((timer, index) => (
          <div
            key={timer.id}
            className={`flex justify-between items-center p-2 border rounded ${
              index === currentTimerIndex ? 'bg-indigo-300 border-indigo-500' : 'bg-black border-indigo-500'
            }`}
          >
            <span>{index + 1}. {timer.name}</span>
            <span>{formatTime(timer.remainingTime)}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-4 w-full max-w-2xl">
        <button
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          onClick={start}
          disabled={isRunning || timers.length === 0}
        >
          Start
        </button>
        <button
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          onClick={() => setIsRunning(false)}
          disabled={!isRunning}
        >
          Pause
        </button>
        <button
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          onClick={reset}
          disabled={timers.length === 0}
        >
          Reset
        </button>
        <button
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          onClick={clearAll}
          disabled={timers.length === 0}
        >
          Clear All
        </button>
      </div>
      <div className="flex flex-col gap-4 mb-8 p-4 bg-black rounded-lg shadow-md w-full max-w-2xl">
        <input
          type="text"
          placeholder="Preset name"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          className="p-2 border border-indigo-500 rounded bg-black text-white"
        />
        <button
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          onClick={savePreset}
          disabled={timers.length === 0}
        >
          Add to Preset
        </button>
        <button
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          onClick={clearPresets}
          disabled={timers.length === 0}
        >
          Clear Presets
        </button>
      </div>
      <Sidebar show={showSidebar} toggleSidebar={toggleSidebar} presets={savedPresets} loadPreset={loadPreset} exportPresets={exportPresets} importPresets={importPresets} />
/
    </div>
  )
}

export default App
