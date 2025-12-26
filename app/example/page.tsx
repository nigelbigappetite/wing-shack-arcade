'use client';

import { useState } from 'react';
import ArcadeCoverflow from '@/components/ArcadeCoverflow';

export default function ArcadeCoverflowExample() {
  const [activeIndex, setActiveIndex] = useState(0);

  const cards = [
    {
      id: 1,
      title: 'Card 1',
      color: '#ff6b6b',
      content: 'First card content',
    },
    {
      id: 2,
      title: 'Card 2',
      color: '#4ecdc4',
      content: 'Second card content',
    },
    {
      id: 3,
      title: 'Card 3',
      color: '#45b7d1',
      content: 'Third card content',
    },
    {
      id: 4,
      title: 'Card 4',
      color: '#f9ca24',
      content: 'Fourth card content',
    },
    {
      id: 5,
      title: 'Card 5',
      color: '#6c5ce7',
      content: 'Fifth card content',
    },
  ];

  return (
    <div style={{ width: '100vw', height: '100vh', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h1 style={{ color: '#fff', marginBottom: '10px' }}>Arcade Coverflow Demo</h1>
        <p style={{ color: '#888' }}>Active Card: {activeIndex + 1} / {cards.length}</p>
      </div>
      
      <div style={{ width: '100%', height: 'calc(100% - 100px)' }}>
        <ArcadeCoverflow
          onActiveIndexChange={setActiveIndex}
          cardWidth={280}
          cardGap={20}
        >
          {cards.map((card) => (
            <div
              key={card.id}
              style={{
                width: '100%',
                height: '400px',
                backgroundColor: card.color,
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                border: '2px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <h2 style={{ color: '#fff', fontSize: '32px', marginBottom: '16px' }}>
                {card.title}
              </h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '18px' }}>
                {card.content}
              </p>
            </div>
          ))}
        </ArcadeCoverflow>
      </div>
    </div>
  );
}

