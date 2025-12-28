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

// Physics constants (frame-rate independent, in px/s and px/s^2)
const GRAVITY = 2000; // px/s^2 - increased for stronger gravity requiring active tapping
const FLAP_VELOCITY = -320; // px/s (negative = upward) - weaker flap for micro-tap control
const MAX_FALL_SPEED = 1000; // px/s (positive = downward)
const MAX_RISE_SPEED = -520; // px/s (negative = upward) - reduced to prevent rocket jumps

// Game constants
const PIPE_SPEED = 150; // px/s
const PIPE_SPAWN_INTERVAL = 1600; // ms
const PIPE_GAP = 200; // pixels - increased to accommodate larger bird (was 140)
const PIPE_WIDTH = 60;
const BIRD_SIZE = 72; // Doubled from 36 for better visibility
const BIRD_START_X = 100;
const BIRD_HITBOX_RADIUS = BIRD_SIZE * 0.30; // Smaller hitbox for fairer collisions (30% of sprite size - reduced from 45%)
const SHOW_COLLISION_DEBUG = false; // Set to true to visualize collision boxes

// Assist curve constants (early game only)
const ASSIST_SCORE_THRESHOLD = 10;
const ASSIST_GRAVITY_MIN = 0.85; // Minimum gravity multiplier (more assist)
const ASSIST_GRAVITY_MAX = 1.0; // Maximum gravity multiplier (no assist)
const ANTI_PLUMMET_THRESHOLD = 0.67; // Bottom third of screen (2/3 from top)
const ANTI_PLUMMET_GRAVITY_REDUCTION = 0.12; // 12% gravity reduction when plummeting

