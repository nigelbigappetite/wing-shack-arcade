'use client';

import { useRef, useImperativeHandle, ForwardedRef } from 'react';
import { GameLifecycle } from '@/types/game-lifecycle';
import { useGameLifecycle, UseGameLifecycleReturn } from './useGameLifecycle';

/**
 * Hook that combines useGameLifecycle with ref forwarding.
 * Games can use this to expose their lifecycle via a ref.
 *
 * @example
 * ```tsx
 * function MyGame({ gameRef }: { gameRef?: ForwardedRef<GameLifecycle> }) {
 *   const lifecycle = useGameLifecycleRef(gameRef, {
 *     onStart: () => console.log('Started'),
 *   });
 *   return <div>Game content</div>;
 * }
 * ```
 */
export function useGameLifecycleRef(
  ref: ForwardedRef<GameLifecycle> | undefined,
  options?: Parameters<typeof useGameLifecycle>[0]
): UseGameLifecycleReturn {
  const lifecycle = useGameLifecycle(options);

  useImperativeHandle(
    ref,
    () => ({
      start: lifecycle.start,
      pause: lifecycle.pause,
      reset: lifecycle.reset,
    }),
    [lifecycle.start, lifecycle.pause, lifecycle.reset]
  );

  return lifecycle;
}

