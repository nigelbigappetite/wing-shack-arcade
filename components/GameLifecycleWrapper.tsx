'use client';

import React, { useRef, useEffect, ReactNode } from 'react';
import { GameLifecycle } from '@/types/game-lifecycle';

/**
 * Wrapper component that automatically registers a game lifecycle with its parent card.
 * Games should wrap their content with this component and pass their lifecycle methods.
 *
 * @example
 * ```tsx
 * function MyGame() {
 *   const lifecycle = useGameLifecycle();
 *   return (
 *     <GameLifecycleWrapper lifecycle={lifecycle}>
 *       <div>Game content</div>
 *     </GameLifecycleWrapper>
 *   );
 * }
 * ```
 */
export interface GameLifecycleWrapperProps {
  lifecycle: GameLifecycle;
  children: ReactNode;
  id?: string;
}

const GameLifecycleWrapper: React.FC<GameLifecycleWrapperProps> = ({
  lifecycle,
  children,
  id,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const lifecycleRef = useRef(lifecycle);

  // Update ref when lifecycle changes
  lifecycleRef.current = lifecycle;

  // Expose lifecycle on the DOM element for parent components to find
  useEffect(() => {
    if (wrapperRef.current) {
      // Store lifecycle on the element for parent components to access
      (wrapperRef.current as any).__gameLifecycle = lifecycleRef.current;
      
      // Also set data attribute for easier querying
      wrapperRef.current.setAttribute('data-game-lifecycle', 'true');
      if (id) {
        wrapperRef.current.setAttribute('data-game-id', id);
      }
    }
  }, [id]);

  return (
    <div ref={wrapperRef} style={{ width: '100%', height: '100%' }}>
      {children}
    </div>
  );
};

export default GameLifecycleWrapper;

