'use client';

import { useState } from 'react';
import GameCabinet from '@/components/GameCabinet';

export default function GameCabinetExample() {
  const [isActive, setIsActive] = useState(false);

  // Simple example game component
  const ExampleGame = () => {
    const [score, setScore] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a2e',
          color: '#fff',
          padding: '20px',
        }}
      >
        <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>Example Game</h2>
        <div style={{ marginBottom: '20px', fontSize: '48px', fontWeight: 'bold' }}>
          Score: {score}
        </div>
        <button
          onClick={() => {
            setIsPlaying(!isPlaying);
            if (!isPlaying) {
              const interval = setInterval(() => {
                setScore((prev) => prev + 1);
              }, 100);
              setTimeout(() => {
                clearInterval(interval);
                setIsPlaying(false);
              }, 5000);
            }
          }}
          style={{
            padding: '12px 24px',
            fontSize: '18px',
            backgroundColor: '#4ecdc4',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          {isPlaying ? 'Playing...' : 'Start Game'}
        </button>
        <p style={{ marginTop: '20px', opacity: 0.7, textAlign: 'center' }}>
          This is the active game view. When inactive, only the preview is shown.
        </p>
      </div>
    );
  };

  // Preview component
  const Preview = () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#16213e',
        color: '#fff',
        padding: '40px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          backgroundColor: '#4ecdc4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          fontSize: '48px',
        }}
      >
        🎮
      </div>
      <h3 style={{ fontSize: '24px', marginBottom: '12px' }}>Game Preview</h3>
      <p style={{ opacity: 0.8, fontSize: '16px' }}>
        Click the button below to activate and play the game
      </p>
    </div>
  );

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        padding: '40px',
        boxSizing: 'border-box',
        backgroundColor: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '40px',
      }}
    >
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <h1 style={{ fontSize: '36px', marginBottom: '12px' }}>Game Cabinet Demo</h1>
        <p style={{ color: '#888', fontSize: '18px' }}>
          Toggle the game state to see the animated transition
        </p>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '800px',
          height: '600px',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <GameCabinet
          title="Example Game Cabinet"
          isActive={isActive}
          preview={<Preview />}
          game={<ExampleGame />}
        />
      </div>

      <button
        onClick={() => setIsActive(!isActive)}
        style={{
          padding: '16px 32px',
          fontSize: '18px',
          backgroundColor: isActive ? '#ff6b6b' : '#4ecdc4',
          color: '#000',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
          transition: 'background-color 0.3s',
        }}
      >
        {isActive ? 'Deactivate Game' : 'Activate Game'}
      </button>

      <div style={{ color: '#888', fontSize: '14px', textAlign: 'center' }}>
        <p>Status: {isActive ? '🟢 Active' : '⚪ Inactive'}</p>
        <p style={{ marginTop: '8px' }}>
          When inactive, the game is paused and only the preview is visible.
        </p>
      </div>
    </div>
  );
}

