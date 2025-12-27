'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useGameLifecycle } from '@/hooks/useGameLifecycle';
import GameLifecycleWrapper from '@/components/GameLifecycleWrapper';
import { wingShackTheme } from '@/theme/wingShackTheme';

interface SauceSimonProps {
  onScore?: (score: number) => void;
}

// Sauce configuration
const SAUCES = [
  { id: 'jarvs-tangy-buffalo', label: "Jarv's Tangy Buffalo", image: '/jarvs-tangy-buffalo.png' },
  { id: 'flamin-hoisin', label: "Flamin' Hoisin", image: '/flamin-hoisin.png' },
  { id: 'honey-mustard', label: 'Honey Mustard', image: '/honey-mustard.png' },
  { id: 'mango-mazza', label: 'Mango Mazza', image: '/mango-mazza.png' },
];

const FLASH_DURATION = 500; // ms
const FLASH_GAP = 300; // ms between flashes

const SauceSimon: React.FC<SauceSimonProps> = ({ onScore }) => {
  const [sequence, setSequence] = useState<string[]>([]);
  const [userInput, setUserInput] = useState<string[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [activeTile, setActiveTile] = useState<string | null>(null);
  const [showRoundComplete, setShowRoundComplete] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [score, setScore] = useState(0);

  const playbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const roundCompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate random sauce ID
  const getRandomSauce = useCallback(() => {
    return SAUCES[Math.floor(Math.random() * SAUCES.length)].id;
  }, []);

  // Play the sequence
  const playSequence = useCallback((seq: string[]) => {
    setIsPlayingSequence(true);
    setIsWaitingForInput(false);
    setUserInput([]);

    let index = 0;
    const playNext = () => {
      if (index >= seq.length) {
        setIsPlayingSequence(false);
        setIsWaitingForInput(true);
        return;
      }

      setActiveTile(seq[index]);
      playbackTimeoutRef.current = setTimeout(() => {
        setActiveTile(null);
        index++;
        if (index < seq.length) {
          playbackTimeoutRef.current = setTimeout(playNext, FLASH_GAP);
        } else {
          setIsPlayingSequence(false);
          setIsWaitingForInput(true);
        }
      }, FLASH_DURATION);
    };

    // Start playback after a short delay
    playbackTimeoutRef.current = setTimeout(playNext, 500);
  }, []);

  // Start a new round
  const startRound = useCallback((roundNumber: number) => {
    setCurrentRound(roundNumber);
    setShowRoundComplete(false);
    setShowGameOver(false);
    
    setSequence((prev) => {
      const newSequence = [...prev, getRandomSauce()];
      // Play the sequence after state updates
      setTimeout(() => {
        playSequence(newSequence);
      }, 100);
      return newSequence;
    });
  }, [getRandomSauce, playSequence]);

  // Handle sauce tile tap
  const handleTileTap = useCallback((sauceId: string) => {
    if (!isWaitingForInput || isPlayingSequence) return;

    const expectedSauce = sequence[userInput.length];
    
    if (sauceId === expectedSauce) {
      // Correct tap
      setActiveTile(sauceId);
      setTimeout(() => setActiveTile(null), FLASH_DURATION);
      
      const newUserInput = [...userInput, sauceId];
      setUserInput(newUserInput);

      // Check if round is complete
      if (newUserInput.length === sequence.length) {
        // Round complete
        setScore(newUserInput.length);
        onScore?.(newUserInput.length);
        setShowRoundComplete(true);
        
        // Clear timeout if exists
        if (roundCompleteTimeoutRef.current) {
          clearTimeout(roundCompleteTimeoutRef.current);
        }
        
        // Start next round after delay
        roundCompleteTimeoutRef.current = setTimeout(() => {
          startRound(currentRound + 1);
        }, 900);
      }
    } else {
      // Wrong sauce
      setIsWaitingForInput(false);
      setShowGameOver(true);
      setActiveTile(null);
    }
  }, [isWaitingForInput, isPlayingSequence, sequence, userInput, currentRound, onScore, startRound]);

  // Start the game
  const startGame = useCallback(() => {
    setSequence([]);
    setUserInput([]);
    setCurrentRound(1);
    setScore(0);
    setShowRoundComplete(false);
    setShowGameOver(false);
    setIsPlayingSequence(false);
    setIsWaitingForInput(false);
    setActiveTile(null);
    
    // Clear any existing timeouts
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
    if (roundCompleteTimeoutRef.current) {
      clearTimeout(roundCompleteTimeoutRef.current);
      roundCompleteTimeoutRef.current = null;
    }
    
    startRound(1);
  }, [startRound]);

  // Pause the game
  const pauseGame = useCallback(() => {
    setIsWaitingForInput(false);
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
    if (roundCompleteTimeoutRef.current) {
      clearTimeout(roundCompleteTimeoutRef.current);
      roundCompleteTimeoutRef.current = null;
    }
  }, []);

  // Resume the game
  const resumeGame = useCallback(() => {
    // If we were waiting for input, resume
    if (userInput.length < sequence.length && sequence.length > 0) {
      setIsWaitingForInput(true);
    }
  }, [userInput.length, sequence.length]);

  // Reset the game
  const resetGame = useCallback(() => {
    setSequence([]);
    setUserInput([]);
    setCurrentRound(0);
    setScore(0);
    setShowRoundComplete(false);
    setShowGameOver(false);
    setIsPlayingSequence(false);
    setIsWaitingForInput(false);
    setActiveTile(null);
    
    // Clear all timeouts
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
    if (roundCompleteTimeoutRef.current) {
      clearTimeout(roundCompleteTimeoutRef.current);
      roundCompleteTimeoutRef.current = null;
    }
  }, []);

  // Game lifecycle integration
  const lifecycle = useGameLifecycle({
    onStart: startGame,
    onPause: pauseGame,
    onResume: resumeGame,
    onReset: resetGame,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playbackTimeoutRef.current) {
        clearTimeout(playbackTimeoutRef.current);
      }
      if (roundCompleteTimeoutRef.current) {
        clearTimeout(roundCompleteTimeoutRef.current);
      }
    };
  }, []);

  return (
    <GameLifecycleWrapper lifecycle={lifecycle}>
      <div
        style={{
          width: '100%',
          height: '100%',
          minHeight: 'clamp(400px, 60vh, 600px)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(16px, 3vw, 24px)',
          backgroundColor: wingShackTheme.colors.backgroundCard,
          borderRadius: wingShackTheme.borderRadius.lg,
        }}
      >
        {/* Game UI Overlay */}
        {currentRound > 0 && !showGameOver && (
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
            {/* Round Number */}
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
                Round {currentRound}
              </div>
            </div>

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
                  color: wingShackTheme.colors.secondary,
                }}
              >
                Score: {score}
              </div>
            </div>
          </div>
        )}

        {/* Sauce Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 'clamp(16px, 3vw, 24px)',
            width: '100%',
            maxWidth: 'clamp(300px, 50vw, 500px)',
            aspectRatio: '1',
            position: 'relative',
          }}
        >
          {SAUCES.map((sauce) => {
            const isActive = activeTile === sauce.id;
            const isDisabled = !isWaitingForInput || isPlayingSequence;

            return (
              <motion.button
                key={sauce.id}
                onClick={() => handleTileTap(sauce.id)}
                disabled={isDisabled}
                initial={false}
                animate={{
                  scale: isActive ? 1.1 : 1,
                  filter: isActive ? 'brightness(1.3)' : 'brightness(1)',
                }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  aspectRatio: '1',
                  borderRadius: wingShackTheme.borderRadius.lg,
                  border: `3px solid ${isActive ? wingShackTheme.colors.primary : 'transparent'}`,
                  backgroundColor: wingShackTheme.colors.backgroundCard,
                  boxShadow: isActive
                    ? `0 0 30px ${wingShackTheme.colors.primary}80, 0 8px 24px rgba(0, 0, 0, 0.3)`
                    : '0 4px 12px rgba(0, 0, 0, 0.15)',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled && !isActive ? 0.6 : 1,
                  overflow: 'hidden',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  outline: 'none',
                  padding: 'clamp(8px, 1.5vw, 12px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'clamp(4px, 0.8vw, 8px)',
                } as React.CSSProperties}
                whileHover={!isDisabled ? { scale: 1.05 } : {}}
                whileTap={!isDisabled ? { scale: 0.95 } : {}}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    flex: 1,
                  }}
                >
                  <Image
                    src={sauce.image}
                    alt={sauce.label}
                    fill
                    style={{ objectFit: 'contain' }}
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
                <div
                  style={{
                    fontFamily: wingShackTheme.typography.fontFamily.body,
                    fontSize: 'clamp(10px, 1.5vw, 14px)',
                    fontWeight: wingShackTheme.typography.fontWeight.medium,
                    color: wingShackTheme.colors.text,
                    textAlign: 'center',
                  }}
                >
                  {sauce.label}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Round Complete Overlay */}
        <AnimatePresence>
          {showRoundComplete && (
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
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 20,
              }}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                style={{
                  fontFamily: wingShackTheme.typography.fontFamily.display,
                  fontSize: 'clamp(32px, 5vw, 48px)',
                  fontWeight: wingShackTheme.typography.fontWeight.bold,
                  color: '#00ff00',
                  textAlign: 'center',
                }}
              >
                Round {currentRound} Complete!
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Over Overlay */}
        <AnimatePresence>
          {showGameOver && (
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
                style={{
                  fontFamily: wingShackTheme.typography.fontFamily.display,
                  fontSize: 'clamp(32px, 5vw, 48px)',
                  fontWeight: wingShackTheme.typography.fontWeight.bold,
                  color: wingShackTheme.colors.error,
                  textAlign: 'center',
                  marginBottom: 'clamp(8px, 1.5vw, 16px)',
                }}
              >
                Wrong sauce. Try again.
              </motion.div>

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                style={{
                  fontFamily: wingShackTheme.typography.fontFamily.body,
                  fontSize: 'clamp(18px, 3vw, 24px)',
                  color: '#ffffff',
                  textAlign: 'center',
                  opacity: 0.9,
                }}
              >
                You reached Round {currentRound}
              </motion.div>

              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                onClick={() => {
                  resetGame();
                  setShowGameOver(false);
                }}
                style={{
                  padding: 'clamp(12px, 2vw, 16px) clamp(32px, 5vw, 48px)',
                  backgroundColor: wingShackTheme.colors.primary,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: wingShackTheme.borderRadius.lg,
                  fontFamily: wingShackTheme.typography.fontFamily.display,
                  fontSize: 'clamp(18px, 3vw, 24px)',
                  fontWeight: wingShackTheme.typography.fontWeight.bold,
                  letterSpacing: '2px',
                  cursor: 'pointer',
                  boxShadow: `0 6px 20px ${wingShackTheme.colors.primary}80`,
                  transition: 'all 0.3s ease',
                  marginTop: 'clamp(16px, 3vw, 24px)',
                  opacity: 1,
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                TRY AGAIN
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start Screen */}
        {currentRound === 0 && !showGameOver && (
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
              SAUCE SIMON
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
              Press Start to begin!
            </div>
          </motion.div>
        )}
      </div>
    </GameLifecycleWrapper>
  );
};

export default SauceSimon;

