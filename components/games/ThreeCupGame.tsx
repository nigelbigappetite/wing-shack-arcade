'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameLifecycle } from '@/hooks/useGameLifecycle';
import GameLifecycleWrapper from '@/components/GameLifecycleWrapper';
import { wingShackTheme } from '@/theme/wingShackTheme';
import { useGameShellContext } from '@/components/GameShell';

interface ThreeCupGameProps {
  onWin?: (won: boolean) => void;
}

const ThreeCupGame: React.FC<ThreeCupGameProps> = ({ onWin }) => {
  const { soundEnabled } = useGameShellContext();
  const [ballPosition, setBallPosition] = useState<number>(1); // 0, 1, or 2 - actual ball position
  const [cupPositions, setCupPositions] = useState<number[]>([0, 1, 2]); // Visual order of cups
  const [selectedCup, setSelectedCup] = useState<number | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [hasGuessed, setHasGuessed] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [won, setWon] = useState(false);
  const [shuffleCount, setShuffleCount] = useState(0);
  const [showBallPlacement, setShowBallPlacement] = useState(false);
  const shuffleAnimationRef = useRef<number>();
  const shuffleSequenceRef = useRef<Array<{ from: number; to: number }>>([]);
  const shuffleAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef<boolean>(false);

  // Start shuffling after ball is placed
  const startShuffling = useCallback((ballPos: number) => {
    setIsShuffling(true);
    setSelectedCup(null);
    setHasGuessed(false);
    setShowResult(false);
    setShuffleCount(0);
    setCupPositions([0, 1, 2]); // Reset to original order
    setBallPosition(ballPos);

    // Start shuffle sound effect (only if sound is enabled)
    // Reset volume and ensure it's ready to play
    if (shuffleAudioRef.current && soundEnabled) {
      try {
        shuffleAudioRef.current.volume = 0.7; // Reset volume
        shuffleAudioRef.current.loop = true;
        shuffleAudioRef.current.currentTime = 0; // Reset to start
        
        // Play audio - should work since it's triggered by user interaction (Start button)
        const playPromise = shuffleAudioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise.catch((error: any) => {
            // If autoplay is still blocked, try to unlock on next interaction
            if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError') {
              console.warn('Audio autoplay prevented, will unlock on next interaction');
              audioUnlockedRef.current = false;
            } else {
              console.warn('Audio play error:', error);
            }
          });
        }
      } catch (error) {
        console.warn('Error setting up audio:', error);
      }
    }

    // Generate shuffle sequence - actual swaps
    // Calculate number of swaps needed for ~20 seconds total (slower speeds for easier tracking)
    // Start slow (1200ms), speed up to moderate (400ms), average ~500ms per swap
    // For 20 seconds: ~40 swaps
    const maxShuffles = 35 + Math.floor(Math.random() * 10); // 35-45 shuffles for ~20 seconds
    const sequence: Array<{ from: number; to: number }> = [];
    let currentPositions = [0, 1, 2];

    for (let i = 0; i < maxShuffles; i++) {
      // Pick two random positions to swap
      const pos1 = Math.floor(Math.random() * 3);
      let pos2 = Math.floor(Math.random() * 3);
      while (pos2 === pos1) {
        pos2 = Math.floor(Math.random() * 3);
      }
      
      // Swap positions
      [currentPositions[pos1], currentPositions[pos2]] = [currentPositions[pos2], currentPositions[pos1]];
      sequence.push({ from: pos1, to: pos2 });
    }

    shuffleSequenceRef.current = sequence;

    // Animate shuffling with position swaps - start slow, gradually speed up
    // Total duration should be ~20 seconds (slower speeds for easier tracking)
    const totalDuration = 20000; // 20 seconds in milliseconds
    const fadeOutStart = 0.75; // Start fading out at 75% of shuffle (last ~5 seconds)
    const audioStopAt = 0.95; // Stop audio completely at 95% to avoid reaching end
    
    const getSwapDelay = (swapIndex: number, totalSwaps: number) => {
      // Start slow (1200ms), gradually speed up to moderate (400ms)
      const progress = swapIndex / totalSwaps;
      const baseDelay = 1200 - (progress * 800); // 1200ms -> 400ms
      
      // Adjust to ensure total duration is approximately 20 seconds
      const averageDelay = totalDuration / totalSwaps;
      const adjustedDelay = Math.max(300, Math.min(1200, baseDelay * (averageDelay / 500)));
      
      return adjustedDelay;
    };

    const performSwap = (swapIndex: number) => {
      // Handle audio fade-out and stop before end (only if sound is enabled)
      if (shuffleAudioRef.current && soundEnabled) {
        const progress = swapIndex / sequence.length;
        
        if (progress >= audioStopAt) {
          // Stop audio completely before reaching the end
          shuffleAudioRef.current.pause();
          shuffleAudioRef.current.currentTime = 0;
        } else if (progress >= fadeOutStart) {
          // Fade out in the last 20% of shuffles (from 75% to 95%)
          const fadeProgress = (progress - fadeOutStart) / (audioStopAt - fadeOutStart);
          const targetVolume = 0.7 * (1 - fadeProgress); // Fade from 0.7 to 0
          shuffleAudioRef.current.volume = Math.max(0, targetVolume);
        }
      }
      
      if (swapIndex >= sequence.length) {
        setIsShuffling(false);
        // Stop shuffle sound effect
        if (shuffleAudioRef.current) {
          shuffleAudioRef.current.pause();
          shuffleAudioRef.current.currentTime = 0;
          shuffleAudioRef.current.volume = 0.7; // Reset volume for next game
        }
        return;
      }

      const swap = sequence[swapIndex];
      setCupPositions((prev) => {
        const newPos = [...prev];
        [newPos[swap.from], newPos[swap.to]] = [newPos[swap.to], newPos[swap.from]];
        return newPos;
      });
      setShuffleCount(swapIndex + 1);

      const delay = getSwapDelay(swapIndex, sequence.length);
      setTimeout(() => {
        performSwap(swapIndex + 1);
      }, delay);
    };

    performSwap(0);
  }, []);

  // Show ball placement animation first
  const showPlacementAnimation = useCallback((targetCup: number) => {
    setShowBallPlacement(true);
    setBallPosition(targetCup);
    // After animation, give ball a second to sit in cup before starting shuffling
    setTimeout(() => {
      setShowBallPlacement(false);
      startShuffling(targetCup);
    }, 2100); // 1.1 seconds for drop animation + 1 second to sit in cup
  }, [startShuffling]);

  // Shuffle animation with actual position swapping
  const shuffleCups = useCallback(() => {
    if (isShuffling || showBallPlacement || hasGuessed) return;
    
    // Randomize ball position
    const newPosition = Math.floor(Math.random() * 3);
    // Show placement animation first
    showPlacementAnimation(newPosition);
  }, [isShuffling, showBallPlacement, hasGuessed, showPlacementAnimation]);

  // Handle cup selection - need to check visual position vs actual ball position
  const handleCupClick = useCallback((visualIndex: number) => {
    if (isShuffling || hasGuessed || showBallPlacement) return;

    // Find which actual cup is at this visual position
    const actualCupIndex = cupPositions[visualIndex];
    
    setSelectedCup(visualIndex);
    setHasGuessed(true);
    
    // Check if the cup at this visual position has the ball
    const correct = actualCupIndex === ballPosition;
    setWon(correct);
    setShowResult(true);
    onWin?.(correct);
  }, [isShuffling, hasGuessed, cupPositions, ballPosition, onWin]);

  // Reset game
  const resetGame = useCallback(() => {
    setSelectedCup(null);
    setHasGuessed(false);
    setShowResult(false);
    setWon(false);
    setShuffleCount(0);
    setIsShuffling(false);
    setShowBallPlacement(false);
    setCupPositions([0, 1, 2]);
    
    // Stop shuffle sound effect
    if (shuffleAudioRef.current) {
      shuffleAudioRef.current.pause();
      shuffleAudioRef.current.currentTime = 0;
    }
    
    if (shuffleAnimationRef.current) {
      cancelAnimationFrame(shuffleAnimationRef.current);
    }
    // Start new game with placement animation
    setTimeout(() => shuffleCups(), 300);
  }, [shuffleCups]);

  // Lifecycle integration
  const lifecycle = useGameLifecycle({
    onReset: resetGame,
    onStart: () => {
      if (!hasGuessed && !isShuffling && !showBallPlacement) {
        shuffleCups();
      }
    },
    onPause: () => {
      // Stop shuffle sound effect when paused
      if (shuffleAudioRef.current) {
        shuffleAudioRef.current.pause();
        shuffleAudioRef.current.currentTime = 0;
      }
      if (shuffleAnimationRef.current) {
        cancelAnimationFrame(shuffleAnimationRef.current);
      }
      setIsShuffling(false);
    },
    onResume: () => {
      // Resume shuffling if it was in progress
      if (!hasGuessed && !showBallPlacement) {
        shuffleCups();
      }
    },
  });

  // Initialize audio on mount
  useEffect(() => {
    // Create and preload audio element
    // Using habibi.mov file (HTMLAudioElement can play audio from video files)
    const audio = new Audio('/habibi.mov');
    audio.preload = 'auto';
    audio.volume = 0.7; // Set reasonable volume
    
    shuffleAudioRef.current = audio;

    // Handle audio loading errors
    audio.addEventListener('error', (e) => {
      console.warn('Audio loading error:', e);
    });

    // Unlock audio on first user interaction (for desktop browsers)
    const unlockAudio = async () => {
      if (!audioUnlockedRef.current && shuffleAudioRef.current) {
        try {
          // Try to play and immediately pause to unlock audio context
          await shuffleAudioRef.current.play();
          shuffleAudioRef.current.pause();
          shuffleAudioRef.current.currentTime = 0;
          audioUnlockedRef.current = true;
        } catch (error) {
          // Silent fail - will try again on next interaction
        }
      }
      // Remove listeners after first unlock attempt
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };

    // Listen for user interaction to unlock audio
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });

    // Pause audio when page becomes hidden (user switches tabs, navigates away, etc.)
    const handleVisibilityChange = () => {
      if (document.hidden && shuffleAudioRef.current) {
        shuffleAudioRef.current.pause();
      }
    };

    // Pause audio when page is about to unload
    const handleBeforeUnload = () => {
      if (shuffleAudioRef.current) {
        shuffleAudioRef.current.pause();
        shuffleAudioRef.current.currentTime = 0;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (shuffleAudioRef.current) {
        shuffleAudioRef.current.pause();
        shuffleAudioRef.current.currentTime = 0;
        shuffleAudioRef.current.src = '';
        shuffleAudioRef.current = null;
      }
    };
  }, []);

  // Auto-shuffle on mount
  useEffect(() => {
    shuffleCups();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (shuffleAnimationRef.current) {
        cancelAnimationFrame(shuffleAnimationRef.current);
      }
    };
  }, []);

  return (
    <GameLifecycleWrapper lifecycle={lifecycle}>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(16px, 3vw, 32px)',
          gap: 'clamp(16px, 3vw, 32px)',
          backgroundColor: '#ffffff',
          minHeight: '100%',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* Instructions */}
        {!hasGuessed && !isShuffling && !showBallPlacement && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              fontFamily: wingShackTheme.typography.fontFamily.body,
              fontSize: 'clamp(14px, 3vw, 18px)',
              color: wingShackTheme.colors.text,
              textAlign: 'center',
              margin: 0,
              fontWeight: wingShackTheme.typography.fontWeight.medium,
            }}
          >
            Watch carefully as the cups shuffle! Can you find the ball?
          </motion.p>
        )}

        {showBallPlacement && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              fontFamily: wingShackTheme.typography.fontFamily.body,
              fontSize: 'clamp(16px, 3.5vw, 20px)',
              color: wingShackTheme.colors.primary,
              textAlign: 'center',
              margin: 0,
              fontWeight: wingShackTheme.typography.fontWeight.bold,
            }}
          >
            Placing the ball...
          </motion.p>
        )}

        {isShuffling && (
          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{
              fontFamily: wingShackTheme.typography.fontFamily.body,
              fontSize: 'clamp(16px, 3.5vw, 20px)',
              color: wingShackTheme.colors.primary,
              textAlign: 'center',
              margin: 0,
              fontWeight: wingShackTheme.typography.fontWeight.bold,
            }}
          >
            Shuffling...
          </motion.p>
        )}

        {/* Three Cups */}
        <div
          style={{
            display: 'flex',
            gap: 'clamp(16px, 4vw, 32px)',
            alignItems: 'flex-end',
            justifyContent: 'center',
            flexWrap: 'wrap',
            width: '100%',
            maxWidth: '600px',
            position: 'relative',
            minHeight: 'clamp(120px, 22vw, 185px)', // Cup height + label space
          }}
        >
          {/* Simple smooth ball drop from mascot to cup */}
          <AnimatePresence>
            {showBallPlacement && (
              <motion.div
                key="ball-placement"
                initial={{ 
                  y: -80, // Start from above cups
                  scale: 0.8,
                  opacity: 0,
                }}
                animate={{ 
                  y: 65, // Drop to final position inside cup
                  scale: 0.85, // Match result ball size
                  opacity: 1,
                }}
                exit={{ 
                  opacity: 0,
                }}
                transition={{ 
                  duration: 1,
                  ease: [0.25, 0.46, 0.45, 0.94], // Smooth ease-in-out
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: `translateX(calc(-50% + ${(ballPosition - 1) * 172}px))`,
                  width: 'clamp(35px, 7vw, 50px)',
                  height: 'clamp(35px, 7vw, 50px)',
                  borderRadius: '50%',
                  backgroundColor: wingShackTheme.colors.secondary,
                  boxShadow: `0 4px 12px rgba(0, 0, 0, 0.2)`,
                  border: `3px solid ${wingShackTheme.colors.secondaryLight}`,
                  zIndex: 100,
                  pointerEvents: 'none',
                }}
              />
            )}
          </AnimatePresence>

          {cupPositions.map((actualCupIndex, visualIndex) => (
            <motion.div
              key={`cup-${actualCupIndex}`}
              layout
              initial={false}
              animate={{
                y: isShuffling
                  ? [0, -30, 0, -25, 0]
                  : selectedCup === visualIndex
                  ? [0, -10, 0]
                  : 0,
                scale: selectedCup === visualIndex ? 1.05 : 1,
              }}
              transition={{
                layout: { 
                  duration: 0.4, 
                  ease: [0.4, 0, 0.2, 1],
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                },
                y: { 
                  duration: isShuffling ? 0.25 : 0.2, 
                  repeat: isShuffling ? Infinity : 0,
                  ease: 'easeInOut',
                },
                scale: { duration: 0.2 },
              }}
              onClick={() => handleCupClick(visualIndex)}
              style={{
                cursor: isShuffling || hasGuessed || showBallPlacement ? 'not-allowed' : 'pointer',
                opacity: isShuffling || hasGuessed || showBallPlacement ? (selectedCup === visualIndex ? 1 : 0.7) : 1,
                transition: 'opacity 0.3s ease',
                position: 'relative',
              }}
            >
              {/* Cup */}
              <div
                style={{
                  width: 'clamp(80px, 15vw, 140px)',
                  height: 'clamp(100px, 18vw, 160px)',
                  backgroundColor: wingShackTheme.colors.primary,
                  borderRadius: '0 0 20px 20px',
                  position: 'relative',
                  boxShadow: selectedCup === visualIndex
                    ? `0 10px 30px ${wingShackTheme.colors.primary}60`
                    : `0 5px 15px rgba(0, 0, 0, 0.2)`,
                  border: `3px solid ${selectedCup === visualIndex ? wingShackTheme.colors.secondary : wingShackTheme.colors.primaryDark}`,
                  overflow: 'hidden',
                }}
              >
                {/* Cup rim */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '20%',
                    backgroundColor: wingShackTheme.colors.primaryDark,
                    borderRadius: '50% 50% 0 0',
                  }}
                />

                {/* Ball - show when result is displayed and this cup has the ball */}
                <AnimatePresence>
                  {showResult && actualCupIndex === ballPosition && (
                    <motion.div
                      initial={{ scale: 0, y: 50 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      style={{
                        position: 'absolute',
                        bottom: 'clamp(15px, 2.5vw, 25px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 'clamp(35px, 7vw, 50px)',
                        height: 'clamp(35px, 7vw, 50px)',
                        borderRadius: '50%',
                        backgroundColor: wingShackTheme.colors.secondary,
                        boxShadow: `0 6px 20px ${wingShackTheme.colors.secondary}90, 0 0 30px ${wingShackTheme.colors.secondary}70`,
                        border: `4px solid ${wingShackTheme.colors.secondaryLight}`,
                        zIndex: 10,
                      }}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Cup number label */}
              <div
                style={{
                  textAlign: 'center',
                  marginTop: '8px',
                  fontFamily: wingShackTheme.typography.fontFamily.display,
                  fontSize: 'clamp(18px, 3.5vw, 24px)',
                  fontWeight: wingShackTheme.typography.fontWeight.bold,
                  color: wingShackTheme.colors.text,
                }}
              >
                {visualIndex + 1}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Result Display */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              style={{
                padding: 'clamp(20px, 4vw, 32px) clamp(32px, 6vw, 48px)',
                backgroundColor: won ? wingShackTheme.colors.secondary : wingShackTheme.colors.error,
                borderRadius: wingShackTheme.borderRadius.xl,
                textAlign: 'center',
                boxShadow: `0 12px 40px ${won ? wingShackTheme.colors.secondary : wingShackTheme.colors.error}60`,
                border: `3px solid ${wingShackTheme.colors.primary}`,
                maxWidth: 'min(400px, 90vw)',
                width: '100%',
              }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: won ? 2 : 0 }}
                style={{ fontSize: 'clamp(40px, 8vw, 64px)', marginBottom: '12px' }}
              >
                {won ? '🎉' : '😔'}
              </motion.div>
              <h2
                style={{
                  margin: 0,
                  color: '#000',
                  fontSize: 'clamp(20px, 4vw, 28px)',
                  marginBottom: '8px',
                  fontFamily: wingShackTheme.typography.fontFamily.display,
                  letterSpacing: '2px',
                }}
              >
                {won ? 'YOU WON!' : 'TRY AGAIN!'}
              </h2>
              <p
                style={{
                  margin: 0,
                  color: '#000',
                  fontSize: 'clamp(14px, 3vw, 18px)',
                  fontFamily: wingShackTheme.typography.fontFamily.body,
                  whiteSpace: 'pre-line',
                }}
              >
                {won
                  ? "You found the ball!\nYou're in the top 6% of players with natural instinct."
                  : "That round was brutal. Try again. Very few get it first time..."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Play Again Button */}
        {hasGuessed && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetGame}
            style={{
              padding: 'clamp(12px, 2.5vw, 16px) clamp(32px, 6vw, 48px)',
              backgroundColor: wingShackTheme.colors.primary,
              color: '#ffffff',
              border: 'none',
              borderRadius: wingShackTheme.borderRadius.lg,
              fontFamily: wingShackTheme.typography.fontFamily.display,
              fontSize: 'clamp(16px, 3.5vw, 20px)',
              fontWeight: wingShackTheme.typography.fontWeight.bold,
              letterSpacing: '2px',
              cursor: 'pointer',
              boxShadow: `0 8px 24px ${wingShackTheme.colors.primary}50`,
              transition: 'all 0.3s ease',
            }}
          >
            PLAY AGAIN
          </motion.button>
        )}
      </div>
    </GameLifecycleWrapper>
  );
};

export default ThreeCupGame;

