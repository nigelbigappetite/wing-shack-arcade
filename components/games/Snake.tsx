'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameLifecycle } from '@/hooks/useGameLifecycle';
import GameLifecycleWrapper from '@/components/GameLifecycleWrapper';
import { wingShackTheme } from '@/theme/wingShackTheme';

interface SnakeProps {
  onScore?: (score: number) => void;
}

type Direction = 'up' | 'down' | 'left' | 'right';
type GameState = 'idle' | 'running' | 'gameOver';

interface Position {
  x: number;
  y: number;
}

const GRID_SIZE = 20; // 20x20 grid
const INITIAL_SPEED = 1000 / 7; // ~7 moves per second (ms per move)
const SPEED_INCREASE = 0.9; // Multiply by this each time
const SPEED_INCREASE_INTERVAL = 5; // Every 5 wings
const MAX_SPEED = 50; // Minimum ms per move (cap)

const Snake: React.FC<SnakeProps> = ({ onScore }) => {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [snake, setSnake] = useState<Position[]>([]);
  const [food, setFood] = useState<Position | null>(null);
  const [direction, setDirection] = useState<Direction>('right');
  const [nextDirection, setNextDirection] = useState<Direction>('right');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [wingsEaten, setWingsEaten] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastMoveTimeRef = useRef<number>(0);
  const directionRef = useRef<Direction>('right');
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize snake in center
  const initializeSnake = useCallback(() => {
    const center = Math.floor(GRID_SIZE / 2);
    return [
      { x: center, y: center },
      { x: center - 1, y: center },
      { x: center - 2, y: center },
    ];
  }, []);

  // Generate random food position (not on snake)
  const generateFood = useCallback((snakeBody: Position[]): Position => {
    const occupied = new Set(snakeBody.map((p) => `${p.x},${p.y}`));
    let attempts = 0;
    let foodPos: Position;

    do {
      foodPos = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      attempts++;
    } while (occupied.has(`${foodPos.x},${foodPos.y}`) && attempts < 1000);

    return foodPos;
  }, []);

  // Check if direction is reverse
  const isReverseDirection = useCallback((current: Direction, newDir: Direction): boolean => {
    const opposites: Record<Direction, Direction> = {
      up: 'down',
      down: 'up',
      left: 'right',
      right: 'left',
    };
    return opposites[current] === newDir;
  }, []);

  // Move snake
  const moveSnake = useCallback(() => {
    setSnake((prevSnake) => {
      if (prevSnake.length === 0) return prevSnake;

      // Update direction (ignore reverse)
      const currentDir = directionRef.current;
      if (!isReverseDirection(currentDir, nextDirection)) {
        directionRef.current = nextDirection;
        setDirection(nextDirection);
      }
      const dir = directionRef.current;

      // Calculate new head position
      const head = { ...prevSnake[0] };
      switch (dir) {
        case 'up':
          head.y -= 1;
          break;
        case 'down':
          head.y += 1;
          break;
        case 'left':
          head.x -= 1;
          break;
        case 'right':
          head.x += 1;
          break;
      }

      // Check wall collision
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        setGameState('gameOver');
        return prevSnake;
      }

      // Check self collision
      const bodySet = new Set(prevSnake.slice(1).map((p) => `${p.x},${p.y}`));
      if (bodySet.has(`${head.x},${head.y}`)) {
        setGameState('gameOver');
        return prevSnake;
      }

      // Check food collision
      const newSnake = [head, ...prevSnake];
      if (food && head.x === food.x && head.y === food.y) {
        // Ate food - grow snake, generate new food, increase score
        const newScore = score + 1;
        const newWingsEaten = wingsEaten + 1;
        setScore(newScore);
        setWingsEaten(newWingsEaten);
        onScore?.(newScore);

        // Update best score
        if (newScore > bestScore) {
          setBestScore(newScore);
          localStorage.setItem('snake-best-score', newScore.toString());
        }

        // Increase speed every 5 wings
        if (newWingsEaten % SPEED_INCREASE_INTERVAL === 0) {
          setSpeed((prev) => Math.max(MAX_SPEED, prev * SPEED_INCREASE));
        }

        // Generate new food
        const newFood = generateFood(newSnake);
        setFood(newFood);
        return newSnake;
      } else {
        // No food - remove tail
        newSnake.pop();
        return newSnake;
      }
    });
  }, [food, score, wingsEaten, bestScore, nextDirection, isReverseDirection, generateFood, onScore]);

  // Game loop
  const gameLoop = useCallback((timestamp: number) => {
    if (gameState !== 'running') {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    if (timestamp - lastMoveTimeRef.current >= speed) {
      moveSnake();
      lastMoveTimeRef.current = timestamp;
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, speed, moveSnake]);

  // Start game loop
  useEffect(() => {
    if (gameState === 'running') {
      lastMoveTimeRef.current = performance.now();
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

  // Render canvas
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

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    const cellSize = displayWidth / GRID_SIZE;

    // Draw grid lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = i * cellSize;
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, displayHeight);
      ctx.stroke();
      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(displayWidth, pos);
      ctx.stroke();
    }

    // Draw food (chicken wing emoji)
    if (food) {
      ctx.font = `${cellSize * 0.8}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        '🍗',
        food.x * cellSize + cellSize / 2,
        food.y * cellSize + cellSize / 2
      );
    }

    // Draw snake
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      ctx.fillStyle = isHead ? wingShackTheme.colors.primary : wingShackTheme.colors.secondary;
      ctx.fillRect(
        segment.x * cellSize + 1,
        segment.y * cellSize + 1,
        cellSize - 2,
        cellSize - 2
      );

      // Draw outline on head
      if (isHead) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          segment.x * cellSize + 2,
          segment.y * cellSize + 2,
          cellSize - 4,
          cellSize - 4
        );
      }
    });
  }, [snake, food]);

  // Redraw canvas continuously
  useEffect(() => {
    let animationFrameId: number;
    const render = () => {
      drawCanvas();
      animationFrameId = requestAnimationFrame(render);
    };
    render();
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [drawCanvas]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      drawCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawCanvas]);

  // Handle keyboard input
  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      if (gameState !== 'running') return;

      let newDir: Direction | null = null;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          newDir = 'up';
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          newDir = 'down';
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          newDir = 'left';
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          newDir = 'right';
          break;
      }

      if (newDir && !isReverseDirection(directionRef.current, newDir)) {
        setNextDirection(newDir);
        e.preventDefault();
      }
    },
    [gameState, isReverseDirection]
  );

  // Handle touch/swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (gameState !== 'running') return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    e.preventDefault();
  }, [gameState]);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (gameState !== 'running' || !touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const minSwipeDistance = 30;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (Math.abs(deltaX) > minSwipeDistance) {
          const newDir: Direction = deltaX > 0 ? 'right' : 'left';
          if (!isReverseDirection(directionRef.current, newDir)) {
            setNextDirection(newDir);
          }
        }
      } else {
        // Vertical swipe
        if (Math.abs(deltaY) > minSwipeDistance) {
          const newDir: Direction = deltaY > 0 ? 'down' : 'up';
          if (!isReverseDirection(directionRef.current, newDir)) {
            setNextDirection(newDir);
          }
        }
      }

      touchStartRef.current = null;
      e.preventDefault();
    },
    [gameState, isReverseDirection]
  );

  // Keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // Load best score from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('snake-best-score');
    if (saved) {
      setBestScore(parseInt(saved, 10));
    }
  }, []);

  // Start game
  const startGame = useCallback(() => {
    const initialSnake = initializeSnake();
    setSnake(initialSnake);
    setFood(generateFood(initialSnake));
    setDirection('right');
    directionRef.current = 'right';
    setNextDirection('right');
    setScore(0);
    setWingsEaten(0);
    setSpeed(INITIAL_SPEED);
    setGameState('running');
    lastMoveTimeRef.current = performance.now();
  }, [initializeSnake, generateFood]);

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
  const resetGame = useCallback(() => {
    setGameState('idle');
    setSnake([]);
    setFood(null);
    setDirection('right');
    directionRef.current = 'right';
    setNextDirection('right');
    setScore(0);
    setWingsEaten(0);
    setSpeed(INITIAL_SPEED);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Game lifecycle integration
  const lifecycle = useGameLifecycle({
    onStart: startGame,
    onPause: pauseGame,
    onResume: resumeGame,
    onReset: resetGame,
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
          justifyContent: 'center',
          padding: 'clamp(16px, 3vw, 24px)',
          backgroundColor: wingShackTheme.colors.backgroundCard,
          borderRadius: wingShackTheme.borderRadius.lg,
          gap: 'clamp(12px, 2vw, 16px)',
        }}
      >
        {/* Score Display */}
        {gameState !== 'idle' && (
          <div
            style={{
              display: 'flex',
              gap: 'clamp(16px, 3vw, 24px)',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                padding: 'clamp(6px, 1.2vw, 10px) clamp(12px, 2vw, 18px)',
                borderRadius: wingShackTheme.borderRadius.lg,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
            >
              <div
                style={{
                  fontFamily: wingShackTheme.typography.fontFamily.display,
                  fontSize: 'clamp(14px, 2.5vw, 20px)',
                  fontWeight: wingShackTheme.typography.fontWeight.bold,
                  color: wingShackTheme.colors.primary,
                }}
              >
                Score: {score}
              </div>
            </div>
            {bestScore > 0 && (
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  padding: 'clamp(6px, 1.2vw, 10px) clamp(12px, 2vw, 18px)',
                  borderRadius: wingShackTheme.borderRadius.lg,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                }}
              >
                <div
                  style={{
                    fontFamily: wingShackTheme.typography.fontFamily.display,
                    fontSize: 'clamp(14px, 2.5vw, 20px)',
                    fontWeight: wingShackTheme.typography.fontWeight.bold,
                    color: wingShackTheme.colors.secondary,
                  }}
                >
                  Best: {bestScore}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Canvas */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 'clamp(300px, 80vw, 520px)',
            aspectRatio: '1',
            touchAction: 'none', // Prevent scrolling during swipe
          }}
        >
          <canvas
            ref={canvasRef}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
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
                Final Score: {score}
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
                  Best Score: {bestScore}
                </motion.div>
              )}

              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                onClick={() => {
                  resetGame();
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
                PLAY AGAIN
              </motion.button>
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
            }}
          >
            <div
              style={{
                fontSize: 'clamp(64px, 10vw, 96px)',
                marginBottom: 'clamp(8px, 1.5vw, 16px)',
              }}
            >
              🐍
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
              SNAKE
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

export default Snake;

