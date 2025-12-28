'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameLifecycle } from '@/hooks/useGameLifecycle';
import GameLifecycleWrapper from '@/components/GameLifecycleWrapper';
import { wingShackTheme } from '@/theme/wingShackTheme';
import { useGameShellContext } from '@/components/GameShell';

interface PongProps {
  onScore?: (playerScore: number, aiScore: number) => void;
  onGameOver?: (winner: 'player' | 'ai') => void;
}

type GameState = 'idle' | 'running' | 'roundReset' | 'gameOver';

// Game constants - Tune these for gameplay feel
const PADDLE_WIDTH = 12; // pixels
const PADDLE_HEIGHT = 80; // pixels - large enough for mobile
const BALL_SIZE = 10; // pixels
const BALL_SPEED_BASE = 200; // px/s - base ball speed
const BALL_SPEED_MAX = 400; // px/s - maximum ball speed
const BALL_SPEED_INCREASE = 15; // px/s increase per paddle hit
const PADDLE_SPEED = 300; // px/s - player paddle speed
const AI_PADDLE_SPEED = 250; // px/s - AI paddle max speed (slightly slower for fairness)
const AI_REACTION_DELAY = 150; // ms - AI reaction lag
const WIN_SCORE = 7; // First to 7 wins
const COURT_MARGIN = 20; // pixels - margin from edges
const COUNTDOWN_DURATION = 1000; // ms - 1 second per countdown number (5 seconds total: 5->4->3->2->1)
const TRACKPAD_BUTTON_SIZE = 64; // px - minimum 56px, prefer 64px
const TRACKPAD_BUTTON_SPACING = 16; // px - spacing between buttons
const TRACKPAD_TAP_NUDGE = 24; // px - distance paddle moves on tap

