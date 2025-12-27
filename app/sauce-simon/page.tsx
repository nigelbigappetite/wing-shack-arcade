'use client';

import { useState } from 'react';
import Link from 'next/link';
import GameShell from '@/components/GameShell';
import SauceSimon from '@/components/games/SauceSimon';
import { wingShackTheme } from '@/theme/wingShackTheme';
import WingShackLogo from '@/components/ui/WingShackLogo';
import GameCard from '@/components/ui/GameCard';

export default function SauceSimonPage() {
  const [resetKey, setResetKey] = useState(0);

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
          marginTop: 'clamp(8px, 2vw, 16px)',
          textDecoration: 'none',
          cursor: 'pointer',
        }}
      >
        <WingShackLogo size="sm" showText={false} />
      </Link>

      {/* Game Container */}
      <GameCard
        elevated
        style={{
          width: '100%',
          maxWidth: '1000px',
          padding: 'clamp(8px, 2vw, 16px)',
          overflow: 'hidden',
        }}
      >
        <GameShell
          title="Sauce Simon"
          howToPlay="Watch the sauces light up. Repeat the sequence in the same order. Each round adds one more sauce. One mistake ends the game."
          onStart={() => console.log('Game started')}
          onReset={() => {
            console.log('Game reset');
            setResetKey((prev) => prev + 1);
          }}
          onPause={() => console.log('Game paused')}
          onResume={() => console.log('Game resumed')}
        >
          <SauceSimon
            key={resetKey}
            onScore={(score) => {
              console.log('Score:', score);
            }}
          />
        </GameShell>
      </GameCard>
    </div>
  );
}

