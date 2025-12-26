# Wing Shack Game Tool

A collection of mobile-first arcade components built with Next.js, React, and Framer Motion.

## Components

### ArcadeCoverflow

A horizontal swipeable carousel component with smooth animations.

## Features

- ✅ Horizontal swipeable carousel
- ✅ One card always centered and "active"
- ✅ Active card: scale 1, no rotation, full opacity
- ✅ Adjacent cards: scale ~0.85, slight Y-axis rotation, reduced opacity
- ✅ Snap-to-center behavior
- ✅ Smooth spring animations
- ✅ Dark theme suitable for Wing Shack style
- ✅ Exposes activeIndex state via callback
- ✅ Automatically pauses inactive video cards

## Installation

```bash
npm install
```

## Usage

```tsx
import ArcadeCoverflow from '@/components/ArcadeCoverflow';

function MyComponent() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <ArcadeCoverflow
      onActiveIndexChange={setActiveIndex}
      cardWidth={280}
      cardGap={20}
    >
      <div>Card 1</div>
      <div>Card 2</div>
      <div>Card 3</div>
    </ArcadeCoverflow>
  );
}
```

## Props

- `children`: Array of React nodes (cards to display)
- `className?`: Optional CSS class name
- `onActiveIndexChange?`: Callback function that receives the active index
- `cardWidth?`: Width of each card in pixels (default: 280)
- `cardGap?`: Gap between cards in pixels (default: 20)

## Development

```bash
npm run dev
```

Visit `http://localhost:3000/example` to see the demo.

## Component Details

The component uses Framer Motion for smooth spring animations and reactive transforms. Each card's scale, rotation, and opacity are calculated based on its distance from the center, creating a smooth coverflow effect.

Videos within cards are automatically paused when the card becomes inactive and played when it becomes active.

### GameCabinet

A wrapper component that manages game state, showing a preview when inactive and the full game when active.

#### Features

- ✅ Animated transitions between preview and active states
- ✅ Automatically pauses games when inactive
- ✅ Prevents interaction when inactive
- ✅ Optional title display
- ✅ Smooth fade and scale animations

#### Usage

```tsx
import GameCabinet from '@/components/GameCabinet';

function MyComponent() {
  const [isActive, setIsActive] = useState(false);

  return (
    <GameCabinet
      title="My Game"
      isActive={isActive}
      preview={<div>Preview Content</div>}
      game={<div>Full Game Content</div>}
    />
  );
}
```

#### Props

- `title?`: Optional title displayed at the top of the cabinet
- `isActive`: Boolean indicating if the game should be active
- `preview`: ReactNode to display when inactive
- `game`: ReactNode to display when active
- `className?`: Optional CSS class name

#### Game Pausing

The component automatically pauses:
- Video elements
- Canvas animations (handled by game component)
- Iframe content (when accessible)

### GameShell

A reusable shell component that provides a consistent UI wrapper for games with built-in controls and state management.

#### Features

- ✅ Game title display
- ✅ Collapsible "How to play" section
- ✅ Start/Restart button
- ✅ Pause/Resume functionality
- ✅ Sound toggle
- ✅ Slot-based design (game content as children)
- ✅ Exposes `start()`, `reset()`, `pause()`, `resume()` methods via ref
- ✅ Mobile-first responsive layout
- ✅ Dark theme with subtle elevation
- ✅ Animated pause overlay

#### Usage

```tsx
import GameShell, { GameShellRef } from '@/components/GameShell';
import { useRef } from 'react';

function MyComponent() {
  const gameShellRef = useRef<GameShellRef>(null);

  return (
    <GameShell
      ref={gameShellRef}
      title="My Game"
      howToPlay="Click buttons to play. Try to get a high score!"
      onStart={() => console.log('Game started')}
      onReset={() => console.log('Game reset')}
      onPause={() => console.log('Game paused')}
      onResume={() => console.log('Game resumed')}
    >
      {/* Your game content here */}
      <YourGameComponent />
    </GameShell>
  );
}
```

#### Props

- `title`: Game title displayed in header
- `howToPlay`: Instructions text shown in collapsible panel
- `children`: Game content (ReactNode)
- `onStart?`: Callback when game starts
- `onReset?`: Callback when game resets
- `onPause?`: Callback when game pauses
- `onResume?`: Callback when game resumes
- `className?`: Optional CSS class name
- `initialSoundEnabled?`: Initial sound state (default: true)

#### Ref Methods

Access via `ref`:

```tsx
gameShellRef.current?.start();   // Start the game
gameShellRef.current?.reset();    // Reset the game
gameShellRef.current?.pause();    // Pause the game
gameShellRef.current?.resume();   // Resume the game
```

### Game Lifecycle System

A standardized interface and hooks for managing game state across the application.

#### GameLifecycle Interface

All games must implement the `GameLifecycle` interface:

```typescript
interface GameLifecycle {
  start: () => void;
  pause: () => void;
  reset: () => void;
}
```

#### useGameLifecycle Hook

Hook that manages game lifecycle state:

```tsx
import { useGameLifecycle } from '@/hooks/useGameLifecycle';

function MyGame() {
  const { start, pause, reset, isPlaying, isPaused } = useGameLifecycle({
    onStart: () => console.log('Started'),
    onPause: () => console.log('Paused'),
    onReset: () => console.log('Reset'),
  });

  return <div>Game content</div>;
}
```

#### GameLifecycleWrapper Component

Wrapper component that registers games with the lifecycle system:

```tsx
import GameLifecycleWrapper from '@/components/GameLifecycleWrapper';
import { useGameLifecycle } from '@/hooks/useGameLifecycle';

function MyGame() {
  const lifecycle = useGameLifecycle();
  
  return (
    <GameLifecycleWrapper lifecycle={lifecycle}>
      <div>Game content</div>
    </GameLifecycleWrapper>
  );
}
```

#### ArcadeCoverflow Integration

ArcadeCoverflow automatically pauses inactive games that implement the `GameLifecycle` interface. Games wrapped with `GameLifecycleWrapper` will be automatically paused when their card becomes inactive.

## Examples

Visit the following pages to see the components in action:

- `/example` - Arcade Coverflow demo
- `/game-cabinet-example` - Game Cabinet demo
- `/combined-example` - Combined Arcade Coverflow + Game Cabinet demo
- `/game-shell-example` - Game Shell demo
- `/game-lifecycle-example` - Game Lifecycle system demo

