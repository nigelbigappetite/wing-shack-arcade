'use client';

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface GameCabinetProps {
  title?: string;
  isActive: boolean;
  preview: React.ReactNode;
  game: React.ReactNode;
  className?: string;
}

const GameCabinet: React.FC<GameCabinetProps> = ({
  title,
  isActive,
  preview,
  game,
  className = '',
}) => {
  const gameRef = useRef<HTMLDivElement>(null);

  // Pause game when inactive
  useEffect(() => {
    if (!gameRef.current) return;

    if (!isActive) {
      // Find and pause all interactive elements
      const videos = gameRef.current.querySelectorAll('video');
      const canvases = gameRef.current.querySelectorAll('canvas');
      const iframes = gameRef.current.querySelectorAll('iframe');
      
      videos.forEach((video) => {
        video.pause();
      });

      // Pause canvas animations by finding requestAnimationFrame loops
      // This is handled by the game component itself typically
      
      // Pause iframe content (games in iframes)
      iframes.forEach((iframe) => {
        try {
          // Try to pause iframe content if accessible
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            const iframeVideos = iframeDoc.querySelectorAll('video');
            iframeVideos.forEach((video) => video.pause());
          }
        } catch (e) {
          // Cross-origin iframe, can't access
        }
      });
    } else {
      // Resume game when active
      const videos = gameRef.current.querySelectorAll('video');
      videos.forEach((video) => {
        video.play().catch(() => {
          // Autoplay may be blocked, ignore error
        });
      });
    }
  }, [isActive]);

  return (
    <div
      className={`game-cabinet ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#0a0a0a',
        borderRadius: '8px',
      }}
    >
      {title && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '12px 16px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 20,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <h3
            style={{
              color: '#fff',
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            {title}
          </h3>
        </div>
      )}

      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          pointerEvents: isActive ? 'auto' : 'none',
        }}
      >
        {/* Preview State */}
        <AnimatePresence mode="wait">
          {!isActive && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {preview}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Game State */}
        <AnimatePresence mode="wait">
          {isActive && (
            <motion.div
              key="game"
              ref={gameRef}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 2,
              }}
            >
              {game}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Overlay to prevent interaction when inactive */}
      {!isActive && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 10,
            pointerEvents: 'auto',
            cursor: 'pointer',
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default GameCabinet;