const FlappyWing: React.FC<FlappyWingProps> = ({ onScore, onGameOver }) => {
  const { soundEnabled } = useGameShellContext();
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [screenShake, setScreenShake] = useState(0);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState({ 
    y: 0, 
    velY: 0, 
    gravity: GRAVITY,
    effectiveGravity: GRAVITY,
    flapVelocity: FLAP_VELOCITY,
    characterSize: BIRD_SIZE 
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const birdImageRef = useRef<HTMLImageElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef<boolean>(false);

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

  // Load bird image
  useEffect(() => {
    const img = new Image();
    img.src = '/wingston2.png';
    img.onload = () => {
      birdImageRef.current = img;
      drawCanvas(); // Redraw when image loads
    };
    img.onerror = () => {
      console.warn('Failed to load bird image');
    };
  }, []);

  // Initialize audio context and unlock on user interaction
  useEffect(() => {
    // Create audio context
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
      }
    } catch (error) {
      console.warn('AudioContext not supported:', error);
    }

    // Unlock audio on first user interaction
    const unlockAudio = async () => {
      if (!audioUnlockedRef.current && audioContextRef.current) {
        try {
          // Resume audio context (required for mobile browsers)
          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
          }
          // Play a silent sound to unlock
          const oscillator = audioContextRef.current.createOscillator();
          const gainNode = audioContextRef.current.createGain();
          gainNode.gain.value = 0;
          oscillator.connect(gainNode);
          gainNode.connect(audioContextRef.current.destination);
          oscillator.start();
          oscillator.stop(audioContextRef.current.currentTime + 0.001);
          audioUnlockedRef.current = true;
        } catch (error) {
          // Silent fail
        }
      }
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };

    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {
          // Ignore errors on close
        });
      }
    };
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
      // SET velocity on flap (do not add)
      birdVelocityRef.current = FLAP_VELOCITY;
      playFlapSound();
    }
  }, [gameState, resetGame]);

  // Play flap sound
  const playFlapSound = useCallback(async () => {
    if (!soundEnabled) return;
    
    try {
      // Ensure we have an audio context
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
        } else {
          return;
        }
      }

      const audioContext = audioContextRef.current;

      // Resume audio context if suspended (required for mobile browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
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
  const playCollisionSound = useCallback(async () => {
    if (!soundEnabled) return;
    
    try {
      // Ensure we have an audio context
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
        } else {
          return;
        }
      }

      const audioContext = audioContextRef.current;

      // Resume audio context if suspended (required for mobile browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
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
    const minTopHeight = 100; // Increased minimum to ensure fair gaps
    const maxTopHeight = gameHeightRef.current - PIPE_GAP - 100; // Increased margin
    const topHeight = Math.random() * (maxTopHeight - minTopHeight) + minTopHeight;
    
    return {
      x: gameWidthRef.current,
      topHeight,
      bottomY: topHeight + PIPE_GAP,
      gap: PIPE_GAP,
      passed: false,
    };
  }, []);

  // Check collision using circle hitbox for bird
  const checkCollision = useCallback((birdX: number, birdY: number): boolean => {
    // Ground/ceiling collision (using hitbox radius)
    // Ground is at gameHeightRef.current - 40 (ground height), ceiling is at 0
    const groundLevel = gameHeightRef.current - 40;
    if (birdY - BIRD_HITBOX_RADIUS <= 0 || birdY + BIRD_HITBOX_RADIUS >= groundLevel) {
      return true;
    }

    // Pipe collision - use circle-rectangle collision for fairer detection
    for (const pipe of pipesRef.current) {
      // Check if bird circle overlaps with pipe rectangle
      const pipeLeft = pipe.x;
      const pipeRight = pipe.x + PIPE_WIDTH;
      const pipeTopBottom = pipe.topHeight;
      const pipeBottomTop = pipe.bottomY;

      // Check if bird is horizontally overlapping with pipe
      const horizontalOverlap = birdX + BIRD_HITBOX_RADIUS > pipeLeft && birdX - BIRD_HITBOX_RADIUS < pipeRight;
      
      if (horizontalOverlap) {
        // Bird is horizontally aligned with pipe, check vertical collision
        // Top pipe: bird hits if it's above the gap
        if (birdY - BIRD_HITBOX_RADIUS < pipeTopBottom) {
          return true;
        }
        // Bottom pipe: bird hits if it's below the gap
        if (birdY + BIRD_HITBOX_RADIUS > pipeBottomTop) {
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

    // Calculate delta time in SECONDS
    let dt = (timestamp - lastFrameTimeRef.current) / 1000;
    lastFrameTimeRef.current = timestamp;

    // Clamp dt to avoid lag spikes (max 30fps equivalent)
    dt = Math.min(dt, 0.033);

    // Calculate effective gravity with assist curves (early game only)
    let effectiveGravity = GRAVITY;
    
    // Assist curve 1: Dynamic gravity scaling for first 10 points
    if (score < ASSIST_SCORE_THRESHOLD) {
      const assistProgress = score / ASSIST_SCORE_THRESHOLD; // 0.0 to 1.0
      const gravityMultiplier = ASSIST_GRAVITY_MIN + (ASSIST_GRAVITY_MAX - ASSIST_GRAVITY_MIN) * assistProgress;
      effectiveGravity = GRAVITY * gravityMultiplier;
    }
    
    // Assist curve 2: Anti-plummet protection (subtle, near bottom of screen)
    const screenBottomThird = gameHeightRef.current * ANTI_PLUMMET_THRESHOLD;
    const isFallingFast = birdVelocityRef.current > 0;
    const isNearBottom = birdYRef.current > screenBottomThird;
    
    if (isFallingFast && isNearBottom) {
      // Slightly reduce gravity when plummeting near bottom (subtle assist)
      effectiveGravity *= (1 - ANTI_PLUMMET_GRAVITY_REDUCTION);
    }

    // Update bird physics (frame-rate independent)
    // Apply gravity: velY += effectiveGravity * dt
    birdVelocityRef.current += effectiveGravity * dt;
    
    // Clamp velocity
    birdVelocityRef.current = Math.max(MAX_RISE_SPEED, Math.min(MAX_FALL_SPEED, birdVelocityRef.current));
    
    // Update position: y += velY * dt
    birdYRef.current += birdVelocityRef.current * dt;

    // Calculate effective gravity for debug display (reuse same logic)
    let effectiveGravityForDebug = effectiveGravity;

    // Update debug info (only if debug is enabled to avoid unnecessary state updates)
    if (showDebug) {
      setDebugInfo({
        y: Math.round(birdYRef.current),
        velY: Math.round(birdVelocityRef.current),
        gravity: GRAVITY,
        effectiveGravity: Math.round(effectiveGravityForDebug),
        flapVelocity: FLAP_VELOCITY,
        characterSize: BIRD_SIZE,
      });
    }

    // Update bird rotation based on velocity (visual feedback)
    // Map velocity range to rotation range (-30 to 30 degrees)
    const velocityRatio = birdVelocityRef.current / MAX_FALL_SPEED;
    birdRotationRef.current = Math.max(-30, Math.min(30, velocityRatio * 30));

    // Spawn pipes
    if (timestamp - lastPipeSpawnRef.current > PIPE_SPAWN_INTERVAL) {
      pipesRef.current.push(generatePipe());
      lastPipeSpawnRef.current = timestamp;
    }

    // Update pipes (frame-rate independent)
    pipesRef.current = pipesRef.current.map((pipe) => ({
      ...pipe,
      x: pipe.x - PIPE_SPEED * dt,
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

      // Debug: Draw collision boxes
      if (SHOW_COLLISION_DEBUG) {
        ctx.strokeStyle = '#FF0000'; // Red for collision boxes
        ctx.lineWidth = 2;
        // Top pipe collision box
        ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
        // Bottom pipe collision box
        ctx.strokeRect(pipe.x, pipe.bottomY, PIPE_WIDTH, displayHeight - pipe.bottomY);
        ctx.strokeStyle = '#006400'; // Reset to dark green
        ctx.lineWidth = 3;
      }
    });

    // Draw bird
    ctx.save();
    ctx.translate(BIRD_START_X, birdYRef.current);
    ctx.rotate((birdRotationRef.current * Math.PI) / 180);

    if (birdImageRef.current) {
      // Draw bird image
      const img = birdImageRef.current;
      const size = BIRD_SIZE;
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
    } else {
      // Fallback: draw circle while image loads
      ctx.fillStyle = '#FFD700'; // Gold
      ctx.strokeStyle = '#FFA500'; // Orange
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Debug: Draw bird hitbox
    if (SHOW_COLLISION_DEBUG) {
      ctx.strokeStyle = '#00FF00'; // Green for bird hitbox
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_HITBOX_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
    }

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
      // Toggle debug with 'D' key
      if (e.key === 'd' || e.key === 'D') {
        setShowDebug((prev) => !prev);
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
              display: 'flex',
              flexDirection: 'column',
              gap: 'clamp(4px, 1vw, 8px)',
              alignItems: 'center',
            }}
          >
            <div
              style={{
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
            {/* Debug Display */}
            {showDebug && (
              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  color: '#ffffff',
                  padding: 'clamp(6px, 1.2vw, 10px) clamp(10px, 1.5vw, 14px)',
                  borderRadius: wingShackTheme.borderRadius.md,
                  fontFamily: 'monospace',
                  fontSize: 'clamp(10px, 1.5vw, 12px)',
                  lineHeight: 1.4,
                  maxWidth: '200px',
                }}
              >
                <div>y: {debugInfo.y}</div>
                <div>velY: {debugInfo.velY} px/s</div>
                <div>gravity: {GRAVITY} px/s²</div>
                <div>flapVel: {FLAP_VELOCITY} px/s</div>
                <div>gap: {PIPE_GAP}px</div>
              </div>
            )}
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
                marginBottom: 'clamp(8px, 1.5vw, 16px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src="/wingston2.png"
                alt="Flappy Wing"
                style={{
                  width: 'clamp(64px, 10vw, 96px)',
                  height: 'clamp(64px, 10vw, 96px)',
                  objectFit: 'contain',
                }}
              />
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

