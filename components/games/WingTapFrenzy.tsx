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
  isNegative?: boolean; // true for negative items (bone/chilli)
}

interface WingTapFrenzyProps {
  onScore?: (score: number) => void;
}

const LEVEL_CONFIG = [
  { target: 20, duration: 10, spawnMin: 1000, spawnMax: 2000, wingLifetime: 1000 }, // Level 1: 20 wings in 10s, 1-2s spawn, 1s lifetime
  { target: 30, duration: 10, spawnMin: 500, spawnMax: 1200, wingLifetime: 600 }, // Level 2: 30 wings in 10s, 0.5-1.2s spawn, 0.6s lifetime (faster)
  { target: 40, duration: 15, spawnMin: 500, spawnMax: 1200, wingLifetime: 600 }, // Level 3: 40 wings in 15s, 0.5-1.2s spawn, 0.6s lifetime, has negative items (broccoli)
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
  const [showTryAgain, setShowTryAgain] = useState(false);
  const [levelCompleted, setLevelCompleted] = useState(false); // Track if level was actually completed
  const [showEndScore, setShowEndScore] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [floatingMinusOnes, setFloatingMinusOnes] = useState<Array<{ id: string; x: number; y: number }>>([]);
  const negativeSpawnCounterRef = useRef<number>(0); // Track spawns for negative item frequency

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
  const currentLevelRef = useRef<number>(0); // Ref to track current level for accurate timer

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

  // Spawn a new wing or negative item
  const spawnWing = useCallback(() => {
    setWings((prevWings) => {
      const levelConfig = LEVEL_CONFIG[currentLevel];
      const now = Date.now();
      // Remove items that are too old based on level
      const filteredWings = prevWings.filter(
        (wing) => now - wing.createdAt < levelConfig.wingLifetime
      );

      // Don't spawn if we already have max wings
      if (filteredWings.length >= MAX_WINGS) {
        return filteredWings;
      }

      const position = generateRandomPosition(filteredWings);
      if (!position) return filteredWings;

      // In Level 3, sometimes spawn negative item (1 per 6-10 wings)
      const isLevel3 = currentLevel === 2;
      let isNegative = false;
      if (isLevel3) {
        negativeSpawnCounterRef.current++;
        // Spawn negative item roughly 1 in every 8 wings (between 6-10)
        if (negativeSpawnCounterRef.current >= 8) {
          isNegative = true;
          negativeSpawnCounterRef.current = 0;
        }
      }

      const newWing: Wing = {
        id: `${isNegative ? 'negative' : 'wing'}-${Date.now()}-${Math.random()}`,
        x: position.x,
        y: position.y,
        createdAt: now,
        isNegative: isNegative,
      };

      return [...filteredWings, newWing];
    });
  }, [generateRandomPosition, currentLevel]);

  // Handle wing/negative item tap
  const handleWingTap = useCallback(
    (wingId: string, isNegative: boolean) => {
      if (!isGameActiveRef.current || gameEndedRef.current) return;

      // Find the tapped item
      const tappedItem = wings.find((w) => w.id === wingId);
      if (!tappedItem) return;

      // Play tap sound only for positive items
      if (!isNegative && wingTapAudioRef.current && audioUnlockedRef.current) {
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
      
      if (isNegative) {
        // Subtract 1 point (minimum 0)
        setScore((prev) => {
          const newScore = Math.max(0, prev - 1);
          scoreRef.current = newScore; // Update ref
          onScore?.(newScore);
          return newScore;
        });
        // Show floating -1 animation
        const container = gameContainerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const floatingId = `minus-${Date.now()}-${Math.random()}`;
          setFloatingMinusOnes((prev) => [
            ...prev,
            {
              id: floatingId,
              x: tappedItem.x - rect.left,
              y: tappedItem.y - rect.top,
            },
          ]);
          // Remove after animation
          setTimeout(() => {
            setFloatingMinusOnes((prev) => prev.filter((f) => f.id !== floatingId));
          }, 700);
        }
      } else {
        // Add 1 point
        setScore((prev) => {
          const newScore = prev + 1;
          scoreRef.current = newScore; // Update ref
          onScore?.(newScore);
          return newScore;
        });
      }

      // Spawn a new item after a short delay
      setTimeout(() => {
        if (isGameActiveRef.current && !gameEndedRef.current) {
          spawnWing();
        }
      }, 200);
    },
    [onScore, spawnWing, wings]
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

    const levelConfig = LEVEL_CONFIG[currentLevelRef.current];
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
      const levelForCheck = currentLevelRef.current;
      
      // Show score immediately
      setFinalScore(currentScore);
      setShowEndScore(true);
      
      // Wait 800-1200ms before showing message
      setTimeout(() => {
        if (currentScore >= target) {
          // Level complete
          setLevelCompleted(true);
          setShowTryAgain(false);
          if (levelForCheck === 0) {
            // Level 1 Complete
            setLevelMessage('Nice start.\nYou\'re quicker than the average player.');
            setShowLevelMessage(true);
          } else if (levelForCheck === 1) {
            // Level 2 Complete
            setLevelMessage('Level 2 Complete\nThat speed catches most people out. Final round next.');
            setShowLevelMessage(true);
          } else {
            // Level 3 Complete - go directly to Game Complete
            setLevelMessage('GAME_COMPLETE');
            setShowLevelMessage(true);
          }
        } else {
          // Failed to meet target
          setLevelCompleted(false);
          setShowTryAgain(true);
          if (levelForCheck === 0) {
            setLevelMessage('Just short.\nGet the rhythm — try again.');
          } else if (levelForCheck === 1) {
            setLevelMessage('That jump is tough.\nMost players drop off here.');
          } else {
            setLevelMessage('So close.\nThe broccoli catches people out.');
          }
          setShowLevelMessage(true);
        }
      }, 1000);
      
      // Clean up all timers
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
  }, [currentLevel, score, spawnWing]);

  // Start the game
  const startGame = useCallback((levelOverride?: number) => {
    const levelToUse = levelOverride !== undefined ? levelOverride : currentLevel;
    currentLevelRef.current = levelToUse; // Update ref immediately
    const levelConfig = LEVEL_CONFIG[levelToUse];
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

      const levelConfig = LEVEL_CONFIG[levelToUse];
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

  // Reset the game (full reset to Level 1)
  const resetGame = useCallback(() => {
    isGameActiveRef.current = false;
    gameEndedRef.current = false;
    setIsGameActive(false);
    setGameEnded(false);
    setScore(0);
    scoreRef.current = 0; // Reset score ref
    negativeSpawnCounterRef.current = 0; // Reset negative spawn counter
    setCurrentLevel(0);
    currentLevelRef.current = 0; // Reset level ref
    setShowLevelMessage(false);
    setShowTryAgain(false);
    setShowEndScore(false);
    setLevelCompleted(false);
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

        {/* Floating -1 Animations */}
        <AnimatePresence>
          {floatingMinusOnes.map((minusOne) => (
            <motion.div
              key={minusOne.id}
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: -60, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                left: `${minusOne.x}px`,
                top: `${minusOne.y}px`,
                fontFamily: wingShackTheme.typography.fontFamily.display,
                fontSize: 'clamp(32px, 5vw, 48px)',
                fontWeight: wingShackTheme.typography.fontWeight.bold,
                color: wingShackTheme.colors.error,
                pointerEvents: 'none',
                zIndex: 30,
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
              }}
            >
              -1
            </motion.div>
          ))}
        </AnimatePresence>

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
              onClick={() => handleWingTap(wing.id, wing.isNegative || false)}
              onTouchStart={(e) => {
                e.preventDefault();
                handleWingTap(wing.id, wing.isNegative || false);
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
                WebkitTapHighlightColor: 'transparent',
                outline: 'none',
              } as React.CSSProperties}
            >
              {/* Wing or Negative Item Emoji/Icon */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  fontSize: `${WING_SIZE * 0.8}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  filter: wing.isNegative 
                    ? 'drop-shadow(0 4px 8px rgba(255, 0, 0, 0.5))' 
                    : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
                  transition: 'transform 0.1s ease',
                  transform: wing.isNegative ? 'rotate(45deg)' : 'none',
                  WebkitTapHighlightColor: 'transparent',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              >
                {wing.isNegative ? '🥦' : '🍗'}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Level Message Overlay */}
        <AnimatePresence>
          {(showEndScore || showLevelMessage) && levelMessage !== 'GAME_COMPLETE' && (
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
              {/* Score Display - always show when overlay is visible */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.05 }}
                style={{
                  fontFamily: wingShackTheme.typography.fontFamily.display,
                  fontSize: 'clamp(24px, 4vw, 32px)',
                  fontWeight: wingShackTheme.typography.fontWeight.bold,
                  color: '#ffffff',
                  textAlign: 'center',
                  marginBottom: showLevelMessage ? 'clamp(8px, 1.5vw, 16px)' : 0,
                }}
              >
                Score: {finalScore} / {LEVEL_CONFIG[currentLevel].target}
              </motion.div>

              {/* Title - only show when message is ready */}
              {showLevelMessage && (
                <>
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    style={{
                      fontFamily: wingShackTheme.typography.fontFamily.display,
                      fontSize: 'clamp(32px, 5vw, 48px)',
                      fontWeight: wingShackTheme.typography.fontWeight.bold,
                      color: showTryAgain ? wingShackTheme.colors.error : '#00ff00',
                      textAlign: 'center',
                      whiteSpace: 'pre-line',
                      lineHeight: 1.4,
                    }}
                  >
                    {levelMessage.split('\n')[0]}
                  </motion.div>

                  {/* Body */}
                  {levelMessage.includes('\n') && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      style={{
                        fontFamily: wingShackTheme.typography.fontFamily.body,
                        fontSize: 'clamp(18px, 3vw, 24px)',
                        color: '#ffffff',
                        textAlign: 'center',
                        opacity: 0.9,
                      }}
                    >
                      {levelMessage.split('\n')[1]}
                    </motion.div>
                  )}
                </>
              )}
              
              {/* Next Level Button - ONLY show when level was actually completed (score >= target) and not all levels done */}
              {!showTryAgain && levelCompleted && currentLevel < LEVEL_CONFIG.length - 1 && (
                <motion.button
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  onClick={() => {
                    setShowLevelMessage(false);
                    setShowEndScore(false);
                    setLevelCompleted(false);
                    // Advance to next level
                    const nextLevel = currentLevel + 1;
                    setCurrentLevel(nextLevel);
                    currentLevelRef.current = nextLevel; // Update ref immediately
                    setScore(0);
                    scoreRef.current = 0;
                    negativeSpawnCounterRef.current = 0;
                    setTimeRemaining(LEVEL_CONFIG[nextLevel].duration);
                    setGameEnded(false);
                    gameEndedRef.current = false;
                    setWings([]);
                    // Start next level after state updates
                    setTimeout(() => {
                      startGame(nextLevel);
                    }, 50);
                  }}
                  style={{
                    padding: 'clamp(14px, 2.5vw, 18px) clamp(32px, 5vw, 48px)',
                    backgroundColor: wingShackTheme.colors.secondary,
                    color: '#000000',
                    border: 'none',
                    borderRadius: wingShackTheme.borderRadius.lg,
                    fontFamily: wingShackTheme.typography.fontFamily.display,
                    fontSize: 'clamp(16px, 2.5vw, 20px)',
                    fontWeight: wingShackTheme.typography.fontWeight.bold,
                    letterSpacing: '1px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    transition: 'all 0.2s ease',
                    marginTop: 'clamp(16px, 3vw, 24px)',
                    opacity: 1,
                  }}
                  whileHover={{ y: -2, boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)' }}
                  whileTap={{ y: 0 }}
                >
                  NEXT LEVEL →
                </motion.button>
              )}

              {/* Try Again Button - show ONLY on failure (when showTryAgain is true) */}
              {showTryAgain && !levelCompleted && (
                <motion.button
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  onClick={() => {
                    // Full reset to Level 1
                    resetGame();
                    setShowLevelMessage(false);
                    setShowTryAgain(false);
                    setShowEndScore(false);
                    setLevelCompleted(false);
                  }}
                  style={{
                    padding: 'clamp(14px, 2.5vw, 18px) clamp(32px, 5vw, 48px)',
                    backgroundColor: wingShackTheme.colors.primary,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: wingShackTheme.borderRadius.lg,
                    fontFamily: wingShackTheme.typography.fontFamily.display,
                    fontSize: 'clamp(16px, 2.5vw, 20px)',
                    fontWeight: wingShackTheme.typography.fontWeight.bold,
                    letterSpacing: '1px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(159, 8, 8, 0.3)',
                    transition: 'all 0.2s ease',
                    marginTop: 'clamp(16px, 3vw, 24px)',
                    opacity: 1,
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  TRY AGAIN
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Complete Overlay (Level 3 Success) */}
        <AnimatePresence>
          {showLevelMessage && levelMessage === 'GAME_COMPLETE' && (
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
                backgroundColor: 'rgba(0, 0, 0, 0.95)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'clamp(16px, 3vw, 24px)',
                zIndex: 25,
                padding: 'clamp(20px, 4vw, 40px)',
              }}
            >
              {/* Big Headline */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                style={{
                  fontFamily: wingShackTheme.typography.fontFamily.display,
                  fontSize: 'clamp(48px, 8vw, 72px)',
                  fontWeight: wingShackTheme.typography.fontWeight.bold,
                  color: '#00ff00',
                  textAlign: 'center',
                }}
              >
                Game Complete
              </motion.div>

              {/* Status Line */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{
                  fontFamily: wingShackTheme.typography.fontFamily.display,
                  fontSize: 'clamp(24px, 4vw, 32px)',
                  fontWeight: wingShackTheme.typography.fontWeight.bold,
                  color: '#ffffff',
                  textAlign: 'center',
                }}
              >
                Only 9% of players finish all three levels.
              </motion.div>

              {/* Supporting Line */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{
                  fontFamily: wingShackTheme.typography.fontFamily.body,
                  fontSize: 'clamp(18px, 3vw, 24px)',
                  color: '#ffffff',
                  textAlign: 'center',
                  opacity: 0.9,
                }}
              >
                That puts you in rare company.
              </motion.div>

              {/* Play Again Button */}
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 }}
                onClick={() => {
                  resetGame();
                  setShowLevelMessage(false);
                  setShowEndScore(false);
                  setLevelCompleted(false);
                }}
                style={{
                  padding: 'clamp(14px, 2.5vw, 18px) clamp(32px, 5vw, 48px)',
                  backgroundColor: wingShackTheme.colors.secondary,
                  color: '#000000',
                  border: 'none',
                  borderRadius: wingShackTheme.borderRadius.lg,
                  fontFamily: wingShackTheme.typography.fontFamily.display,
                  fontSize: 'clamp(16px, 2.5vw, 20px)',
                  fontWeight: wingShackTheme.typography.fontWeight.bold,
                  letterSpacing: '1px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  transition: 'all 0.2s ease',
                  marginTop: 'clamp(16px, 3vw, 24px)',
                  opacity: 1,
                }}
                whileHover={{ y: -2, boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)' }}
                whileTap={{ y: 0 }}
              >
                Play Again
              </motion.button>
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

