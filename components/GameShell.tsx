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
                    padding: 'clamp(6px, 1.5vw, 8px) clamp(8px, 2vw, 10px)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: wingShackTheme.colors.text,
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: 'clamp(10px, 2vw, 12px)',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
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
                  padding: 'clamp(6px, 1.5vw, 8px) clamp(8px, 2vw, 10px)',
                  backgroundColor: showHowToPlay ? wingShackTheme.colors.secondary : 'rgba(255, 255, 255, 0.1)',
                  color: showHowToPlay ? '#000' : wingShackTheme.colors.text,
                  border: `1px solid ${showHowToPlay ? wingShackTheme.colors.secondary : 'rgba(255, 255, 255, 0.2)'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: 'clamp(10px, 2vw, 12px)',
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

              {/* Leaderboard Button - Only show for Snake game */}
              {title === 'Snake' && (
                <Link
                  href="/snake/leaderboard"
                  style={{
                    textDecoration: 'none',
                  }}
                >
                  <button
                    style={{
                      padding: 'clamp(6px, 1.5vw, 8px) clamp(8px, 2vw, 10px)',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: wingShackTheme.colors.text,
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: 'clamp(10px, 2vw, 12px)',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = wingShackTheme.colors.secondary + '40';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
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
                  padding: 'clamp(6px, 1.5vw, 8px)',
                  backgroundColor: soundEnabled ? 'rgba(78, 205, 196, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: 'clamp(14px, 2.5vw, 16px)',
                  minWidth: 'clamp(32px, 6vw, 36px)',
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
                    padding: 'clamp(6px, 1.5vw, 8px)',
                    backgroundColor: isPaused ? 'rgba(255, 107, 107, 0.2)' : 'rgba(78, 205, 196, 0.2)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: 'clamp(14px, 2.5vw, 16px)',
                    minWidth: 'clamp(32px, 6vw, 36px)',
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
                    padding: 'clamp(6px, 1.5vw, 8px) clamp(12px, 3vw, 16px)',
                  backgroundColor: wingShackTheme.colors.primary,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: wingShackTheme.borderRadius.md,
                    cursor: 'pointer',
                    fontSize: 'clamp(12px, 2.5vw, 14px)',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = wingShackTheme.colors.primaryLight;
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.2)';
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
                    padding: 'clamp(6px, 1.5vw, 8px) clamp(12px, 3vw, 16px)',
                    backgroundColor: 'rgba(255, 107, 107, 0.8)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: 'clamp(12px, 2.5vw, 14px)',
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

