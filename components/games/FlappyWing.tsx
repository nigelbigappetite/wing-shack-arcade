'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameLifecycle } from '@/hooks/useGameLifecycle';
import GameLifecycleWrapper from '@/components/GameLifecycleWrapper';
import { wingShackTheme } from '@/theme/wingShackTheme';
import { useGameShellContext } from '@/components/GameShell';

interface FlappyWingProps {
  onScore?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}

type GameState = 'idle' | 'running' | 'gameOver';

interface Pipe {
  x: number;
  topHeight: number;
  bottomY: number;
  gap: number;
  passed: boolean;
}

const GRAVITY = 0.4;
const FLAP_IMPULSE = -7;
const MAX_VELOCITY = 9;
const PIPE_SPEED = 2.5;
const PIPE_SPAWN_INTERVAL = 1600; // ms
const PIPE_GAP = 140; // pixels
const PIPE_WIDTH = 60;
const BIRD_SIZE = 30;
const BIRD_START_X = 100;

const FlappyWing: React.FC<FlappyWingProps> = ({ onScore, onGameOver }) => {
  const { soundEnabled } = useGameShellContext();
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [screenShake, setScreenShake] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Bird state
  const birdYRef = useRef<number>(300); // Will be set properly when canvas is drawn
  const birdVelocityRef = useRef<number>(0);
  const birdRotationRef = useRef<number>(0);

  // Pipes
  const pipesRef = useRef<Pipe[]>([]);
  const lastPipeSpawnRef = useRef<number>(0);

  // Game dimensions
  const gameWidthRef = useRef<number>(400);
  const gameHeightRef = useRef<number>(600);

  // Initialize best score from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('flappy-wing-best-score');
    if (saved) {
      setBestScore(parseInt(saved, 10));
    }
  }, []);

  // Reset game state
  const resetGame = useCallback(() => {
    // Reset bird to center of game area (will be set properly when canvas is drawn)
    birdYRef.current = gameHeightRef.current / 2 || 300;
    birdVelocityRef.current = 0;
    birdRotationRef.current = 0;
    pipesRef.current = [];
    lastPipeSpawnRef.current = 0;
    setScore(0);
    setScreenShake(0);
  }, []);

  // Flap function
  const flap = useCallback(() => {
    if (gameState === 'idle') {
      setGameState('running');
      resetGame();
      lastFrameTimeRef.current = performance.now();
      return;
    }

    if (gameState === 'running') {
      birdVelocityRef.current = FLAP_IMPULSE;
      playFlapSound();
    }
  }, [gameState, resetGame]);

  // Play flap sound
  const playFlapSound = useCallback(() => {
    if (!soundEnabled) return;
    
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.warn('Failed to play flap sound:', error);
    }
  }, [soundEnabled]);

  // Play collision sound
  const playCollisionSound = useCallback(() => {
    if (!soundEnabled) return;
    
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.warn('Failed to play collision sound:', error);
    }
  }, [soundEnabled]);

  // Generate new pipe
  const generatePipe = useCallback((): Pipe => {
    const minTopHeight = 80;
    const maxTopHeight = gameHeightRef.current - PIPE_GAP - 80;
    const topHeight = Math.random() * (maxTopHeight - minTopHeight) + minTopHeight;
    
    return {
      x: gameWidthRef.current,
      topHeight,
      bottomY: topHeight + PIPE_GAP,
      gap: PIPE_GAP,
      passed: false,
    };
  }, []);

  // Check collision
  const checkCollision = useCallback((birdX: number, birdY: number): boolean => {
    // Ground/ceiling collision
    if (birdY - BIRD_SIZE / 2 <= 0 || birdY + BIRD_SIZE / 2 >= gameHeightRef.current) {
      return true;
    }

    // Pipe collision
    for (const pipe of pipesRef.current) {
      if (
        birdX + BIRD_SIZE / 2 > pipe.x &&
        birdX - BIRD_SIZE / 2 < pipe.x + PIPE_WIDTH
      ) {
        if (birdY - BIRD_SIZE / 2 < pipe.topHeight || birdY + BIRD_SIZE / 2 > pipe.bottomY) {
          return true;
        }
      }
    }

    return false;
  }, []);

  // Game loop
  const gameLoop = useCallback((timestamp: number) => {
    if (gameState !== 'running') {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const deltaTime = Math.min(timestamp - lastFrameTimeRef.current, 50); // Cap delta to prevent large jumps
    lastFrameTimeRef.current = timestamp;

    // Normalize to 60fps for consistent gameplay
    const normalizedDelta = deltaTime / 16.67;

    // Update bird physics
    birdVelocityRef.current += GRAVITY * normalizedDelta;
    birdVelocityRef.current = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, birdVelocityRef.current));
    birdYRef.current += birdVelocityRef.current * normalizedDelta;

    // Update bird rotation based on velocity
    birdRotationRef.current = Math.max(-30, Math.min(30, birdVelocityRef.current * 3));

    // Spawn pipes
    if (timestamp - lastPipeSpawnRef.current > PIPE_SPAWN_INTERVAL) {
      pipesRef.current.push(generatePipe());
      lastPipeSpawnRef.current = timestamp;
    }

    // Update pipes
    pipesRef.current = pipesRef.current.map((pipe) => ({
      ...pipe,
      x: pipe.x - PIPE_SPEED * normalizedDelta,
    }));

    // Remove off-screen pipes
    pipesRef.current = pipesRef.current.filter((pipe) => pipe.x + PIPE_WIDTH > 0);

    // Check score (pipe passed)
    pipesRef.current.forEach((pipe) => {
      if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_START_X - BIRD_SIZE / 2) {
        pipe.passed = true;
        const newScore = score + 1;
        setScore(newScore);
        onScore?.(newScore);
      }
    });

    // Check collision
    if (checkCollision(BIRD_START_X, birdYRef.current)) {
      playCollisionSound();
      setScreenShake(10);
      setTimeout(() => setScreenShake(0), 200);
      
      const finalScore = score;
      setGameState('gameOver');
      
      // Update best score
      if (finalScore > bestScore) {
        setBestScore(finalScore);
        localStorage.setItem('flappy-wing-best-score', finalScore.toString());
      }
      
      onGameOver?.(finalScore);
      return;
    }

    // Draw
    drawCanvas();

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, score, bestScore, checkCollision, generatePipe, onScore, onGameOver, playCollisionSound]);

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = rect.width;
    const displayHeight = rect.height;

    // Set actual size in memory (scaled for DPR)
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;

    // Scale context to handle DPR
    ctx.scale(dpr, dpr);

    // Update game dimensions
    gameWidthRef.current = displayWidth;
    gameHeightRef.current = displayHeight;
    
    // Initialize bird position if not set
    if (birdYRef.current === 0 || birdYRef.current > displayHeight) {
      birdYRef.current = displayHeight / 2;
    }

    // Clear canvas
    ctx.fillStyle = '#87CEEB'; // Sky blue
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Draw ground
    ctx.fillStyle = '#8B4513'; // Brown
    ctx.fillRect(0, displayHeight - 40, displayWidth, 40);
    ctx.fillStyle = '#90EE90'; // Light green
    ctx.fillRect(0, displayHeight - 40, displayWidth, 10);

    // Draw pipes
    ctx.fillStyle = '#228B22'; // Forest green
    ctx.strokeStyle = '#006400'; // Dark green
    ctx.lineWidth = 3;

    pipesRef.current.forEach((pipe) => {
      // Top pipe
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);

      // Bottom pipe
      ctx.fillRect(pipe.x, pipe.bottomY, PIPE_WIDTH, displayHeight - pipe.bottomY);
      ctx.strokeRect(pipe.x, pipe.bottomY, PIPE_WIDTH, displayHeight - pipe.bottomY);
    });

    // Draw bird
    ctx.save();
    ctx.translate(BIRD_START_X, birdYRef.current);
    ctx.rotate((birdRotationRef.current * Math.PI) / 180);

    // Bird body (circle)
    ctx.fillStyle = '#FFD700'; // Gold
    ctx.strokeStyle = '#FFA500'; // Orange
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Bird emoji overlay (optional, for better visibility)
    ctx.font = `${BIRD_SIZE * 0.8}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🍗', 0, 0);

    ctx.restore();
  }, []);

  // Start game loop when running
  useEffect(() => {
    if (gameState === 'running') {
      lastFrameTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [gameState, gameLoop]);

  // Redraw on state changes
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas, gameState]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      drawCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawCanvas]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        flap();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [flap]);

  // Start game
  const startGame = useCallback(() => {
    resetGame();
    setGameState('running');
    lastFrameTimeRef.current = performance.now();
  }, [resetGame]);

  // Pause game
  const pauseGame = useCallback(() => {
    if (gameState === 'running') {
      setGameState('idle');
    }
  }, [gameState]);

  // Resume game
  const resumeGame = useCallback(() => {
    if (gameState === 'idle') {
      setGameState('running');
    }
  }, [gameState]);

  // Reset game
  const resetGameState = useCallback(() => {
    setGameState('idle');
    resetGame();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [resetGame]);

  // Game lifecycle integration
  const lifecycle = useGameLifecycle({
    onStart: startGame,
    onPause: pauseGame,
    onResume: resumeGame,
    onReset: resetGameState,
  });

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
          justifyContent: 'flex-start',
          padding: 'clamp(12px, 2vw, 20px)',
          backgroundColor: wingShackTheme.colors.backgroundCard,
          borderRadius: 0,
          gap: 'clamp(8px, 1.5vw, 12px)',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Score Display */}
        {gameState === 'running' && (
          <div
            style={{
              position: 'absolute',
              top: 'clamp(12px, 2vw, 20px)',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              padding: 'clamp(4px, 1vw, 8px) clamp(10px, 1.5vw, 14px)',
              borderRadius: wingShackTheme.borderRadius.md,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div
              style={{
                fontFamily: wingShackTheme.typography.fontFamily.display,
                fontSize: 'clamp(16px, 3vw, 24px)',
                fontWeight: wingShackTheme.typography.fontWeight.bold,
                color: wingShackTheme.colors.primary,
              }}
            >
              {score}
            </div>
          </div>
        )}

        {/* Canvas */}
        <div
          onClick={flap}
          onTouchStart={(e) => {
            e.preventDefault();
            flap();
          }}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 'clamp(320px, 90vw, 400px)',
            aspectRatio: '2/3',
            touchAction: 'none',
            flexShrink: 0,
            margin: '0 auto',
            cursor: 'pointer',
            transform: screenShake > 0 ? `translate(${Math.random() * screenShake - screenShake / 2}px, ${Math.random() * screenShake - screenShake / 2}px)` : 'none',
            transition: 'transform 0.1s',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              borderRadius: wingShackTheme.borderRadius.md,
              border: `2px solid ${wingShackTheme.colors.primary}20`,
            }}
          />
        </div>

        {/* Game Over Overlay */}
        <AnimatePresence>
          {gameState === 'gameOver' && (
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
                Game Over!
              </motion.div>

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                style={{
                  fontFamily: wingShackTheme.typography.fontFamily.display,
                  fontSize: 'clamp(24px, 4vw, 32px)',
                  fontWeight: wingShackTheme.typography.fontWeight.bold,
                  color: '#ffffff',
                  textAlign: 'center',
                }}
              >
                Score: {score}
              </motion.div>

              {bestScore > 0 && (
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
                  Best: {bestScore}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start Screen */}
        {gameState === 'idle' && (
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
              borderRadius: 0,
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
              FLAPPY WING
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
              Tap to start! Tap anywhere to flap.
            </div>
            {bestScore > 0 && (
              <div
                style={{
                  fontFamily: wingShackTheme.typography.fontFamily.body,
                  fontSize: 'clamp(14px, 2vw, 18px)',
                  color: wingShackTheme.colors.textSecondary,
                  textAlign: 'center',
                  marginTop: 'clamp(8px, 1.5vw, 16px)',
                }}
              >
                Best Score: {bestScore}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </GameLifecycleWrapper>
  );
};

export default FlappyWing;

