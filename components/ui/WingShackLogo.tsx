'use client';

import React from 'react';
import { wingShackTheme } from '@/theme/wingShackTheme';

export interface WingShackLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

/**
 * Wing Shack Logo Component
 * Can be replaced with an actual logo image by setting the logoPath prop
 */
export const WingShackLogo: React.FC<WingShackLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const sizes = {
    sm: { width: 40, height: 40, fontSize: '20px' },
    md: { width: 60, height: 60, fontSize: '28px' },
    lg: { width: 80, height: 80, fontSize: '36px' },
    xl: { width: 120, height: 120, fontSize: '48px' },
  };

  const sizeConfig = sizes[size];

  return (
    <div
      className={`wing-shack-logo ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: showText ? wingShackTheme.spacing.md : 0,
        margin: '0 auto',
      }}
    >
      {/* Logo Image */}
      <img
        src="/transparent Wing Shack logo 1080x1080.png"
        alt="Wing Shack"
        style={{
          width: sizeConfig.width,
          height: sizeConfig.height,
          objectFit: 'contain',
        }}
      />

      {/* Logo Text */}
      {showText && (
        <div
          style={{
            fontFamily: wingShackTheme.typography.fontFamily.display,
            fontSize: sizeConfig.fontSize,
            fontWeight: wingShackTheme.typography.fontWeight.bold,
            color: wingShackTheme.colors.text,
            letterSpacing: '2px',
            textShadow: `0 1px 2px rgba(0, 0, 0, 0.1)`,
          }}
        >
          WING SHACK
        </div>
      )}
    </div>
  );
};

/**
 * To use a custom logo image, replace the logo div with:
 * 
 * <img
 *   src="/path/to/logo.png"
 *   alt="Wing Shack"
 *   style={{
 *     width: sizeConfig.width,
 *     height: sizeConfig.height,
 *     objectFit: 'contain',
 *   }}
 * />
 */

export default WingShackLogo;

