'use client';

import React, { createContext, useContext, useRef, useCallback, useEffect, ReactNode } from 'react';
import { GameLifecycle } from '@/types/game-lifecycle';

interface GameLifecycleContextValue {
  register: (id: string, lifecycle: GameLifecycle) => void;
  unregister: (id: string) => void;
  getLifecycle: (id: string) => GameLifecycle | undefined;
  getAllLifecycles: () => Map<string, GameLifecycle>;
}

const GameLifecycleContext = createContext<GameLifecycleContextValue | null>(null);

/**
 * Provider component that manages game lifecycle registrations.
 * Should wrap components that contain games.
 */
export function GameLifecycleProvider({ children }: { children: ReactNode }) {
  const lifecyclesRef = useRef<Map<string, GameLifecycle>>(new Map());

  const register = useCallback((id: string, lifecycle: GameLifecycle) => {
    lifecyclesRef.current.set(id, lifecycle);
  }, []);

  const unregister = useCallback((id: string) => {
    lifecyclesRef.current.delete(id);
  }, []);

  const getLifecycle = useCallback((id: string) => {
    return lifecyclesRef.current.get(id);
  }, []);

  const getAllLifecycles = useCallback(() => {
    return lifecyclesRef.current;
  }, []);

  return (
    <GameLifecycleContext.Provider
      value={{
        register,
        unregister,
        getLifecycle,
        getAllLifecycles,
      }}
    >
      {children}
    </GameLifecycleContext.Provider>
  );
}

/**
 * Hook to access the game lifecycle context.
 */
export function useGameLifecycleContext() {
  const context = useContext(GameLifecycleContext);
  if (!context) {
    throw new Error('useGameLifecycleContext must be used within GameLifecycleProvider');
  }
  return context;
}

/**
 * Hook for games to register themselves with the lifecycle system.
 * Games should call this in their component to make themselves controllable.
 *
 * @example
 * ```tsx
 * function MyGame() {
 *   const lifecycle = useGameLifecycle();
 *   useRegisterGameLifecycle('my-game-id', lifecycle);
 *   return <div>Game content</div>;
 * }
 * ```
 */
export function useRegisterGameLifecycle(id: string, lifecycle: GameLifecycle) {
  const context = useGameLifecycleContext();
  const lifecycleRef = useRef(lifecycle);

  // Update ref when lifecycle changes
  lifecycleRef.current = lifecycle;

  useEffect(() => {
    context.register(id, lifecycleRef.current);
    return () => {
      context.unregister(id);
    };
  }, [id, context]);
}

