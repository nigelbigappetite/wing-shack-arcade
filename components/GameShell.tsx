'use client';

import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { wingShackTheme } from '@/theme/wingShackTheme';

export interface GameShellProps {
  title: string;
  howToPlay: string;
  children: React.ReactNode;
  onStart?: () => void;
  onReset?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  className?: string;
  initialSoundEnabled?: boolean;
}

export interface GameShellRef {
  start: () => void;
  reset: () => void;
  pause: () => void;
  resume: () => void;
}

const GameShell = forwardRef<GameShellRef, GameShellProps>(
  (
    {
      title,
      howToPlay,
      children,
      onStart,
      onReset,
      onPause,
      onResume,
      className = '',
      initialSoundEnabled = true,
    },
    ref
  ) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(initialSoundEnabled);
    const [showHowToPlay, setShowHowToPlay] = useState(false);
    const gameStateRef = useRef({ isPlaying, isPaused });

    // Update ref when state changes
    gameStateRef.current = { isPlaying, isPaused };

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      start: () => {
        setIsPlaying(true);
        setIsPaused(false);
        onStart?.();
      },
      reset: () => {
        setIsPlaying(false);
        setIsPaused(false);
        onReset?.();
      },
      pause: () => {
        if (gameStateRef.current.isPlaying && !gameStateRef.current.isPaused) {
          setIsPaused(true);
          onPause?.();
        }
      },
      resume: () => {
        if (gameStateRef.current.isPaused) {
          setIsPaused(false);
          onResume?.();
        }
      },
    }));

    const handleStart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      onStart?.();
    };

    const handleReset = () => {
      setIsPlaying(false);
      setIsPaused(false);
      onReset?.();
    };

    const handlePause = () => {
      if (isPlaying && !isPaused) {
        setIsPaused(true);
        onPause?.();
      } else if (isPaused) {
        setIsPaused(false);
        onResume?.();
      }
    };

    const toggleSound = () => {
      setSoundEnabled((prev) => !prev);
    };

    return (
      <div
        className={`game-shell ${className}`}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          backgroundColor: wingShackTheme.colors.backgroundCard,
          borderRadius: wingShackTheme.borderRadius.lg,
          overflow: 'hidden',
          boxShadow: `0 10px 40px rgba(159, 8, 8, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1), 0 0 20px rgba(200, 88, 32, 0.1)`,
          border: `1px solid rgba(159, 8, 8, 0.15)`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderBottom: '1px solid rgba(159, 8, 8, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(159, 8, 8, 0.1)',
          }}
        >
          {/* Title and Controls Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <h2
              style={{
                color: wingShackTheme.colors.text,
                margin: 0,
                fontSize: 'clamp(18px, 4vw, 24px)',
                fontFamily: wingShackTheme.typography.fontFamily.display,
                fontWeight: wingShackTheme.typography.fontWeight.bold,
                flex: 1,
                minWidth: '120px',
                letterSpacing: '1px',
              }}
            >
              {title}
            </h2>

            {/* Control Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              {/* Home Button */}
              <Link
                href="/"
                style={{
                  textDecoration: 'none',
                }}
              >
                <button
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: wingShackTheme.colors.text,
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: 'clamp(12px, 2.5vw, 14px)',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = wingShackTheme.colors.primary + '40';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  🏠 Home
                </button>
              </Link>

              {/* How to Play Button */}
              <button
                onClick={() => setShowHowToPlay(!showHowToPlay)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: showHowToPlay ? wingShackTheme.colors.secondary : 'rgba(255, 255, 255, 0.1)',
                  color: showHowToPlay ? '#000' : wingShackTheme.colors.text,
                  border: `1px solid ${showHowToPlay ? wingShackTheme.colors.secondary : 'rgba(255, 255, 255, 0.2)'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: 'clamp(12px, 2.5vw, 14px)',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (!showHowToPlay) {
                    e.currentTarget.style.backgroundColor = wingShackTheme.colors.secondary + '40';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showHowToPlay) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
              >
                {showHowToPlay ? '✕' : 'ℹ️ How to Play'}
              </button>

              {/* Sound Toggle */}
              <button
                onClick={toggleSound}
                style={{
                  padding: '8px 12px',
                  backgroundColor: soundEnabled ? 'rgba(78, 205, 196, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  minWidth: '40px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(78, 205, 196, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = soundEnabled
                    ? 'rgba(78, 205, 196, 0.2)'
                    : 'rgba(255, 255, 255, 0.1)';
                }}
                aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
              >
                {soundEnabled ? '🔊' : '🔇'}
              </button>

              {/* Pause/Resume Button */}
              {isPlaying && (
                <button
                  onClick={handlePause}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: isPaused ? 'rgba(255, 107, 107, 0.2)' : 'rgba(78, 205, 196, 0.2)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    minWidth: '40px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isPaused
                      ? 'rgba(255, 107, 107, 0.3)'
                      : 'rgba(78, 205, 196, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isPaused
                      ? 'rgba(255, 107, 107, 0.2)'
                      : 'rgba(78, 205, 196, 0.2)';
                  }}
                  aria-label={isPaused ? 'Resume' : 'Pause'}
                >
                  {isPaused ? '▶️' : '⏸️'}
                </button>
              )}

              {/* Start/Reset Button */}
              {!isPlaying ? (
                <button
                  onClick={handleStart}
                  style={{
                    padding: '10px 20px',
                  backgroundColor: wingShackTheme.colors.primary,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: wingShackTheme.borderRadius.md,
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = wingShackTheme.colors.primaryLight;
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = wingShackTheme.shadows.glow;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = wingShackTheme.colors.primary;
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  Start
                </button>
              ) : (
                <button
                  onClick={handleReset}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'rgba(255, 107, 107, 0.8)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 107, 107, 1)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 107, 107, 0.8)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  Restart
                </button>
              )}
            </div>
          </div>

          {/* How to Play Panel */}
          <AnimatePresence>
            {showHowToPlay && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                style={{
                  overflow: 'hidden',
                  borderTop: '1px solid rgba(159, 8, 8, 0.2)',
                  paddingTop: '12px',
                }}
              >
                <p
                  style={{
                    color: '#000',
                    margin: 0,
                    fontSize: 'clamp(12px, 2.5vw, 14px)',
                    lineHeight: '1.6',
                    textTransform: 'uppercase',
                    fontWeight: wingShackTheme.typography.fontWeight.medium,
                  }}
                >
                  {howToPlay}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Game Content Area */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#0f0f15',
          }}
        >
          {/* Pause Overlay */}
          <AnimatePresence>
            {isPaused && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 20,
                  backdropFilter: 'blur(4px)',
                }}
              >
                <div
                  style={{
                    textAlign: 'center',
                    color: '#fff',
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏸️</div>
                  <h3 style={{ fontSize: '24px', margin: 0, marginBottom: '8px' }}>Paused</h3>
                  <p style={{ fontSize: '16px', opacity: 0.8, margin: 0 }}>
                    Click the resume button to continue
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Game Children */}
          <div
            style={{
              width: '100%',
              height: '100%',
              position: 'relative',
              pointerEvents: isPaused ? 'none' : 'auto',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }
);

GameShell.displayName = 'GameShell';

export default GameShell;

