'use client';

import { useState, useEffect } from 'react';
import ArcadeCoverflow from '@/components/ArcadeCoverflow';
import GameCabinet from '@/components/GameCabinet';

export default function CombinedExample() {
  const [activeIndex, setActiveIndex] = useState(0);

  // Example game components
  const Game1 = () => {
    const [count, setCount] = useState(0);
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
        }}
      >
        <h2 style={{ marginBottom: '20px' }}>Game 1</h2>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>{count}</div>
        <button
          onClick={() => setCount(count + 1)}
          style={{
            padding: '12px 24px',
            backgroundColor: '#4ecdc4',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          Click Me!
        </button>
      </div>
    );
  };

  const Game2 = () => {
    const [time, setTime] = useState(0);
    const [running, setRunning] = useState(false);

    useEffect(() => {
      let interval: NodeJS.Timeout;
      if (running) {
        interval = setInterval(() => {
          setTime((prev) => prev + 0.1);
        }, 100);
      }
      return () => {
        if (interval) clearInterval(interval);
      };
    }, [running]);

    return (
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
        }}
      >
        <h2 style={{ marginBottom: '20px' }}>Game 2</h2>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>
          {time.toFixed(1)}s
        </div>
        <button
          onClick={() => setRunning(!running)}
          style={{
            padding: '12px 24px',
            backgroundColor: running ? '#ff6b6b' : '#4ecdc4',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          {running ? 'Stop' : 'Start'}
        </button>
      </div>
    );
  };

  const Game3 = () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f3460',
        color: '#fff',
      }}
    >
      <h2 style={{ marginBottom: '20px' }}>Game 3</h2>
      <p style={{ textAlign: 'center', padding: '20px' }}>
        This is a simple game component. When this card is not active, it will be
        paused and only show the preview.
      </p>
    </div>
  );

  const games = [
    {
      id: 1,
      title: 'Click Counter',
      preview: (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ fontSize: '64px' }}>🔢</div>
          <h3 style={{ color: '#fff', margin: 0 }}>Click Counter Game</h3>
        </div>
      ),
      game: <Game1 />,
    },
    {
      id: 2,
      title: 'Timer',
      preview: (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ fontSize: '64px' }}>⏱️</div>
          <h3 style={{ color: '#fff', margin: 0 }}>Timer Game</h3>
        </div>
      ),
      game: <Game2 />,
    },
    {
      id: 3,
      title: 'Simple Game',
      preview: (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ fontSize: '64px' }}>🎮</div>
          <h3 style={{ color: '#fff', margin: 0 }}>Simple Game</h3>
        </div>
      ),
      game: <Game3 />,
    },
  ];

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
      }}
    >
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h1 style={{ color: '#fff', marginBottom: '10px', fontSize: '32px' }}>
          Arcade Coverflow + Game Cabinet
        </h1>
        <p style={{ color: '#888' }}>
          Active Game: {activeIndex + 1} / {games.length}
        </p>
      </div>

      <div style={{ width: '100%', height: 'calc(100% - 120px)', flex: 1 }}>
        <ArcadeCoverflow
          onActiveIndexChange={setActiveIndex}
          cardWidth={320}
          cardGap={24}
        >
          {games.map((gameData, index) => (
            <div
              key={gameData.id}
              style={{
                width: '100%',
                height: '500px',
              }}
            >
              <GameCabinet
                title={gameData.title}
                isActive={index === activeIndex}
                preview={gameData.preview}
                game={gameData.game}
              />
            </div>
          ))}
        </ArcadeCoverflow>
      </div>
    </div>
  );
}

