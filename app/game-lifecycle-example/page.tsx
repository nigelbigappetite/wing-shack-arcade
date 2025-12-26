'use client';

import { useState, useEffect } from 'react';
import ArcadeCoverflow from '@/components/ArcadeCoverflow';
import GameLifecycleWrapper from '@/components/GameLifecycleWrapper';
import { useGameLifecycle } from '@/hooks/useGameLifecycle';

// Example game that implements the lifecycle
function ExampleGame1() {
  const [score, setScore] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const lifecycle = useGameLifecycle({
    onStart: () => {
      console.log('Game 1 started');
      setIsRunning(true);
      // Start game logic here
    },
    onPause: () => {
      console.log('Game 1 paused');
      setIsRunning(false);
    },
    onReset: () => {
      console.log('Game 1 reset');
      setScore(0);
      setIsRunning(false);
    },
  });

  return (
    <GameLifecycleWrapper lifecycle={lifecycle}>
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
        <h2 style={{ marginBottom: '20px' }}>Game 1</h2>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>Score: {score}</div>
        <div style={{ marginBottom: '20px', opacity: 0.7 }}>
          Status: {isRunning ? 'Running' : 'Stopped'}
        </div>
        <button
          onClick={() => setScore(score + 10)}
          disabled={!isRunning}
          style={{
            padding: '12px 24px',
            backgroundColor: isRunning ? '#4ecdc4' : '#666',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            cursor: isRunning ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          Add Score
        </button>
        <p style={{ marginTop: '20px', fontSize: '14px', opacity: 0.6, textAlign: 'center' }}>
          This game implements the GameLifecycle interface.
          <br />
          It will pause when the card becomes inactive.
        </p>
      </div>
    </GameLifecycleWrapper>
  );
}

function ExampleGame2() {
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const lifecycle = useGameLifecycle({
    onStart: () => {
      console.log('Game 2 started');
      setIsRunning(true);
    },
    onPause: () => {
      console.log('Game 2 paused');
      setIsRunning(false);
    },
    onReset: () => {
      console.log('Game 2 reset');
      setTimer(0);
      setIsRunning(false);
    },
  });

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev + 0.1);
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <GameLifecycleWrapper lifecycle={lifecycle}>
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
          padding: '20px',
        }}
      >
        <h2 style={{ marginBottom: '20px' }}>Game 2</h2>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>
          {timer.toFixed(1)}s
        </div>
        <div style={{ marginBottom: '20px', opacity: 0.7 }}>
          Status: {isRunning ? 'Running' : 'Stopped'}
        </div>
        <p style={{ fontSize: '14px', opacity: 0.6, textAlign: 'center' }}>
          Timer game that pauses when inactive.
        </p>
      </div>
    </GameLifecycleWrapper>
  );
}

function ExampleGame3() {
  const lifecycle = useGameLifecycle({
    onStart: () => console.log('Game 3 started'),
    onPause: () => console.log('Game 3 paused'),
    onReset: () => console.log('Game 3 reset'),
  });

  return (
    <GameLifecycleWrapper lifecycle={lifecycle}>
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
          padding: '20px',
        }}
      >
        <h2 style={{ marginBottom: '20px' }}>Game 3</h2>
        <p style={{ textAlign: 'center', opacity: 0.8 }}>
          Simple game that demonstrates the lifecycle interface.
          <br />
          Swipe to see it pause automatically.
        </p>
      </div>
    </GameLifecycleWrapper>
  );
}

export default function GameLifecycleExample() {
  const [activeIndex, setActiveIndex] = useState(0);

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
          Game Lifecycle Demo
        </h1>
        <p style={{ color: '#888' }}>
          Active Game: {activeIndex + 1} / 3
          <br />
          <span style={{ fontSize: '14px' }}>
            Games automatically pause when inactive. Check the console for lifecycle events.
          </span>
        </p>
      </div>

      <div style={{ width: '100%', height: 'calc(100% - 120px)', flex: 1 }}>
        <ArcadeCoverflow
          onActiveIndexChange={setActiveIndex}
          cardWidth={320}
          cardGap={24}
        >
          <div style={{ width: '100%', height: '500px' }}>
            <ExampleGame1 />
          </div>
          <div style={{ width: '100%', height: '500px' }}>
            <ExampleGame2 />
          </div>
          <div style={{ width: '100%', height: '500px' }}>
            <ExampleGame3 />
          </div>
        </ArcadeCoverflow>
      </div>
    </div>
  );
}

