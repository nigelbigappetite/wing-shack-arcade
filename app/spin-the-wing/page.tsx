'use client';

import { useState } from 'react';
import GameShell from '@/components/GameShell';
import SpinTheWing from '@/components/games/SpinTheWing';
import { wingShackTheme } from '@/theme/wingShackTheme';
import WingShackLogo from '@/components/ui/WingShackLogo';
import GameCard from '@/components/ui/GameCard';

export default function SpinTheWingPage() {
  const [resetKey, setResetKey] = useState(0);

  return (
    <div
      style={{
        width: '100vw',
        minHeight: '100vh',
        padding: wingShackTheme.spacing.lg,
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
        gap: wingShackTheme.spacing.xl,
      }}
    >
      {/* Header with Logo */}
      <GameCard elevated glow style={{ marginTop: wingShackTheme.spacing.xl }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: wingShackTheme.spacing.md,
          }}
        >
          <WingShackLogo size="lg" showText={false} />
          <h1
            style={{
              fontFamily: wingShackTheme.typography.fontFamily.display,
              fontSize: wingShackTheme.typography.fontSize['4xl'],
              fontWeight: wingShackTheme.typography.fontWeight.bold,
              color: wingShackTheme.colors.text,
              margin: 0,
              letterSpacing: '1px',
              textShadow: `0 2px 8px rgba(159, 8, 8, 0.3)`,
            }}
          >
            SPIN THE WING
          </h1>
          <p
            style={{
              color: wingShackTheme.colors.textSecondary,
              fontSize: wingShackTheme.typography.fontSize.lg,
              margin: 0,
              textAlign: 'center',
            }}
          >
            Win amazing prizes with every spin!
          </p>
        </div>
      </GameCard>

      {/* Game Container */}
      <GameCard
        elevated
        glow
        style={{
          width: '100%',
          maxWidth: '1000px',
          padding: wingShackTheme.spacing.xl,
        }}
      >
        <GameShell
          title="Spin the Wing"
          howToPlay="Tap the wheel to spin! The wheel will slow down and stop on a random prize. You get one spin per round - use the reset button to spin again. Watch for near-misses when the pointer lands close to a segment boundary!"
          onStart={() => console.log('Game started')}
          onReset={() => {
            console.log('Game reset');
            // Trigger game reset by changing key
            setResetKey((prev) => prev + 1);
          }}
          onPause={() => console.log('Game paused')}
          onResume={() => console.log('Game resumed')}
        >
          <SpinTheWing
            key={resetKey}
            onWin={(segment) => {
              console.log('Winner!', segment);
            }}
          />
        </GameShell>
      </GameCard>
    </div>
  );
}

