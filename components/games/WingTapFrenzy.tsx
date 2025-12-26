'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameLifecycle } from '@/hooks/useGameLifecycle';
import GameLifecycleWrapper from '@/components/GameLifecycleWrapper';
import { wingShackTheme } from '@/theme/wingShackTheme';

interface Wing {
  id: string;
  x: number;
  y: number;
  createdAt: number;
}

interface WingTapFrenzyProps {
  onScore?: (score: number) => void;
}

const LEVEL_CONFIG = [
  { target: 20, duration: 15, spawnMin: 1000, spawnMax: 2000 }, // Level 1: 20 wings in 15s, 1-2s spawn
  { target: 20, duration: 20, spawnMin: 500, spawnMax: 1200 }, // Level 2: 20 wings in 20s, 0.5-1.2s spawn (faster)
];

const MAX_WINGS = 2; // Max 1-2 wings visible at once
const WING_SIZE = 80; // Size of wing in pixels
const MIN_DISTANCE = 120; // Minimum distance between wings to prevent overlap

const WingTapFrenzy: React.FC<WingTapFrenzyProps> = ({ onScore }) => {
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(LEVEL_CONFIG[0].duration);
  const [wings, setWings] = useState<Wing[]>([]);
  const [gameEnded, setGameEnded] = useState(false);
  const [isGameActive, setIsGameActive] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [showLevelMessage, setShowLevelMessage] = useState(false);
  const [levelMessage, setLevelMessage] = useState('');

  const gameContainerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wingSpawnRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const lastPauseTimeRef = useRef<number>(0);
  const isGameActiveRef = useRef<boolean>(false);
  const gameEndedRef = useRef<boolean>(false);
  const wingTapAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef<boolean>(false);
  const scoreRef = useRef<number>(0); // Ref to track score for accurate checking

  // Generate random position that doesn't overlap with existing wings
  const generateRandomPosition = useCallback((existingWings: Wing[]): { x: number; y: number } | null => {
    if (!gameContainerRef.current) return null;

    const container = gameContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const padding = WING_SIZE / 2;
    // Ensure wings stay within bounds
    const maxX = Math.max(0, containerRect.width - WING_SIZE - padding);
    const maxY = Math.max(0, containerRect.height - WING_SIZE - padding);

    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      const x = Math.max(padding, Math.min(maxX, Math.random() * maxX + padding));
      const y = Math.max(padding, Math.min(maxY, Math.random() * maxY + padding));

      // Check if this position overlaps with existing wings
      const tooClose = existingWings.some((wing) => {
        const distance = Math.sqrt(
          Math.pow(wing.x - x, 2) + Math.pow(wing.y - y, 2)
        );
        return distance < MIN_DISTANCE;
      });

      if (!tooClose) {
        return { x, y };
      }

      attempts++;
    }

    // If we can't find a non-overlapping position, return a random one anyway
    return {
      x: Math.max(padding, Math.min(maxX, Math.random() * maxX + padding)),
      y: Math.max(padding, Math.min(maxY, Math.random() * maxY + padding)),
    };
  }, []);

  // Spawn a new wing
  const spawnWing = useCallback(() => {
    setWings((prevWings) => {
      // Remove wings that are too old (more than 1 second)
      const now = Date.now();
      const filteredWings = prevWings.filter(
        (wing) => now - wing.createdAt < 1000
      );

      // Don't spawn if we already have max wings
      if (filteredWings.length >= MAX_WINGS) {
        return filteredWings;
      }

      const position = generateRandomPosition(filteredWings);
      if (!position) return filteredWings;

      const newWing: Wing = {
        id: `wing-${Date.now()}-${Math.random()}`,
        x: position.x,
        y: position.y,
        createdAt: now,
      };

      return [...filteredWings, newWing];
    });
  }, [generateRandomPosition]);

  // Handle wing tap
  const handleWingTap = useCallback(
    (wingId: string) => {
      if (!isGameActiveRef.current || gameEndedRef.current) return;

      // Play tap sound
      if (wingTapAudioRef.current && audioUnlockedRef.current) {
        try {
          wingTapAudioRef.current.currentTime = 0;
          wingTapAudioRef.current.play().catch(() => {
            // Ignore autoplay errors
          });
        } catch (e) {
          // Ignore audio errors
        }
      }

      setWings((prevWings) => prevWings.filter((wing) => wing.id !== wingId));
      setScore((prev) => {
        const newScore = prev + 1;
        scoreRef.current = newScore; // Update ref
        onScore?.(newScore);
        return newScore;
      });

      // Spawn a new wing after a short delay
      setTimeout(() => {
        if (isGameActiveRef.current && !gameEndedRef.current) {
          spawnWing();
        }
      }, 200);
    },
    [onScore, spawnWing]
  );

  // Game timer using requestAnimationFrame for precision
  const updateTimer = useCallback(() => {
    if (!isGameActiveRef.current || gameEndedRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const levelConfig = LEVEL_CONFIG[currentLevel];
    const now = Date.now();
    const elapsed = (now - startTimeRef.current - pausedTimeRef.current) / 1000;
    const remaining = Math.max(0, levelConfig.duration - elapsed);

    setTimeRemaining(Math.ceil(remaining));

    if (remaining <= 0) {
      isGameActiveRef.current = false;
      gameEndedRef.current = true;
      setIsGameActive(false);
      setGameEnded(true);
      setWings([]);
      
      // Check if target was met - use ref for accurate score
      const target = levelConfig.target;
      const currentScore = scoreRef.current;
      if (currentScore >= target) {
        // Level complete - check if there's a next level
        if (currentLevel < LEVEL_CONFIG.length - 1) {
          setLevelMessage('LEVEL COMPLETE!');
          setShowLevelMessage(true);
          // Don't auto-advance - wait for button click
        } else {
          // All levels complete
          setLevelMessage('ALL LEVELS COMPLETE!');
          setShowLevelMessage(true);
        }
      } else {
        // Failed to meet target
        setLevelMessage(`YOU LOSE!\nTarget: ${target}\nYou got: ${currentScore}`);
        setShowLevelMessage(true);
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (wingSpawnRef.current) {
        clearTimeout(wingSpawnRef.current);
        wingSpawnRef.current = null;
      }
    } else {
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    }
  }, [currentLevel, score]);

  // Start the game
  const startGame = useCallback(() => {
    const levelConfig = LEVEL_CONFIG[currentLevel];
    setScore(0);
    scoreRef.current = 0; // Reset score ref
    setTimeRemaining(levelConfig.duration);
    setWings([]);
    setGameEnded(false);
    gameEndedRef.current = false;
    setShowLevelMessage(false);
    pausedTimeRef.current = 0;
    lastPauseTimeRef.current = 0;
    startTimeRef.current = Date.now();
    isGameActiveRef.current = true;
    setIsGameActive(true);

    // Start timer
    animationFrameRef.current = requestAnimationFrame(updateTimer);

    // Spawn first wing after a short delay
    setTimeout(() => {
      if (isGameActiveRef.current && !gameEndedRef.current) {
        spawnWing();
      }
    }, 500);

    // Set up wing spawning interval (spawn based on level config)
    const spawnInterval = () => {
      if (!isGameActiveRef.current || gameEndedRef.current) return;

      const levelConfig = LEVEL_CONFIG[currentLevel];
      const delay = Math.random() * (levelConfig.spawnMax - levelConfig.spawnMin) + levelConfig.spawnMin;
      wingSpawnRef.current = setTimeout(() => {
        if (isGameActiveRef.current && !gameEndedRef.current) {
          spawnWing();
          spawnInterval();
        }
      }, delay);
    };

    spawnInterval();
  }, [updateTimer, spawnWing, currentLevel]);

  // Pause the game
  const pauseGame = useCallback(() => {
    isGameActiveRef.current = false;
    setIsGameActive(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (wingSpawnRef.current) {
      clearTimeout(wingSpawnRef.current);
      wingSpawnRef.current = null;
    }
    lastPauseTimeRef.current = Date.now();
  }, []);

  // Resume the game
  const resumeGame = useCallback(() => {
    if (gameEndedRef.current) return;

    const pauseDuration = Date.now() - lastPauseTimeRef.current;
    pausedTimeRef.current += pauseDuration;
    isGameActiveRef.current = true;
    setIsGameActive(true);

    // Resume timer
    animationFrameRef.current = requestAnimationFrame(updateTimer);

    // Resume wing spawning
    const spawnInterval = () => {
      if (!isGameActiveRef.current || gameEndedRef.current) return;

      const levelConfig = LEVEL_CONFIG[currentLevel];
      const delay = Math.random() * (levelConfig.spawnMax - levelConfig.spawnMin) + levelConfig.spawnMin;
      wingSpawnRef.current = setTimeout(() => {
        if (isGameActiveRef.current && !gameEndedRef.current) {
          spawnWing();
          spawnInterval();
        }
      }, delay);
    };

    spawnInterval();
  }, [updateTimer, spawnWing, currentLevel]);

  // Reset the game
  const resetGame = useCallback(() => {
    isGameActiveRef.current = false;
    gameEndedRef.current = false;
    setIsGameActive(false);
    setGameEnded(false);
    setScore(0);
    scoreRef.current = 0; // Reset score ref
    setCurrentLevel(0);
    setShowLevelMessage(false);
    setTimeRemaining(LEVEL_CONFIG[0].duration);
    setWings([]);
    pausedTimeRef.current = 0;
    lastPauseTimeRef.current = 0;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (wingSpawnRef.current) {
      clearTimeout(wingSpawnRef.current);
      wingSpawnRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Game lifecycle integration
  const lifecycle = useGameLifecycle({
    onStart: startGame,
    onPause: pauseGame,
    onResume: resumeGame,
    onReset: resetGame,
  });

  // Initialize audio
  useEffect(() => {
    const audio = new Audio('/mixkit-chewing-something-crunchy-2244.mp3.mp3');
    audio.preload = 'auto';
    audio.volume = 0.7;
    wingTapAudioRef.current = audio;

    // Unlock audio on first user interaction
    const unlockAudio = () => {
      if (!audioUnlockedRef.current) {
        audioUnlockedRef.current = true;
        // Try to play and immediately pause to unlock
        audio.play().then(() => {
          audio.pause();
          audio.currentTime = 0;
        }).catch(() => {
          // Ignore errors
        });
      }
    };

    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, []);

  // Auto-remove wings after 1 second
  useEffect(() => {
    if (!isGameActiveRef.current || gameEndedRef.current) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setWings((prevWings) => {
        return prevWings.filter((wing) => now - wing.createdAt < 1000);
      });
    }, 100); // Check every 100ms

    return () => clearInterval(interval);
  }, [isGameActive, gameEnded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (wingSpawnRef.current) {
        clearTimeout(wingSpawnRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <GameLifecycleWrapper lifecycle={lifecycle}>
      <div
        ref={gameContainerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: 'clamp(400px, 60vh, 600px)',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          borderRadius: wingShackTheme.borderRadius.lg,
          touchAction: 'manipulation', // Optimize for touch
          isolation: 'isolate', // Create new stacking context to prevent gaps
        }}
      >
        {/* Game UI Overlay */}
        {!gameEnded && (
          <div
            style={{
              position: 'absolute',
              top: 'clamp(12px, 2vw, 20px)',
              left: 'clamp(12px, 2vw, 20px)',
              right: 'clamp(12px, 2vw, 20px)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 10,
              pointerEvents: 'none',
            }}
          >
            {/* Score */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                padding: 'clamp(8px, 1.5vw, 12px) clamp(16px, 2.5vw, 24px)',
                borderRadius: wingShackTheme.borderRadius.lg,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
            >
              <div
                style={{
                  fontFamily: wingShackTheme.typography.fontFamily.display,
                  fontSize: 'clamp(18px, 3vw, 24px)',
                  fontWeight: wingShackTheme.typography.fontWeight.bold,
                  color: wingShackTheme.colors.primary,
                }}
              >
                {scoreRef.current || score} / {LEVEL_CONFIG[currentLevel].target}
              </div>
            </div>

            {/* Timer - Digital Display */}
            <div
              style={{
                backgroundColor: '#000000',
                padding: 'clamp(10px, 2vw, 14px) clamp(20px, 3vw, 28px)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 2px 4px rgba(0, 0, 0, 0.5)',
                border: '2px solid #333333',
                position: 'relative',
              }}
            >
              {/* Digital timer glow effect */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: '6px',
                  background: timeRemaining <= 3
                    ? 'radial-gradient(circle, rgba(159, 8, 8, 0.3) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(0, 255, 0, 0.2) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  fontFamily: "'Courier New', 'Monaco', monospace",
                  fontSize: 'clamp(24px, 4vw, 32px)',
                  fontWeight: 'bold',
                  color: timeRemaining <= 3 ? '#ff4444' : '#00ff00',
                  textShadow: `0 0 10px ${timeRemaining <= 3 ? 'rgba(255, 68, 68, 0.8)' : 'rgba(0, 255, 0, 0.8)'}, 0 0 20px ${timeRemaining <= 3 ? 'rgba(255, 68, 68, 0.5)' : 'rgba(0, 255, 0, 0.5)'}`,
                  letterSpacing: '2px',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {timeRemaining}
              </div>
            </div>
          </div>
        )}

        {/* Wings */}
        <AnimatePresence>
          {wings.map((wing) => (
            <motion.div
              key={wing.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20,
              }}
              onClick={() => handleWingTap(wing.id)}
              onTouchStart={(e) => {
                e.preventDefault();
                handleWingTap(wing.id);
              }}
              style={{
                position: 'absolute',
                left: `${wing.x}px`,
                top: `${wing.y}px`,
                width: `${WING_SIZE}px`,
                height: `${WING_SIZE}px`,
                cursor: 'pointer',
                userSelect: 'none',
                touchAction: 'manipulation',
                zIndex: 5,
              }}
            >
              {/* Wing Emoji/Icon */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  fontSize: `${WING_SIZE * 0.8}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
                  transition: 'transform 0.1s ease',
                }}
              >
                🍗
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Level Message Overlay */}
        <AnimatePresence>
          {showLevelMessage && (
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
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'clamp(16px, 3vw, 24px)',
                zIndex: 25,
                padding: 'clamp(20px, 4vw, 40px)',
              }}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                style={{
                  fontFamily: wingShackTheme.typography.fontFamily.display,
                  fontSize: 'clamp(32px, 5vw, 48px)',
                  fontWeight: wingShackTheme.typography.fontWeight.bold,
                  color: levelMessage.includes('LOSE') ? wingShackTheme.colors.error : '#00ff00',
                  textAlign: 'center',
                  whiteSpace: 'pre-line',
                  lineHeight: 1.4,
                }}
              >
                {levelMessage}
              </motion.div>
              
              {/* Next Level Button - only show if level complete and not all levels done */}
              {levelMessage.includes('LEVEL COMPLETE') && currentLevel < LEVEL_CONFIG.length - 1 && (
                <motion.button
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  onClick={() => {
                    setShowLevelMessage(false);
                    // Advance to next level
                    setCurrentLevel(currentLevel + 1);
                    setScore(0);
                    scoreRef.current = 0;
                    setTimeRemaining(LEVEL_CONFIG[currentLevel + 1].duration);
                    setGameEnded(false);
                    gameEndedRef.current = false;
                    // Start next level
                    setTimeout(() => {
                      startGame();
                    }, 100);
                  }}
                  style={{
                    padding: 'clamp(12px, 2vw, 16px) clamp(32px, 5vw, 48px)',
                    backgroundColor: wingShackTheme.colors.secondary,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: wingShackTheme.borderRadius.lg,
                    fontFamily: wingShackTheme.typography.fontFamily.display,
                    fontSize: 'clamp(18px, 3vw, 24px)',
                    fontWeight: wingShackTheme.typography.fontWeight.bold,
                    letterSpacing: '2px',
                    cursor: 'pointer',
                    boxShadow: `0 6px 20px ${wingShackTheme.colors.secondary}50`,
                    transition: 'all 0.3s ease',
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  NEXT LEVEL →
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* End Screen */}
        <AnimatePresence>
          {gameEnded && !showLevelMessage && (
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
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'clamp(16px, 3vw, 24px)',
                zIndex: 20,
                padding: 'clamp(20px, 4vw, 40px)',
              }}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{
                  fontFamily: wingShackTheme.typography.fontFamily.display,
                  fontSize: 'clamp(32px, 5vw, 48px)',
                  fontWeight: wingShackTheme.typography.fontWeight.bold,
                  color: wingShackTheme.colors.primary,
                  textAlign: 'center',
                }}
              >
                Time's Up!
              </motion.div>

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{
                  fontFamily: wingShackTheme.typography.fontFamily.display,
                  fontSize: 'clamp(48px, 8vw, 72px)',
                  fontWeight: wingShackTheme.typography.fontWeight.bold,
                  color: wingShackTheme.colors.secondary,
                  textAlign: 'center',
                }}
              >
                {scoreRef.current || score} / {LEVEL_CONFIG[currentLevel].target}
              </motion.div>

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{
                  fontFamily: wingShackTheme.typography.fontFamily.body,
                  fontSize: 'clamp(16px, 2.5vw, 20px)',
                  color: wingShackTheme.colors.textSecondary,
                  textAlign: 'center',
                }}
              >
                LEVEL {currentLevel + 1} - TARGET: {LEVEL_CONFIG[currentLevel].target}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start Screen / Instructions */}
        {!isGameActive && !gameEnded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'clamp(16px, 3vw, 24px)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              zIndex: 15,
              padding: 'clamp(20px, 4vw, 40px)',
            }}
          >
            <div
              style={{
                fontSize: 'clamp(64px, 10vw, 96px)',
                marginBottom: 'clamp(8px, 1.5vw, 16px)',
              }}
            >
              🍗
            </div>
            <div
              style={{
                fontFamily: wingShackTheme.typography.fontFamily.display,
                fontSize: 'clamp(24px, 4vw, 32px)',
                fontWeight: wingShackTheme.typography.fontWeight.bold,
                color: wingShackTheme.colors.primary,
                textAlign: 'center',
              }}
            >
              WING TAP FRENZY
            </div>
            <div
              style={{
                fontFamily: wingShackTheme.typography.fontFamily.body,
                fontSize: 'clamp(14px, 2vw, 18px)',
                color: wingShackTheme.colors.textSecondary,
                textAlign: 'center',
                maxWidth: '400px',
              }}
            >
              Tap as many wings as you can in 10 seconds!
            </div>
          </motion.div>
        )}
      </div>
    </GameLifecycleWrapper>
  );
};

export default WingTapFrenzy;

