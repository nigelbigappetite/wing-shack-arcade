/**
 * Wing Shack Brand Theme
 * Defines colors, typography, shadows, and styling for Wing Shack games
 */

export const wingShackTheme = {
  colors: {
    // Primary brand colors
    primary: '#9f0808', // Wing Shack dark red
    primaryDark: '#7d0606',
    primaryLight: '#c85820', // Orange
    
    // Secondary colors
    secondary: '#c85820', // Orange
    secondaryDark: '#a04518',
    secondaryLight: '#e06a30',
    
    // Accent colors
    accent: '#c85820', // Orange accent
    accentDark: '#a04518',
    accentLight: '#e06a30',
    
    // Background colors - Egg white with glow
    background: '#FFF8F0', // Egg white background
    backgroundElevated: '#FFFFFF',
    backgroundCard: '#FFFFFF',
    
    // Text colors
    text: '#9f0808', // Dark red for text on white background
    textSecondary: '#5a5a5a',
    textMuted: '#8a8a8a',
    
    // Status colors
    success: '#4ECDC4',
    warning: '#FFD93D',
    error: '#9f0808',
    info: '#c85820',
  },
  
  typography: {
    // Font families - Zing Rust fonts
    fontFamily: {
      heading: "'Zing Rust', 'Impact', 'Arial Black', sans-serif",
      body: "'Zing Rust Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      display: "'Zing Rust', 'Impact', 'Arial Black', sans-serif",
    },
    
    // Font sizes
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '3.75rem',
    },
    
    // Font weights
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
  },
  
  shadows: {
    // 3D card shadows
    card: '0 10px 40px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)',
    cardHover: '0 20px 60px rgba(0, 0, 0, 0.5), 0 4px 12px rgba(0, 0, 0, 0.3)',
    cardElevated: '0 15px 50px rgba(0, 0, 0, 0.5), 0 5px 15px rgba(0, 0, 0, 0.3)',
    
    // Glow effects
    glow: '0 0 20px rgba(159, 8, 8, 0.3)',
    glowStrong: '0 0 40px rgba(159, 8, 8, 0.5)',
    
    // Inner shadows for depth
    inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
    innerDeep: 'inset 0 4px 8px rgba(0, 0, 0, 0.4)',
  },
  
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },
  
  transitions: {
    fast: '0.15s ease',
    base: '0.3s ease',
    slow: '0.5s ease',
  },
};

export type WingShackTheme = typeof wingShackTheme;

