'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform, PanInfo, MotionValue } from 'framer-motion';
import { GameLifecycle } from '@/types/game-lifecycle';
import { wingShackTheme } from '@/theme/wingShackTheme';

export interface ArcadeCoverflowProps {
  children: React.ReactNode[];
  className?: string;
  onActiveIndexChange?: (index: number) => void;
  cardWidth?: number;
  cardGap?: number;
}

// Individual card component with reactive transforms
const CoverflowCard: React.FC<{
  index: number;
  isActive: boolean;
  cardWidth: number;
  cardGap: number;
  totalCards: number;
  xSpring: MotionValue<number>;
  containerWidth: number;
  children: React.ReactNode;
}> = ({ index, isActive, cardWidth, cardGap, totalCards, xSpring, containerWidth, children }) => {
  const cardSpacing = cardWidth + cardGap;
  const cardCenterX = index * cardSpacing + cardWidth / 2;
  const centerX = containerWidth / 2;

  // Create reactive transforms
  const centerXTransform = useTransform(xSpring, (latest) => {
    return centerX - latest;
  });

  const distanceFromCenter = useTransform(centerXTransform, (center) => {
    return Math.abs(cardCenterX - center);
  });

  const scale = useTransform(distanceFromCenter, (distance) => {
    const maxDistance = cardSpacing * 2;
    return Math.max(0.85, 1 - (distance / maxDistance) * 0.15);
  });

  const rotationY = useTransform(centerXTransform, (center) => {
    const distance = Math.abs(cardCenterX - center);
    if (distance <= cardSpacing / 2) return 0;
    const maxDistance = cardSpacing * 2;
    const scaleValue = Math.max(0.85, 1 - (distance / maxDistance) * 0.15);
    const direction = cardCenterX < center ? 15 : -15;
    return direction * (1 - scaleValue) / 0.15;
  });

  const opacity = useTransform(scale, (scaleValue) => {
    return Math.max(0.6, scaleValue);
  });

  return (
    <motion.div
      style={{
        width: `${cardWidth}px`,
        marginRight: index < totalCards - 1 ? `${cardGap}px` : 0,
        transformStyle: 'preserve-3d',
        perspective: '1000px',
        scale,
        rotateY: rotationY,
        opacity,
        zIndex: isActive ? 10 : 1,
        borderRadius: wingShackTheme.borderRadius.xl,
        overflow: 'hidden',
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 40,
        mass: 0.8,
      }}
    >
      <CardWrapper isActive={isActive}>{children}</CardWrapper>
    </motion.div>
  );
};

