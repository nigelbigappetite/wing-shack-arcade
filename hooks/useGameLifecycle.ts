'use client';

import { useState, useCallback, useRef, useEffect, useImperativeHandle, ForwardedRef } from 'react';
import { GameLifecycle } from '@/types/game-lifecycle';

export interface UseGameLifecycleOptions {
  /**
   * Callback invoked when the game starts
   */
  onStart?: () => void;

  /**
   * Callback invoked when the game is paused
   */
  onPause?: () => void;

  /**
   * Callback invoked when the game is resumed
   */
  onResume?: () => void;

  /**
   * Callback invoked when the game is reset
   */
  onReset?: () => void;

  /**
   * Whether the game should auto-start when mounted
   */
  autoStart?: boolean;
}

export interface UseGameLifecycleReturn extends GameLifecycle {
  /**
   * Current game state
   */
  isPlaying: boolean;
  isPaused: boolean;
  isStopped: boolean;

  /**
   * Resume method (if pause was called, this resumes)
   */
  resume: () => void;
}

/**
 * Hook that manages game lifecycle state and provides methods to control it.
 * Games can use this hook to implement the GameLifecycle interface.
 *
 * @example
 * ```tsx
 * function MyGame() {
 *   const { start, pause, reset, isPlaying, isPaused } = useGameLifecycle({
 *     onStart: () => console.log('Game started'),
 *     onReset: () => console.log('Game reset'),
 *   });
 *
 *   // Expose lifecycle methods via ref for parent components
 *   useImperativeHandle(gameRef, () => ({ start, pause, reset }));
 *
 *   return <div>Game content</div>;
 * }
 * ```
 */
export function useGameLifecycle(
  options: UseGameLifecycleOptions = {}
): UseGameLifecycleReturn {
  const { onStart, onPause, onResume, onReset, autoStart = false } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const pauseStateRef = useRef<{ wasPlaying: boolean }>({ wasPlaying: false });

  // Auto-start if requested
  useEffect(() => {
    if (autoStart && !isPlaying) {
      start();
    }
  }, [autoStart]);

  const start = useCallback(() => {
    setIsPlaying(true);
    setIsPaused(false);
    pauseStateRef.current.wasPlaying = false;
    onStart?.();
  }, [onStart]);

  const pause = useCallback(() => {
    if (isPlaying && !isPaused) {
      setIsPaused(true);
      pauseStateRef.current.wasPlaying = true;
      onPause?.();
    }
  }, [isPlaying, isPaused, onPause]);

  const resume = useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      pauseStateRef.current.wasPlaying = false;
      onResume?.();
    }
  }, [isPaused, onResume]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setIsPaused(false);
    pauseStateRef.current.wasPlaying = false;
    onReset?.();
  }, [onReset]);

  return {
    start,
    pause,
    reset,
    resume,
    isPlaying,
    isPaused,
    isStopped: !isPlaying && !isPaused,
  };
}

/**
 * Helper hook to expose game lifecycle methods via a ref.
 * Useful when parent components need to control the game.
 *
 * @example
 * ```tsx
 * function MyGame({ gameRef }: { gameRef: ForwardedRef<GameLifecycle> }) {
 *   const lifecycle = useGameLifecycle();
 *   useExposeGameLifecycle(gameRef, lifecycle);
 *   return <div>Game content</div>;
 * }
 * ```
 */
export function useExposeGameLifecycle(
  ref: ForwardedRef<GameLifecycle> | undefined,
  lifecycle: UseGameLifecycleReturn
) {
  useImperativeHandle(
    ref,
    () => ({
      start: lifecycle.start,
      pause: lifecycle.pause,
      reset: lifecycle.reset,
    }),
    [lifecycle.start, lifecycle.pause, lifecycle.reset]
  );
}

