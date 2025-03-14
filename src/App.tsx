import { useState, useEffect, useRef } from 'react'
import './App.css'
import noti from './assets/noti.mp3'
interface TimerItem {
  id: number
  name: string
  initialTime: number
  remainingTime: number
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

  return (
    <>
      <h1>Bio Timer</h1>
      <div className="card">
        <div className="timer-controls">
          <input
            type="text"
            placeholder="Timer name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isRunning}
          />
          <div className="time-inputs">
            <input
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              min="0"
              disabled={isRunning}
            />
            <span>h</span>
            <input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              min="0"
              max="59"
              disabled={isRunning}
            />
            <span>m</span>
            <input
              type="number"
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
              min="0"
              max="59"
              disabled={isRunning}
            />
            <span>s</span>
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
          <button onClick={start} disabled={isRunning || timers.length === 0}>
            Start
          </button>
          <button onClick={() => setIsRunning(false)} disabled={!isRunning}>
            Pause
          </button>
          <button onClick={reset} disabled={timers.length === 0}>
            Reset
          </button>
          <button onClick={clearAll} disabled={timers.length === 0}>
            Clear All
          </button>
        </div>
      </div>
    </>
  )
}

export default App