// Wrapper component to handle auto-pause for inactive cards
const CardWrapper: React.FC<{ children: React.ReactNode; isActive: boolean }> = ({
  children,
  isActive,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Control game lifecycle based on active state
  useEffect(() => {
    if (!wrapperRef.current) return;

    // Find all game lifecycle instances in this card
    const gameElements = wrapperRef.current.querySelectorAll('[data-game-lifecycle]');
    const lifecycles: GameLifecycle[] = [];

    gameElements.forEach((element) => {
      // Get lifecycle from element's custom property
      const customElement = element as HTMLElement & { __gameLifecycle?: GameLifecycle };
      if (customElement.__gameLifecycle) {
        lifecycles.push(customElement.__gameLifecycle);
      }
    });

    // Control games based on active state
    lifecycles.forEach((lifecycle) => {
      if (isActive) {
        lifecycle.start();
      } else {
        lifecycle.pause();
      }
    });

    // Also handle videos (backward compatibility)
    const videos = wrapperRef.current.querySelectorAll('video');
    videos.forEach((video) => {
      if (isActive) {
        video.play().catch(() => {
          // Autoplay may be blocked, ignore error
        });
      } else {
        video.pause();
      }
    });
  }, [isActive]);

  return (
    <div ref={wrapperRef} style={{ width: '100%', height: '100%' }}>
      {children}
    </div>
  );
};

const ArcadeCoverflow: React.FC<ArcadeCoverflowProps> = ({
  children,
  className = '',
  onActiveIndexChange,
  cardWidth = 280,
  cardGap = 20,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const springConfig = { stiffness: 400, damping: 40, mass: 0.8 };
  const xSpring = useSpring(x, springConfig);

  const totalCards = children.length;
  const cardSpacing = cardWidth + cardGap;

  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Calculate the center position
  const getCenterX = useCallback(() => {
    return containerWidth / 2;
  }, [containerWidth]);

  // Calculate the target X position for a given index
  const getXForIndex = useCallback(
    (index: number) => {
      const centerX = getCenterX();
      return centerX - (index * cardSpacing + cardWidth / 2);
    },
    [getCenterX, cardSpacing, cardWidth]
  );

  // Update active index when position changes
  useEffect(() => {
    if (!containerWidth || totalCards === 0) return;

    const unsubscribe = xSpring.on('change', (latest) => {
      if (isDragging) return;

      const centerX = getCenterX();
      const currentCenter = centerX - latest;
      const closestIndex = Math.round(currentCenter / cardSpacing);
      const clampedIndex = Math.max(0, Math.min(closestIndex, totalCards - 1));

      if (clampedIndex !== activeIndex) {
        setActiveIndex(clampedIndex);
        onActiveIndexChange?.(clampedIndex);
      }
    });

    return () => unsubscribe();
  }, [xSpring, isDragging, getCenterX, cardSpacing, totalCards, activeIndex, onActiveIndexChange, containerWidth]);

  // Snap to center on mount and when activeIndex changes
  useEffect(() => {
    if (!isDragging && containerWidth > 0) {
      const targetX = getXForIndex(activeIndex);
      x.set(targetX);
    }
  }, [activeIndex, getXForIndex, x, isDragging, containerWidth]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    // Mark container as dragging to prevent link clicks
    if (containerRef.current) {
      (containerRef.current as any).__isDragging = true;
    }
  }, []);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsDragging(false);
      // Clear dragging flag after a short delay to allow click through
      setTimeout(() => {
        if (containerRef.current) {
          (containerRef.current as any).__isDragging = false;
        }
      }, 100);

      if (!containerWidth) return;

      const centerX = getCenterX();
      const currentX = x.get();
      const currentCenter = centerX - currentX;
      const velocity = info.velocity.x;

      // Calculate target index based on position and velocity
      let targetIndex = Math.round(currentCenter / cardSpacing);

      // Apply velocity threshold for swipe detection (lower for mobile)
      if (Math.abs(velocity) > 200) {
        const direction = velocity > 0 ? -1 : 1;
        targetIndex = activeIndex + direction;
      }

      // Clamp to valid range
      targetIndex = Math.max(0, Math.min(targetIndex, totalCards - 1));

      setActiveIndex(targetIndex);
      onActiveIndexChange?.(targetIndex);

      // Animate to target position
      const targetX = getXForIndex(targetIndex);
      x.set(targetX);
    },
    [getCenterX, x, activeIndex, cardSpacing, totalCards, getXForIndex, onActiveIndexChange, containerWidth]
  );

  return (
    <div
      className={`arcade-coverflow-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        touchAction: 'pan-x',
        WebkitOverflowScrolling: 'touch',
        borderRadius: wingShackTheme.borderRadius.xl,
      }}
      ref={containerRef}
    >
      <motion.div
        style={{
          display: 'flex',
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          x: xSpring,
          cursor: isDragging ? 'grabbing' : 'grab',
          height: '100%',
          alignItems: 'center',
        }}
        drag="x"
        dragConstraints={{ left: -Infinity, right: Infinity }}
        dragElastic={0.3}
        dragMomentum={true}
        dragPropagation={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        whileDrag={{ cursor: 'grabbing' }}
        style={{ touchAction: 'pan-x' }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 40,
          mass: 0.8,
        }}
      >
        {React.Children.map(children, (child, index) => {
          const isActive = index === activeIndex;

          return (
            <CoverflowCard
              key={index}
              index={index}
              isActive={isActive}
              cardWidth={cardWidth}
              cardGap={cardGap}
              totalCards={totalCards}
              xSpring={xSpring}
              containerWidth={containerWidth}
            >
              {child}
            </CoverflowCard>
          );
        })}
      </motion.div>
    </div>
  );
};

export default ArcadeCoverflow;