const Pong: React.FC<PongProps> = ({ onScore, onGameOver }) => {
  const { soundEnabled } = useGameShellContext();
  const [gameState, setGameState] = useState<GameState>('idle');
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [roundCountdown, setRoundCountdown] = useState<number | null>(null);
  const [controlMode, setControlMode] = useState<'touch' | 'trackpad'>('touch');
  const [trackpadUpPressed, setTrackpadUpPressed] = useState(false);
  const [trackpadDownPressed, setTrackpadDownPressed] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Game dimensions
  const gameWidthRef = useRef<number>(400);
  const gameHeightRef = useRef<number>(600);

  // Paddle positions (center Y)
  const playerPaddleYRef = useRef<number>(300);
  const aiPaddleYRef = useRef<number>(300);
  const aiTargetYRef = useRef<number>(300);
  const aiReactionTimerRef = useRef<number>(0);

  // Ball state
  const ballXRef = useRef<number>(400);
  const ballYRef = useRef<number>(300);
  const ballVelXRef = useRef<number>(BALL_SPEED_BASE);
  const ballVelYRef = useRef<number>(0);
  const ballSpeedRef = useRef<number>(BALL_SPEED_BASE);

  // Input state
  const targetYRef = useRef<number | null>(null); // Target Y for tap-to-position
  const trackpadUpPressedRef = useRef<boolean>(false);
  const trackpadDownPressedRef = useRef<boolean>(false);
  
  // Audio
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef<boolean>(false);
  const pointWinAudioRef = useRef<HTMLAudioElement | null>(null);
  const pointLossAudioRef = useRef<HTMLAudioElement | null>(null);

  // Unlock audio on first interaction
  const unlockAudio = useCallback(() => {
    if (audioUnlockedRef.current) return;
    
    try {
      // Create AudioContext
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      
      // Create audio elements
      pointWinAudioRef.current = new Audio('/small_crowd_applause-yannick_lemieux-1268806408.mp3');
      pointLossAudioRef.current = new Audio('/john fuming.mp3');
      
      // Preload
      pointWinAudioRef.current.load();
      pointLossAudioRef.current.load();
      
      audioUnlockedRef.current = true;
    } catch (error) {
      console.warn('Failed to initialize audio:', error);
    }
  }, []);

  // Play sound effect
  const playSound = useCallback((sound: 'win' | 'loss') => {
    if (!soundEnabled || !audioUnlockedRef.current) return;
    
    try {
      const audio = sound === 'win' ? pointWinAudioRef.current : pointLossAudioRef.current;
      if (audio) {
        audio.currentTime = 0; // Restart from beginning
        audio.play().catch((err) => {
          console.warn('Failed to play sound:', err);
        });
      }
    } catch (error) {
      console.warn('Error playing sound:', error);
    }
  }, [soundEnabled]);

  // Reset game
  const resetGame = useCallback(() => {
    playerPaddleYRef.current = gameHeightRef.current / 2;
    aiPaddleYRef.current = gameHeightRef.current / 2;
    aiTargetYRef.current = gameHeightRef.current / 2;
    aiReactionTimerRef.current = 0;
    targetYRef.current = null;
    trackpadUpPressedRef.current = false;
    trackpadDownPressedRef.current = false;
    setTrackpadUpPressed(false);
    setTrackpadDownPressed(false);
    setPlayerScore(0);
    setAiScore(0);
    ballSpeedRef.current = BALL_SPEED_BASE;
    resetBall();
  }, []);

  // Reset ball to center and serve
  const resetBall = useCallback(() => {
    ballXRef.current = gameWidthRef.current / 2;
    ballYRef.current = gameHeightRef.current / 2;
    // Serve towards player or AI randomly
    const serveDirection = Math.random() > 0.5 ? 1 : -1;
    ballVelXRef.current = BALL_SPEED_BASE * serveDirection;
    ballVelYRef.current = (Math.random() - 0.5) * 100; // Random Y velocity
  }, []);

  // Handle touch/mouse input (tap-to-position)
  const handleInput = useCallback((clientX: number, clientY: number) => {
    if (gameState !== 'running' || controlMode !== 'touch') return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const canvasY = clientY - rect.top;
    const canvasX = clientX - rect.left;
    
    // Only respond to input in left half of canvas
    if (canvasX < gameWidthRef.current / 2) {
      // Set target Y (paddle will smoothly move toward this)
      targetYRef.current = Math.max(
        PADDLE_HEIGHT / 2 + COURT_MARGIN,
        Math.min(
          gameHeightRef.current - PADDLE_HEIGHT / 2 - COURT_MARGIN,
          canvasY
        )
      );
    }
  }, [gameState, controlMode]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    unlockAudio(); // Unlock audio on first touch
    if (e.touches.length > 0 && controlMode === 'touch') {
      const touch = e.touches[0];
      handleInput(touch.clientX, touch.clientY);
    }
  }, [handleInput, controlMode, unlockAudio]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0 && controlMode === 'touch') {
      const touch = e.touches[0];
      handleInput(touch.clientX, touch.clientY);
    }
  }, [handleInput, controlMode]);

  const handleTouchEnd = useCallback(() => {
    // Keep targetY - don't clear it, so paddle continues moving to last position
    // This enables tap-to-position without holding
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    unlockAudio(); // Unlock audio on first click
    if (controlMode === 'touch') {
      handleInput(e.clientX, e.clientY);
    }
  }, [handleInput, controlMode, unlockAudio]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (e.buttons > 0 && controlMode === 'touch') {
      handleInput(e.clientX, e.clientY);
    }
  }, [handleInput, controlMode]);

  // Trackpad controls
  const handleTrackpadUp = useCallback((isPressed: boolean) => {
    if (gameState !== 'running' || controlMode !== 'trackpad') return;
    trackpadUpPressedRef.current = isPressed;
    setTrackpadUpPressed(isPressed);
    unlockAudio();
  }, [gameState, controlMode, unlockAudio]);

  const handleTrackpadDown = useCallback((isPressed: boolean) => {
    if (gameState !== 'running' || controlMode !== 'trackpad') return;
    trackpadDownPressedRef.current = isPressed;
    setTrackpadDownPressed(isPressed);
    unlockAudio();
  }, [gameState, controlMode, unlockAudio]);

  const handleTrackpadTap = useCallback((direction: 'up' | 'down') => {
    if (gameState !== 'running' || controlMode !== 'trackpad') return;
    unlockAudio();
    
    const nudge = direction === 'up' ? -TRACKPAD_TAP_NUDGE : TRACKPAD_TAP_NUDGE;
    const newY = Math.max(
      PADDLE_HEIGHT / 2 + COURT_MARGIN,
      Math.min(
        gameHeightRef.current - PADDLE_HEIGHT / 2 - COURT_MARGIN,
        playerPaddleYRef.current + nudge
      )
    );
    targetYRef.current = newY;
  }, [gameState, controlMode, unlockAudio]);

  // Game loop
  const gameLoop = useCallback((timestamp: number) => {
    if (gameState !== 'running') {
      animationFrameRef.current = null;
      return;
    }

    // Calculate delta time in seconds
    const dt = lastFrameTimeRef.current === 0 
      ? 0.016 
      : Math.min((timestamp - lastFrameTimeRef.current) / 1000, 0.033);
    lastFrameTimeRef.current = timestamp;

    // Update player paddle
    if (controlMode === 'touch') {
      // Tap-to-position: smoothly move toward targetY
      if (targetYRef.current !== null) {
        const dy = targetYRef.current - playerPaddleYRef.current;
        const maxMove = PADDLE_SPEED * dt;
        playerPaddleYRef.current += Math.max(-maxMove, Math.min(maxMove, dy));
      }
    } else if (controlMode === 'trackpad') {
      // Trackpad: move based on button presses
      let moveDirection = 0;
      if (trackpadUpPressedRef.current) {
        moveDirection = -1;
      } else if (trackpadDownPressedRef.current) {
        moveDirection = 1;
      }
      
      if (moveDirection !== 0) {
        const moveAmount = PADDLE_SPEED * dt * moveDirection;
        const newY = Math.max(
          PADDLE_HEIGHT / 2 + COURT_MARGIN,
          Math.min(
            gameHeightRef.current - PADDLE_HEIGHT / 2 - COURT_MARGIN,
            playerPaddleYRef.current + moveAmount
          )
        );
        playerPaddleYRef.current = newY;
        targetYRef.current = newY; // Update target for smooth transitions
      } else if (targetYRef.current !== null) {
        // Smooth to target after tap
        const dy = targetYRef.current - playerPaddleYRef.current;
        const maxMove = PADDLE_SPEED * dt;
        playerPaddleYRef.current += Math.max(-maxMove, Math.min(maxMove, dy));
      }
    }

    // Update AI paddle (with reaction delay)
    aiReactionTimerRef.current += dt * 1000;
    if (aiReactionTimerRef.current >= AI_REACTION_DELAY) {
      // Update target to track ball
      aiTargetYRef.current = ballYRef.current;
      aiReactionTimerRef.current = 0;
    }

    // Move AI paddle towards target
    const aiTargetY = Math.max(
      PADDLE_HEIGHT / 2 + COURT_MARGIN,
      Math.min(
        gameHeightRef.current - PADDLE_HEIGHT / 2 - COURT_MARGIN,
        aiTargetYRef.current
      )
    );
    const aiDy = aiTargetY - aiPaddleYRef.current;
    const aiMaxMove = AI_PADDLE_SPEED * dt;
    aiPaddleYRef.current += Math.max(-aiMaxMove, Math.min(aiMaxMove, aiDy));

    // Update ball position
    ballXRef.current += ballVelXRef.current * dt;
    ballYRef.current += ballVelYRef.current * dt;

    // Ball collision with top/bottom walls
    if (ballYRef.current - BALL_SIZE / 2 <= COURT_MARGIN) {
      ballYRef.current = COURT_MARGIN + BALL_SIZE / 2;
      ballVelYRef.current = Math.abs(ballVelYRef.current);
    } else if (ballYRef.current + BALL_SIZE / 2 >= gameHeightRef.current - COURT_MARGIN) {
      ballYRef.current = gameHeightRef.current - COURT_MARGIN - BALL_SIZE / 2;
      ballVelYRef.current = -Math.abs(ballVelYRef.current);
    }

    // Ball collision with player paddle (left)
    const playerPaddleLeft = COURT_MARGIN;
    const playerPaddleRight = COURT_MARGIN + PADDLE_WIDTH;
    const playerPaddleTop = playerPaddleYRef.current - PADDLE_HEIGHT / 2;
    const playerPaddleBottom = playerPaddleYRef.current + PADDLE_HEIGHT / 2;

    if (
      ballXRef.current - BALL_SIZE / 2 <= playerPaddleRight &&
      ballXRef.current - BALL_SIZE / 2 >= playerPaddleLeft &&
      ballYRef.current >= playerPaddleTop &&
      ballYRef.current <= playerPaddleBottom &&
      ballVelXRef.current < 0
    ) {
      // Calculate hit position on paddle (0 = top, 1 = bottom)
      const hitPosition = (ballYRef.current - playerPaddleTop) / PADDLE_HEIGHT;
      // Angle based on hit position: edge = steeper, center = flatter
      const angle = (hitPosition - 0.5) * Math.PI / 3; // Max 60 degrees
      
      ballSpeedRef.current = Math.min(ballSpeedRef.current + BALL_SPEED_INCREASE, BALL_SPEED_MAX);
      ballVelXRef.current = ballSpeedRef.current;
      ballVelYRef.current = ballSpeedRef.current * Math.sin(angle);
      ballXRef.current = playerPaddleRight + BALL_SIZE / 2;
    }

    // Ball collision with AI paddle (right)
    const aiPaddleLeft = gameWidthRef.current - COURT_MARGIN - PADDLE_WIDTH;
    const aiPaddleRight = gameWidthRef.current - COURT_MARGIN;
    const aiPaddleTop = aiPaddleYRef.current - PADDLE_HEIGHT / 2;
    const aiPaddleBottom = aiPaddleYRef.current + PADDLE_HEIGHT / 2;

    if (
      ballXRef.current + BALL_SIZE / 2 >= aiPaddleLeft &&
      ballXRef.current + BALL_SIZE / 2 <= aiPaddleRight &&
      ballYRef.current >= aiPaddleTop &&
      ballYRef.current <= aiPaddleBottom &&
      ballVelXRef.current > 0
    ) {
      // Calculate hit position on paddle
      const hitPosition = (ballYRef.current - aiPaddleTop) / PADDLE_HEIGHT;
      const angle = (hitPosition - 0.5) * Math.PI / 3;
      
      ballSpeedRef.current = Math.min(ballSpeedRef.current + BALL_SPEED_INCREASE, BALL_SPEED_MAX);
      ballVelXRef.current = -ballSpeedRef.current;
      ballVelYRef.current = ballSpeedRef.current * Math.sin(angle);
      ballXRef.current = aiPaddleLeft - BALL_SIZE / 2;
    }

    // Scoring
    if (ballXRef.current < 0) {
      // AI scores (player loses point)
      playSound('loss');
      const newAiScore = aiScore + 1;
      setAiScore(newAiScore);
      if (newAiScore >= WIN_SCORE) {
        setGameState('gameOver');
        onGameOver?.('ai');
      } else {
        setGameState('roundReset');
        setRoundCountdown(5); // 5 second countdown: 5->4->3->2->1
      }
      onScore?.(playerScore, newAiScore);
    } else if (ballXRef.current > gameWidthRef.current) {
      // Player scores (player wins point)
      playSound('win');
      const newPlayerScore = playerScore + 1;
      setPlayerScore(newPlayerScore);
      if (newPlayerScore >= WIN_SCORE) {
        setGameState('gameOver');
        onGameOver?.('player');
      } else {
        setGameState('roundReset');
        setRoundCountdown(5); // 5 second countdown: 5->4->3->2->1
      }
      onScore?.(newPlayerScore, aiScore);
    }

    // Draw
    drawCanvas();

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, playerScore, aiScore, controlMode, onScore, onGameOver, resetBall, playSound]);

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

    // Initialize positions if needed
    if (playerPaddleYRef.current === 0 || playerPaddleYRef.current > displayHeight) {
      playerPaddleYRef.current = displayHeight / 2;
      aiPaddleYRef.current = displayHeight / 2;
    }

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Draw center line (dashed)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(displayWidth / 2, COURT_MARGIN);
    ctx.lineTo(displayWidth / 2, displayHeight - COURT_MARGIN);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw boundaries
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(COURT_MARGIN, COURT_MARGIN, displayWidth - COURT_MARGIN * 2, displayHeight - COURT_MARGIN * 2);

    // Draw player paddle (left)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(
      COURT_MARGIN,
      playerPaddleYRef.current - PADDLE_HEIGHT / 2,
      PADDLE_WIDTH,
      PADDLE_HEIGHT
    );

    // Draw AI paddle (right)
    ctx.fillRect(
      displayWidth - COURT_MARGIN - PADDLE_WIDTH,
      aiPaddleYRef.current - PADDLE_HEIGHT / 2,
      PADDLE_WIDTH,
      PADDLE_HEIGHT
    );

    // Draw ball
    if (gameState === 'running' || gameState === 'roundReset') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ballXRef.current, ballYRef.current, BALL_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw score
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${clamp(24, displayWidth * 0.06, 48)}px ${wingShackTheme.typography.fontFamily.display}`;
    ctx.textAlign = 'center';
    ctx.fillText(
      `${playerScore} - ${aiScore}`,
      displayWidth / 2,
      clamp(30, displayHeight * 0.05, 50)
    );
  }, [gameState]);

  // Helper for clamp
  const clamp = (min: number, value: number, max: number) => Math.max(min, Math.min(max, value));

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
      }
    };
  }, [gameState, gameLoop]);

  // Initial draw
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      drawCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawCanvas]);

  // Handle round reset countdown (exactly 5 seconds: 5 -> 4 -> 3 -> 2 -> 1 -> play)
  useEffect(() => {
    if (gameState === 'roundReset' && roundCountdown !== null && roundCountdown > 0) {
      // Each countdown number lasts exactly 1 second
      const timer = setTimeout(() => {
        setRoundCountdown((prev) => {
          if (prev === null || prev <= 1) {
            // Countdown finished, start new round
            setRoundCountdown(null);
            resetBall();
            setGameState('running');
            return null;
          }
          return prev - 1;
        });
      }, COUNTDOWN_DURATION);
      return () => clearTimeout(timer);
    } else if (gameState !== 'roundReset') {
      // Clear countdown if game state changes away from roundReset
      setRoundCountdown(null);
    }
  }, [gameState, roundCountdown, resetBall]);

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
      lastFrameTimeRef.current = performance.now();
    }
  }, [gameState]);

  // Reset game
  const resetGameState = useCallback(() => {
    resetGame();
    setGameState('idle');
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

  // Handle tap/click to start
  const handleStart = useCallback(() => {
    if (gameState === 'idle') {
      startGame();
    } else if (gameState === 'gameOver') {
      resetGame();
      setGameState('idle');
    }
  }, [gameState, startGame, resetGame]);

  return (
    <GameLifecycleWrapper lifecycle={lifecycle}>
      <div
        style={{
          width: '100%',
          height: '100%',
          maxHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          position: 'relative',
          overflow: 'hidden', // Prevent scrolling
          boxSizing: 'border-box',
        }}
        data-game-lifecycle="true"
      >
        {/* Canvas - Fixed size, doesn't change */}
        <canvas
          ref={canvasRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          style={{
            width: '100%',
            maxWidth: 'clamp(320px, 90vw, 600px)',
            height: controlMode === 'trackpad' 
              ? 'clamp(300px, 50vh, 450px)' 
              : 'clamp(400px, 60vh, 600px)',
            display: 'block',
            borderRadius: wingShackTheme.borderRadius.md,
            border: `2px solid ${wingShackTheme.colors.primary}40`,
            touchAction: 'none', // Prevent scrolling
            flexShrink: 0,
          }}
        />

        {/* Control Mode Toggle - Fixed position below canvas */}
        <div
          style={{
            marginTop: 'clamp(8px, 1.5vw, 12px)',
            width: '100%',
            maxWidth: 'clamp(320px, 90vw, 600px)',
            display: 'flex',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <motion.button
            onClick={() => setControlMode(controlMode === 'touch' ? 'trackpad' : 'touch')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: 'clamp(8px, 1.5vw, 12px) clamp(16px, 3vw, 24px)',
              borderRadius: wingShackTheme.borderRadius.md,
              border: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: wingShackTheme.colors.primary,
              fontFamily: wingShackTheme.typography.fontFamily.body,
              fontSize: 'clamp(12px, 2vw, 14px)',
              fontWeight: wingShackTheme.typography.fontWeight.semibold,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              whiteSpace: 'nowrap',
            }}
          >
            {controlMode === 'touch' ? '👆 Touch Mode' : '🎮 Trackpad Mode'}
          </motion.button>
        </div>

        {/* Trackpad Controls */}
        {controlMode === 'trackpad' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: `${TRACKPAD_BUTTON_SPACING}px`,
              marginTop: 'clamp(8px, 1.5vw, 12px)',
              paddingBottom: 'env(safe-area-inset-bottom, clamp(8px, 1.5vw, 12px))',
              width: '100%',
              maxWidth: 'clamp(320px, 90vw, 600px)',
              flexShrink: 0,
            }}
          >
            {/* Up Button */}
            <motion.button
              onPointerDown={(e) => {
                e.preventDefault();
                handleTrackpadUp(true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                handleTrackpadUp(false);
              }}
              onPointerCancel={(e) => {
                e.preventDefault();
                handleTrackpadUp(false);
              }}
              onClick={(e) => {
                e.preventDefault();
                handleTrackpadTap('up');
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                width: `clamp(${TRACKPAD_BUTTON_SIZE}px, 15vw, 80px)`,
                height: `clamp(${TRACKPAD_BUTTON_SIZE}px, 15vw, 80px)`,
                minWidth: `${TRACKPAD_BUTTON_SIZE}px`,
                minHeight: `${TRACKPAD_BUTTON_SIZE}px`,
                borderRadius: wingShackTheme.borderRadius.lg,
                border: 'none',
                backgroundColor: trackpadUpPressed ? wingShackTheme.colors.primary : 'rgba(255, 255, 255, 0.9)',
                color: trackpadUpPressed ? '#ffffff' : wingShackTheme.colors.primary,
                fontSize: 'clamp(32px, 6vw, 48px)',
                fontWeight: wingShackTheme.typography.fontWeight.bold,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                touchAction: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              ▲
            </motion.button>

            {/* Down Button */}
            <motion.button
              onPointerDown={(e) => {
                e.preventDefault();
                handleTrackpadDown(true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                handleTrackpadDown(false);
              }}
              onPointerCancel={(e) => {
                e.preventDefault();
                handleTrackpadDown(false);
              }}
              onClick={(e) => {
                e.preventDefault();
                handleTrackpadTap('down');
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                width: `clamp(${TRACKPAD_BUTTON_SIZE}px, 15vw, 80px)`,
                height: `clamp(${TRACKPAD_BUTTON_SIZE}px, 15vw, 80px)`,
                minWidth: `${TRACKPAD_BUTTON_SIZE}px`,
                minHeight: `${TRACKPAD_BUTTON_SIZE}px`,
                borderRadius: wingShackTheme.borderRadius.lg,
                border: 'none',
                backgroundColor: trackpadDownPressed ? wingShackTheme.colors.primary : 'rgba(255, 255, 255, 0.9)',
                color: trackpadDownPressed ? '#ffffff' : wingShackTheme.colors.primary,
                fontSize: 'clamp(32px, 6vw, 48px)',
                fontWeight: wingShackTheme.typography.fontWeight.bold,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                touchAction: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              ▼
            </motion.button>
          </div>
        )}

        {/* Idle overlay */}
        {gameState === 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'clamp(12px, 2vw, 20px)',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              borderRadius: wingShackTheme.borderRadius.md,
              padding: 'clamp(24px, 4vw, 40px)',
              cursor: 'pointer',
            }}
            onClick={handleStart}
          >
            <div
              style={{
                fontFamily: wingShackTheme.typography.fontFamily.display,
                fontSize: 'clamp(32px, 5vw, 48px)',
                fontWeight: wingShackTheme.typography.fontWeight.bold,
                color: '#ffffff',
                textAlign: 'center',
              }}
            >
              🏓 PONG
            </div>
            <div
              style={{
                fontFamily: wingShackTheme.typography.fontFamily.body,
                fontSize: 'clamp(16px, 2.5vw, 20px)',
                color: '#ffffff',
                textAlign: 'center',
              }}
            >
              Tap to start
            </div>
          </motion.div>
        )}

        {/* Round reset countdown */}
        <AnimatePresence>
          {gameState === 'roundReset' && roundCountdown !== null && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                borderRadius: wingShackTheme.borderRadius.md,
              }}
            >
              <div
                style={{
                  fontFamily: wingShackTheme.typography.fontFamily.display,
                  fontSize: 'clamp(64px, 10vw, 120px)',
                  fontWeight: wingShackTheme.typography.fontWeight.bold,
                  color: '#ffffff',
                }}
              >
                {roundCountdown}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game over overlay */}
        {gameState === 'gameOver' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'clamp(12px, 2vw, 20px)',
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              borderRadius: wingShackTheme.borderRadius.md,
              padding: 'clamp(24px, 4vw, 40px)',
            }}
          >
            <div
              style={{
                fontFamily: wingShackTheme.typography.fontFamily.display,
                fontSize: 'clamp(32px, 5vw, 48px)',
                fontWeight: wingShackTheme.typography.fontWeight.bold,
                color: '#ffffff',
                textAlign: 'center',
              }}
            >
              {playerScore >= WIN_SCORE ? 'YOU WIN! 🎉' : 'AI WINS! 😔'}
            </div>
            <div
              style={{
                fontFamily: wingShackTheme.typography.fontFamily.body,
                fontSize: 'clamp(18px, 3vw, 24px)',
                color: '#ffffff',
                textAlign: 'center',
              }}
            >
              Final Score: {playerScore} - {aiScore}
            </div>
            <motion.button
              onClick={handleStart}
              style={{
                padding: 'clamp(12px, 2vw, 16px) clamp(24px, 4vw, 32px)',
                backgroundColor: wingShackTheme.colors.primary,
                color: '#ffffff',
                border: 'none',
                borderRadius: wingShackTheme.borderRadius.md,
                fontFamily: wingShackTheme.typography.fontFamily.display,
                fontSize: 'clamp(16px, 2.5vw, 20px)',
                fontWeight: wingShackTheme.typography.fontWeight.bold,
                cursor: 'pointer',
                marginTop: 'clamp(12px, 2vw, 20px)',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Play Again
            </motion.button>
          </motion.div>
        )}
      </div>
    </GameLifecycleWrapper>
  );
};

export default Pong;

