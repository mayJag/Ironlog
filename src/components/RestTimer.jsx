import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, X, Plus, Minus } from 'lucide-react';
import { useSettings } from '../store/SettingsContext';
import styles from './RestTimer.module.css';

export default function RestTimer({ initialDuration = 90, onComplete, onSkip, isVisible }) {
  const { soundEnabled, vibrationEnabled } = useSettings();
  const [totalTime, setTotalTime] = useState(initialDuration);
  const [timeLeft, setTimeLeft] = useState(initialDuration);
  const [isRunning, setIsRunning] = useState(true);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(1);
  const [customSeconds, setCustomSeconds] = useState(30);

  const timerRef = useRef(null);
  const circumference = 2 * Math.PI * 90; // radius = 90

  useEffect(() => {
    setTotalTime(initialDuration);
    setTimeLeft(initialDuration);
    setIsRunning(true);
  }, [initialDuration, isVisible]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      triggerEndSignals();
      if (onComplete) onComplete();
      setIsRunning(false);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeft]);

  const triggerEndSignals = () => {
    // 1. Audio oscillator beep (respects the Sound Effects setting)
    if (soundEnabled) {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880; // A5 note (pleasant high beep)
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
          osc.start();
          osc.stop(ctx.currentTime + 0.45);
        }
      } catch (e) {
        console.warn("AudioContext failed:", e);
      }
    }

    // 2. Vibrate (respects the Haptic Vibration setting)
    if (vibrationEnabled && navigator.vibrate) {
      navigator.vibrate([150, 100, 150]);
    }
  };

  if (!isVisible) return null;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const strokeDashoffset = circumference - (timeLeft / totalTime) * circumference;

  const adjustTime = (amount) => {
    setTimeLeft((prev) => {
      const next = prev + amount;
      if (next < 0) return 0;
      // Also adjust totalTime if we extend it past original
      if (next > totalTime) setTotalTime(next);
      return next;
    });
  };

  const handlePreset = (seconds) => {
    setTotalTime(seconds);
    setTimeLeft(seconds);
    setIsRunning(true);
    setIsCustomMode(false);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const seconds = customMinutes * 60 + parseInt(customSeconds);
    if (seconds > 0) {
      setTotalTime(seconds);
      setTimeLeft(seconds);
      setIsRunning(true);
      setIsCustomMode(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onSkip}>
          <X size={20} />
        </button>

        <div className={styles.timerRing}>
          <svg width="200" height="200" viewBox="0 0 200 200">
            <defs>
              <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--accent-primary)" />
                <stop offset="100%" stopColor="var(--accent-secondary)" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="90" className={styles.ringBg} />
            <circle
              cx="100"
              cy="100"
              r="90"
              className={styles.ringProgress}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className={styles.ringText}>
            <span className={styles.timeLeft}>{formatTime(timeLeft)}</span>
            <span className={`${styles.label} ${timeLeft === 0 ? styles.readyText : ''}`}>
              {timeLeft === 0 ? 'READY' : 'REST'}
            </span>
          </div>
        </div>

        {/* Adjust Buttons */}
        <div className={styles.adjustRow}>
          <button className={styles.adjustBtn} onClick={() => adjustTime(-15)}>
            <Minus size={16} /> 15s
          </button>
          <button className={styles.adjustBtn} onClick={() => adjustTime(15)}>
            <Plus size={16} /> 15s
          </button>
        </div>

        {/* Controls */}
        <div className={styles.controlsRow}>
          <button className={styles.controlBtn} onClick={() => setIsRunning(!isRunning)}>
            {isRunning ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            className={styles.controlBtn}
            onClick={() => {
              setTimeLeft(totalTime);
              setIsRunning(false);
            }}
          >
            <RotateCcw size={20} />
          </button>
        </div>

        {/* Presets */}
        {!isCustomMode ? (
          <div className={styles.presetGrid}>
            <button className={styles.presetBtn} onClick={() => handlePreset(30)}>30s</button>
            <button className={styles.presetBtn} onClick={() => handlePreset(60)}>60s</button>
            <button className={styles.presetBtn} onClick={() => handlePreset(90)}>90s</button>
            <button className={styles.presetBtn} onClick={() => handlePreset(120)}>120s</button>
            <button
              className={`${styles.presetBtn} ${styles.presetBtnCustom}`}
              onClick={() => setIsCustomMode(true)}
            >
              Custom
            </button>
          </div>
        ) : (
          <form className={styles.customForm} onSubmit={handleCustomSubmit}>
            <div className={styles.customInputs}>
              <input
                type="number"
                min="0"
                max="59"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                className={styles.customInput}
              />
              <span>m</span>
              <input
                type="number"
                min="0"
                max="59"
                value={customSeconds}
                onChange={(e) => setCustomSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                className={styles.customInput}
              />
              <span>s</span>
            </div>
            <div className={styles.customFormActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setIsCustomMode(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.confirmBtn}>
                Set Timer
              </button>
            </div>
          </form>
        )}

        <button className={styles.skipBtn} onClick={onSkip}>
          Skip Rest
        </button>
      </div>
    </div>
  );
}
