'use client';

import { useRef, useState } from 'react';
import GameShell, { GameShellRef } from '@/components/GameShell';

export default function GameShellExample() {
  const gameShellRef = useRef<GameShellRef>(null);
  const [score, setScore] = useState(0);
  const [isGameActive, setIsGameActive] = useState(false);
  const [timer, setTimer] = useState(0);

  // Example game component
  const ExampleGame = () => {
    const [gameScore, setGameScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(30);

    // Game logic would go here
    // This is just a simple example

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          gap: '20px',
        }}
      >
        <div
          style={{
            fontSize: 'clamp(32px, 8vw, 64px)',
            fontWeight: 'bold',
            color: '#4ecdc4',
            textAlign: 'center',
          }}
        >
          Score: {gameScore}
        </div>

        <div
          style={{
            fontSize: 'clamp(18px, 4vw, 24px)',
            color: 'rgba(255, 255, 255, 0.8)',
            textAlign: 'center',
          }}
        >
          Time: {timeLeft}s
        </div>

        <button
          onClick={() => {
            setGameScore((prev) => prev + 10);
          }}
          style={{
            padding: '16px 32px',
            fontSize: '18px',
            backgroundColor: '#4ecdc4',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          Click to Score!
        </button>

        <p
          style={{
            color: 'rgba(255, 255, 255, 0.6)',
            textAlign: 'center',
            fontSize: '14px',
            maxWidth: '400px',
          }}
        >
          This is the game content area. The GameShell handles all the controls and UI.
        </p>
      </div>
    );
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        padding: '20px',
        boxSizing: 'border-box',
        backgroundColor: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '30px',
      }}
    >
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <h1 style={{ fontSize: 'clamp(28px, 6vw, 36px)', marginBottom: '12px' }}>
          Game Shell Demo
        </h1>
        <p style={{ color: '#888', fontSize: '16px' }}>
          A reusable shell component for games with built-in controls
        </p>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '800px',
          height: '600px',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        <GameShell
          ref={gameShellRef}
          title="Example Game"
          howToPlay="Click the button to score points! Try to get as many points as possible. Use the controls above to pause, restart, or toggle sound."
          onStart={() => {
            setIsGameActive(true);
            console.log('Game started');
          }}
          onReset={() => {
            setIsGameActive(false);
            setScore(0);
            setTimer(0);
            console.log('Game reset');
          }}
          onPause={() => {
            console.log('Game paused');
          }}
          onResume={() => {
            console.log('Game resumed');
          }}
        >
          <ExampleGame />
        </GameShell>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <button
          onClick={() => gameShellRef.current?.start()}
          style={{
            padding: '12px 24px',
            backgroundColor: '#4ecdc4',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Start (via ref)
        </button>
        <button
          onClick={() => gameShellRef.current?.reset()}
          style={{
            padding: '12px 24px',
            backgroundColor: '#ff6b6b',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Reset (via ref)
        </button>
        <button
          onClick={() => gameShellRef.current?.pause()}
          style={{
            padding: '12px 24px',
            backgroundColor: '#f9ca24',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Pause (via ref)
        </button>
        <button
          onClick={() => gameShellRef.current?.resume()}
          style={{
            padding: '12px 24px',
            backgroundColor: '#6c5ce7',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Resume (via ref)
        </button>
      </div>

      <div
        style={{
          color: '#888',
          fontSize: '14px',
          textAlign: 'center',
          maxWidth: '600px',
        }}
      >
        <p>
          The GameShell component provides a consistent UI shell for games with built-in controls.
          You can control it via the buttons above (using refs) or through the built-in controls.
        </p>
      </div>
    </div>
  );
}

