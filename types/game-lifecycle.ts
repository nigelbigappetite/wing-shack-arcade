/**
 * Standard game lifecycle interface that all games must implement.
 * This ensures consistent game state management across the application.
 */
export interface GameLifecycle {
  /**
   * Starts the game. Should initialize game state and begin gameplay.
   */
  start: () => void;

  /**
   * Pauses the game. Should pause all game logic, animations, and timers.
   */
  pause: () => void;

  /**
   * Resets the game to its initial state. Should clear all game state,
   * reset scores, and prepare for a new game session.
   */
  reset: () => void;
}

/**
 * Optional resume method for games that support it.
 * If not implemented, games should use start() to resume.
 */
export interface GameLifecycleWithResume extends GameLifecycle {
  /**
   * Resumes a paused game. Should continue from where it was paused.
   */
  resume?: () => void;
}

