# Wing Shack Branding Guide

This guide explains how to customize the Wing Shack theme with your own fonts and logo.

## Custom Fonts

### Option 1: Google Fonts (Current Setup)

The theme currently uses Google Fonts:
- **Heading/Display**: Bebas Neue
- **Body**: Inter

These are loaded in `app/layout.tsx`. To change them:

1. Update the Google Fonts link in `app/layout.tsx`:
```tsx
<link
  href="https://fonts.googleapis.com/css2?family=YourFont&display=swap"
  rel="stylesheet"
/>
```

2. Update `theme/wingShackTheme.ts`:
```ts
fontFamily: {
  heading: "'YourFont', sans-serif",
  body: "'YourFont', sans-serif",
  display: "'YourFont', sans-serif",
}
```

### Option 2: Custom Font Files

1. Add your font files to `public/fonts/`:
   - `wing-shack-font.woff2`
   - `wing-shack-font.woff`
   - `wing-shack-font.ttf`

2. Add `@font-face` in `app/layout.tsx`:
```tsx
<style jsx global>{`
  @font-face {
    font-family: 'WingShack';
    src: url('/fonts/wing-shack-font.woff2') format('woff2'),
         url('/fonts/wing-shack-font.woff') format('woff'),
         url('/fonts/wing-shack-font.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
  }
`}</style>
```

3. Update the theme:
```ts
fontFamily: {
  heading: "'WingShack', sans-serif",
  body: "'WingShack', sans-serif",
  display: "'WingShack', sans-serif",
}
```

## Custom Logo

### Option 1: Replace Logo Component

1. Add your logo image to `public/logo.png` or `public/logo.svg`

2. Update `components/ui/WingShackLogo.tsx`:

Replace the logo div with:
```tsx
<img
  src="/logo.png"
  alt="Wing Shack"
  style={{
    width: sizeConfig.width,
    height: sizeConfig.height,
    objectFit: 'contain',
  }}
/>
```

### Option 2: Use SVG Logo

For better quality, use an SVG:

```tsx
<svg
  width={sizeConfig.width}
  height={sizeConfig.height}
  viewBox="0 0 100 100"
  style={{ fill: wingShackTheme.colors.primary }}
>
  {/* Your SVG paths here */}
</svg>
```

## Theme Colors

Customize colors in `theme/wingShackTheme.ts`:

```ts
colors: {
  primary: '#YOUR_COLOR',      // Main brand color
  secondary: '#YOUR_COLOR',    // Accent color
  background: '#YOUR_COLOR',    // Background
  // ... etc
}
```

## Usage Examples

### Using the Theme

```tsx
import { wingShackTheme } from '@/theme/wingShackTheme';

<div style={{
  color: wingShackTheme.colors.primary,
  fontFamily: wingShackTheme.typography.fontFamily.display,
  boxShadow: wingShackTheme.shadows.card,
}}>
  Content
</div>
```

### Using GameCard Component

```tsx
import GameCard from '@/components/ui/GameCard';

<GameCard elevated glow hover>
  <h2>Your Content</h2>
</GameCard>
```

### Using WingShackLogo

```tsx
import WingShackLogo from '@/components/ui/WingShackLogo';

<WingShackLogo size="lg" showText={true} />
```

## File Structure

```
wing shack game tool/
├── theme/
│   └── wingShackTheme.ts      # Theme configuration
├── components/
│   └── ui/
│       ├── GameCard.tsx       # 3D card component
│       └── WingShackLogo.tsx  # Logo component
├── public/
│   ├── fonts/                 # Custom font files (optional)
│   └── logo.png               # Logo image (optional)
└── app/
    └── layout.tsx             # Font loading
```

## Quick Start

1. **Add your logo**: Place `logo.png` in `public/` and update `WingShackLogo.tsx`
2. **Add your font**: Update Google Fonts link or add custom font files
3. **Customize colors**: Edit `wingShackTheme.ts`
4. **Use components**: Import and use `GameCard` and `WingShackLogo` in your pages

