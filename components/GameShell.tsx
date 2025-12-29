'use client';

import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { wingShackTheme } from '@/theme/wingShackTheme';
import { GameLifecycle } from '@/types/game-lifecycle';

// Context for passing sound state to games
const GameShellContext = createContext<{ soundEnabled: boolean }>({ soundEnabled: true });

export const useGameShellContext = () => useContext(GameShellContext);

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
    const gameContentRef = useRef<HTMLDivElement>(null);
    const gameLifecycleRef = useRef<GameLifecycle | null>(null);

    // Find game lifecycle from children
    useEffect(() => {
      const findGameLifecycle = () => {
        if (gameContentRef.current) {
          const lifecycleElement = gameContentRef.current.querySelector('[data-game-lifecycle="true"]') as any;
          if (lifecycleElement && lifecycleElement.__gameLifecycle) {
            gameLifecycleRef.current = lifecycleElement.__gameLifecycle;
          }
        }
      };

      // Try to find lifecycle after a short delay to allow children to mount
      const timeoutId = setTimeout(findGameLifecycle, 100);
      findGameLifecycle(); // Also try immediately

      return () => clearTimeout(timeoutId);
    }, [children]);

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
      // Call game's lifecycle method if available
      if (gameLifecycleRef.current) {
        gameLifecycleRef.current.start();
      }
      onStart?.();
    };

    const handleReset = () => {
      setIsPlaying(false);
      setIsPaused(false);
      // Call game's lifecycle method if available
      if (gameLifecycleRef.current) {
        gameLifecycleRef.current.reset();
      }
      onReset?.();
    };

    const handlePause = () => {
      if (isPlaying && !isPaused) {
        setIsPaused(true);
        // Call game's lifecycle method if available
        if (gameLifecycleRef.current) {
          gameLifecycleRef.current.pause();
        }
        onPause?.();
      } else if (isPaused) {
        setIsPaused(false);
        // Resume by calling start if game supports it
        if (gameLifecycleRef.current) {
          // Some games might have resume, but start works for most
          if ('resume' in gameLifecycleRef.current && typeof gameLifecycleRef.current.resume === 'function') {
            (gameLifecycleRef.current as any).resume();
          } else {
            gameLifecycleRef.current.start();
          }
        }
        onResume?.();
      }
    };

    const toggleSound = () => {
      setSoundEnabled((prev) => !prev);
    };

    return (
      <GameShellContext.Provider value={{ soundEnabled }}>
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
            padding: 'clamp(8px, 1.5vw, 12px) clamp(12px, 2vw, 16px)',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderBottom: '1px solid rgba(159, 8, 8, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(6px, 1vw, 8px)',
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
                fontSize: 'clamp(14px, 3vw, 18px)',
                fontFamily: wingShackTheme.typography.fontFamily.display,
                fontWeight: wingShackTheme.typography.fontWeight.bold,
                flex: 1,
                minWidth: '100px',
                letterSpacing: '0.5px',
              }}
            >
              {title}
            </h2>

            {/* Control Buttons */}
            <div
              style={{
                display: 'flex',
                gap: 'clamp(4px, 1vw, 6px)',
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
                    padding: 'clamp(8px, 1.5vw, 10px) clamp(12px, 2vw, 16px)',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    color: wingShackTheme.colors.text,
                    border: 'none',
                    borderRadius: wingShackTheme.borderRadius.md,
                    cursor: 'pointer',
                    fontSize: 'clamp(11px, 2vw, 13px)',
                    fontWeight: wingShackTheme.typography.fontWeight.semibold,
                    fontFamily: wingShackTheme.typography.fontFamily.body,
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = wingShackTheme.colors.primary;
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                    e.currentTarget.style.color = wingShackTheme.colors.text;
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  🏠 Home
                </button>
              </Link>

              {/* How to Play Button */}
              <button
                onClick={() => setShowHowToPlay(!showHowToPlay)}
                style={{
                  padding: 'clamp(8px, 1.5vw, 10px) clamp(12px, 2vw, 16px)',
                  backgroundColor: showHowToPlay ? wingShackTheme.colors.secondary : 'rgba(255, 255, 255, 0.95)',
                  color: showHowToPlay ? '#000' : wingShackTheme.colors.text,
                  border: 'none',
                  borderRadius: wingShackTheme.borderRadius.md,
                  cursor: 'pointer',
                  fontSize: 'clamp(11px, 2vw, 13px)',
                  fontWeight: wingShackTheme.typography.fontWeight.semibold,
                  fontFamily: wingShackTheme.typography.fontFamily.body,
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                }}
                onMouseEnter={(e) => {
                  if (!showHowToPlay) {
                    e.currentTarget.style.backgroundColor = wingShackTheme.colors.secondary;
                    e.currentTarget.style.color = '#000';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showHowToPlay) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                    e.currentTarget.style.color = wingShackTheme.colors.text;
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                  }
                }}
              >
                {showHowToPlay ? '✕ Close' : 'ℹ️ How to Play'}
              </button>

              {/* Leaderboard Button - Show for Snake, Flappy Wing, and Sauce Simon games */}
              {(title === 'Snake' || title === 'Flappy Wing' || title === 'Sauce Simon') && (
                <Link
                  href={
                    title === 'Snake' 
                      ? '/snake/leaderboard' 
                      : title === 'Flappy Wing'
                      ? '/flappy-wing/leaderboard'
                      : '/sauce-simon/leaderboard'
                  }
                  style={{
                    textDecoration: 'none',
                  }}
                >
                  <button
                    style={{
                      padding: 'clamp(8px, 1.5vw, 10px) clamp(12px, 2vw, 16px)',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      color: wingShackTheme.colors.text,
                      border: 'none',
                      borderRadius: wingShackTheme.borderRadius.md,
                      cursor: 'pointer',
                      fontSize: 'clamp(11px, 2vw, 13px)',
                      fontWeight: wingShackTheme.typography.fontWeight.semibold,
                      fontFamily: wingShackTheme.typography.fontFamily.body,
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = wingShackTheme.colors.secondary;
                      e.currentTarget.style.color = '#000';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                      e.currentTarget.style.color = wingShackTheme.colors.text;
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    🏆 Leaderboard
                  </button>
                </Link>
              )}

              {/* Sound Toggle */}
              <button
                onClick={toggleSound}
                style={{
                  padding: 'clamp(8px, 1.5vw, 10px)',
                  backgroundColor: soundEnabled ? 'rgba(78, 205, 196, 0.15)' : 'rgba(255, 255, 255, 0.95)',
                  color: soundEnabled ? '#4ECDC4' : wingShackTheme.colors.text,
                  border: 'none',
                  borderRadius: wingShackTheme.borderRadius.md,
                  cursor: 'pointer',
                  fontSize: 'clamp(16px, 2.5vw, 18px)',
                  minWidth: 'clamp(36px, 6vw, 40px)',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = soundEnabled ? 'rgba(78, 205, 196, 0.25)' : wingShackTheme.colors.secondary;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = soundEnabled ? 'rgba(78, 205, 196, 0.15)' : 'rgba(255, 255, 255, 0.95)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
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
                    padding: 'clamp(8px, 1.5vw, 10px)',
                    backgroundColor: isPaused ? 'rgba(255, 107, 107, 0.15)' : 'rgba(78, 205, 196, 0.15)',
                    color: isPaused ? '#FF6B6B' : '#4ECDC4',
                    border: 'none',
                    borderRadius: wingShackTheme.borderRadius.md,
                    cursor: 'pointer',
                    fontSize: 'clamp(16px, 2.5vw, 18px)',
                    minWidth: 'clamp(36px, 6vw, 40px)',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isPaused
                      ? 'rgba(255, 107, 107, 0.25)'
                      : 'rgba(78, 205, 196, 0.25)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isPaused
                      ? 'rgba(255, 107, 107, 0.15)'
                      : 'rgba(78, 205, 196, 0.15)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
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
                    padding: 'clamp(8px, 1.5vw, 10px) clamp(16px, 3vw, 20px)',
                    backgroundColor: wingShackTheme.colors.primary,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: wingShackTheme.borderRadius.md,
                    cursor: 'pointer',
                    fontSize: 'clamp(12px, 2.5vw, 14px)',
                    fontWeight: wingShackTheme.typography.fontWeight.bold,
                    fontFamily: wingShackTheme.typography.fontFamily.body,
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 8px rgba(159, 8, 8, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(159, 8, 8, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(159, 8, 8, 0.3)';
                  }}
                >
                  Start
                </button>
              ) : (
                <button
                  onClick={handleReset}
                  style={{
                    padding: 'clamp(8px, 1.5vw, 10px) clamp(16px, 3vw, 20px)',
                    backgroundColor: '#FF6B6B',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: wingShackTheme.borderRadius.md,
                    cursor: 'pointer',
                    fontSize: 'clamp(12px, 2.5vw, 14px)',
                    fontWeight: wingShackTheme.typography.fontWeight.bold,
                    fontFamily: wingShackTheme.typography.fontFamily.body,
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 8px rgba(255, 107, 107, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 107, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 107, 107, 0.3)';
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
                  paddingTop: 'clamp(6px, 1vw, 8px)',
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
            ref={gameContentRef}
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
      </GameShellContext.Provider>
    );
  }
);

GameShell.displayName = 'GameShell';

export default GameShell;

