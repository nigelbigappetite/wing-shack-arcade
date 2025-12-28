'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import GameShell from '@/components/GameShell';
import FlappyWing from '@/components/games/FlappyWing';
import { wingShackTheme } from '@/theme/wingShackTheme';
import WingShackLogo from '@/components/ui/WingShackLogo';

export default function FlappyWingPage() {
  const [resetKey, setResetKey] = useState(0);
  const [gameOverScore, setGameOverScore] = useState<number | null>(null);

  // Handle game over
  const handleGameOver = useCallback((finalScore: number) => {
    setGameOverScore(finalScore);
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        minHeight: '100vh',
        padding: 'clamp(8px, 2vw, 16px)',
        boxSizing: 'border-box',
        backgroundColor: wingShackTheme.colors.background,
        backgroundImage: `
          radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 248, 240, 1) 100%),
          radial-gradient(circle at 20% 30%, rgba(200, 88, 32, 0.08) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(159, 8, 8, 0.05) 0%, transparent 60%)
        `,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 'clamp(8px, 2vw, 12px)',
      }}
    >
      {/* Header with Logo */}
      <Link
        href="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          marginTop: 'clamp(8px, 2vw, 16px)',
          textDecoration: 'none',
          cursor: 'pointer',
        }}
      >
        <WingShackLogo size="sm" showText={false} />
      </Link>

      {/* Game Container */}
      <div
        style={{
          width: '100%',
          maxWidth: '1000px',
          margin: '0 auto',
        }}
      >
        <GameShell
          title="Flappy Wing"
          howToPlay="Tap anywhere (or press spacebar) to flap and fly through the pipes. Avoid hitting the pipes or the ground. Each pipe you pass gives you 1 point!"
          onStart={() => {
            setGameOverScore(null);
          }}
          onReset={() => {
            setGameOverScore(null);
            setResetKey((prev) => prev + 1);
          }}
          onPause={() => console.log('Game paused')}
          onResume={() => console.log('Game resumed')}
        >
          <FlappyWing
            key={resetKey}
            onScore={(score) => {
              console.log('Score:', score);
            }}
            onGameOver={handleGameOver}
          />
        </GameShell>
      </div>
    </div>
  );
}

