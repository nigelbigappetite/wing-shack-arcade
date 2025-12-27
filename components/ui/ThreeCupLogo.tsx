'use client';

import React from 'react';
import { wingShackTheme } from '@/theme/wingShackTheme';

export interface ThreeCupLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Three Cup Game Logo Component
 * Displays three cups with a ball visible in the middle cup
 */
export const ThreeCupLogo: React.FC<ThreeCupLogoProps> = ({
  size = 'sm',
  className = '',
}) => {
  const sizes = {
    sm: { cupWidth: 20, cupHeight: 25, ballSize: 8, gap: 4 },
    md: { cupWidth: 30, cupHeight: 38, ballSize: 12, gap: 6 },
    lg: { cupWidth: 40, cupHeight: 50, ballSize: 16, gap: 8 },
  };

  const sizeConfig = sizes[size];

  return (
    <div
      className={`three-cup-logo ${className}`}
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: sizeConfig.gap,
        height: sizeConfig.cupHeight + sizeConfig.ballSize,
      }}
    >
      {/* Cup 1 */}
      <div
        style={{
          width: sizeConfig.cupWidth,
          height: sizeConfig.cupHeight,
          backgroundColor: wingShackTheme.colors.primary,
          borderRadius: '0 0 4px 4px',
          position: 'relative',
          boxShadow: `0 2px 6px rgba(0, 0, 0, 0.2)`,
          border: `2px solid ${wingShackTheme.colors.primaryDark}`,
        }}
      >
        {/* Cup rim */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '20%',
            backgroundColor: wingShackTheme.colors.primaryDark,
            borderRadius: '50% 50% 0 0',
          }}
        />
      </div>

      {/* Cup 2 - with ball */}
      <div
        style={{
          width: sizeConfig.cupWidth,
          height: sizeConfig.cupHeight,
          backgroundColor: wingShackTheme.colors.primary,
          borderRadius: '0 0 4px 4px',
          position: 'relative',
          boxShadow: `0 2px 6px rgba(0, 0, 0, 0.2)`,
          border: `2px solid ${wingShackTheme.colors.primaryDark}`,
        }}
      >
        {/* Cup rim */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '20%',
            backgroundColor: wingShackTheme.colors.primaryDark,
            borderRadius: '50% 50% 0 0',
          }}
        />
        {/* Ball */}
        <div
          style={{
            position: 'absolute',
            bottom: sizeConfig.cupHeight * 0.15,
            left: '50%',
            transform: 'translateX(-50%)',
            width: sizeConfig.ballSize,
            height: sizeConfig.ballSize,
            borderRadius: '50%',
            backgroundColor: wingShackTheme.colors.secondary,
            boxShadow: `0 2px 4px rgba(0, 0, 0, 0.3)`,
            border: `2px solid ${wingShackTheme.colors.secondaryLight}`,
          }}
        />
      </div>

      {/* Cup 3 */}
      <div
        style={{
          width: sizeConfig.cupWidth,
          height: sizeConfig.cupHeight,
          backgroundColor: wingShackTheme.colors.primary,
          borderRadius: '0 0 4px 4px',
          position: 'relative',
          boxShadow: `0 2px 6px rgba(0, 0, 0, 0.2)`,
          border: `2px solid ${wingShackTheme.colors.primaryDark}`,
        }}
      >
        {/* Cup rim */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '20%',
            backgroundColor: wingShackTheme.colors.primaryDark,
            borderRadius: '50% 50% 0 0',
          }}
        />
      </div>
    </div>
  );
};

export default ThreeCupLogo;


