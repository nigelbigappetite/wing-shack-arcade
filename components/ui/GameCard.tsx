'use client';

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { wingShackTheme } from '@/theme/wingShackTheme';

export interface GameCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  elevated?: boolean;
  glow?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

/**
 * Modern 3D-styled card component with Wing Shack branding
 */
export const GameCard: React.FC<GameCardProps> = ({
  children,
  className = '',
  hover = false,
  elevated = false,
  glow = false,
  onClick,
  style,
}) => {
  const baseStyle: React.CSSProperties = {
    ...style,
    position: 'relative',
    backgroundColor: wingShackTheme.colors.backgroundCard,
    borderRadius: wingShackTheme.borderRadius.lg,
    padding: wingShackTheme.spacing.lg,
    boxShadow: elevated
      ? `0 15px 50px rgba(159, 8, 8, 0.15), 0 5px 15px rgba(0, 0, 0, 0.1), 0 0 30px rgba(200, 88, 32, 0.1)`
      : glow
      ? `0 10px 40px rgba(159, 8, 8, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1), 0 0 20px rgba(200, 88, 32, 0.15)`
      : `0 10px 40px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05)`,
    border: `1px solid rgba(159, 8, 8, 0.1)`,
    overflow: 'hidden',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.3s ease',
  };

  if (hover) {
    return (
      <motion.div
        className={`game-card ${className}`}
        style={baseStyle}
        onClick={onClick}
        whileHover={{
          scale: 1.02,
          boxShadow: elevated
            ? `${wingShackTheme.shadows.cardElevated}, ${wingShackTheme.shadows.glowStrong}`
            : `${wingShackTheme.shadows.cardHover}, ${wingShackTheme.shadows.glow}`,
          y: -4,
        }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        {/* Glow overlay for egg white effect */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 248, 240, 0.2) 50%, transparent 100%)',
            pointerEvents: 'none',
            borderRadius: wingShackTheme.borderRadius.lg,
          }}
        />
        {children}
      </motion.div>
    );
  }

  return (
    <div className={`game-card ${className}`} style={baseStyle} onClick={onClick}>
      {/* Gradient overlay for depth */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '50%',
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />
      {children}
    </div>
  );
};

export default GameCard;

