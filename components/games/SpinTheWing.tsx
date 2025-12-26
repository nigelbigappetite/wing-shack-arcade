'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameLifecycle } from '@/hooks/useGameLifecycle';
import GameLifecycleWrapper from '@/components/GameLifecycleWrapper';
import { wingShackTheme } from '@/theme/wingShackTheme';

interface WheelSegment {
  id: string;
  label: string;
  color: string;
  value: number;
}

const DEFAULT_SEGMENTS: WheelSegment[] = [
  { id: '1', label: 'Lose', color: '#95a5a6', value: 0 },
  { id: '2', label: '10% Off Sauce Pack', color: '#f39100', value: 2 },
  { id: '3', label: 'Lose', color: '#95a5a6', value: 0 },
  { id: '4', label: '25% Off Food', color: '#82bd61', value: 4 },
  { id: '5', label: 'Lose', color: '#95a5a6', value: 0 },
  { id: '6', label: '6 Free Wings', color: '#fff7d0', value: 6 },
];

interface SpinTheWingProps {
  segments?: WheelSegment[];
  onWin?: (segment: WheelSegment) => void;
  gameRef?: React.ForwardedRef<{ reset: () => void }>;
}

const SpinTheWing: React.FC<SpinTheWingProps> = ({
  segments = DEFAULT_SEGMENTS,
  onWin,
  gameRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [winningSegment, setWinningSegment] = useState<WheelSegment | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);
  const [showLoserAnimation, setShowLoserAnimation] = useState(false);

  // Physics state
  const rotationRef = useRef(0); // Current rotation in radians
  const velocityRef = useRef(0); // Angular velocity
  const targetRotationRef = useRef(0); // Target rotation for outcome
  const nearMissRef = useRef(false);

  // Responsive sizing for mobile
  const [canvasSize, setCanvasSize] = useState(400);

  // Draw the wheel
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ensure canvas is properly sized
    if (canvas.width !== canvasSize || canvas.height !== canvasSize) {
      canvas.width = canvasSize;
      canvas.height = canvasSize;
    }

    // Calculate center and radius based on actual canvas size
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width * 0.45, (canvas.width - 20) / 2);

    // Clear canvas completely
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate segment angle - ensure it's evenly distributed
    const segmentAngle = (2 * Math.PI) / segments.length;

    // Draw segments - evenly distributed around the FULL circle (360 degrees)
    segments.forEach((segment, index) => {
      // Calculate angles for this segment - evenly spaced starting from top (-90 degrees)
      // Each segment gets exactly segmentAngle radians
      const startAngle = (index * segmentAngle) - (Math.PI / 2);
      const endAngle = ((index + 1) * segmentAngle) - (Math.PI / 2);

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotationRef.current);

      // Draw segment arc - ensure it draws the full segment
      ctx.beginPath();
      ctx.moveTo(0, 0);
      // Draw arc from startAngle to endAngle (counterclockwise)
      // Use false for counterclockwise to ensure proper arc drawing
      ctx.arc(0, 0, radius, startAngle, endAngle, false);
      ctx.lineTo(0, 0); // Close the path back to center
      ctx.closePath();
      ctx.fillStyle = segment.color;
      ctx.fill();
      
      // Draw border for this segment
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle, false);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Draw text - ensure ALL segments show text clearly
      ctx.save();
      
      // Calculate the middle angle of this segment
      const middleAngle = (startAngle + endAngle) / 2;
      
      // Rotate to align with segment
      ctx.rotate(middleAngle);
      
      // Normalize angle to determine if text should be flipped
      let normalizedMiddleAngle = middleAngle;
      while (normalizedMiddleAngle < 0) normalizedMiddleAngle += 2 * Math.PI;
      while (normalizedMiddleAngle >= 2 * Math.PI) normalizedMiddleAngle -= 2 * Math.PI;
      
      // Flip text if it's in the bottom half (between 90° and 270°)
      const isInBottomHalf = normalizedMiddleAngle > Math.PI / 2 && normalizedMiddleAngle < (3 * Math.PI) / 2;
      if (isInBottomHalf) {
        ctx.rotate(Math.PI); // Flip 180 degrees
      }
      
      // Font size optimized for 60-degree segments
      const fontSize = Math.max(16, Math.min(24, radius * 0.09));
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Position text at 65% of radius - good visibility
      const textRadius = radius * 0.65;
      
      // Prepare text
      const words = segment.label.split(' ');
      const labelUpper = segment.label.toUpperCase();
      
      // Determine if this is a grey "Lose" segment - use white text for better contrast
      const isGreyLose = segment.color === '#95a5a6';
      
      if (isGreyLose) {
        // White text with black shadow for grey segments
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      } else {
        // Black text with soft white shadow for colored segments
        ctx.fillStyle = '#000000';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }
      
      // Simple text rendering - always show the label
      if (words.length === 1) {
        // Single word - center it (like "LOSE")
        ctx.fillText(labelUpper, textRadius, 0);
      } else if (words.length === 2) {
        // Two words - split into two lines
        ctx.fillText(words[0].toUpperCase(), textRadius, -fontSize * 0.5);
        ctx.fillText(words[1].toUpperCase(), textRadius, fontSize * 0.5);
      } else {
        // Multiple words - split intelligently
        const midPoint = Math.ceil(words.length / 2);
        const line1 = words.slice(0, midPoint).join(' ').toUpperCase();
        const line2 = words.slice(midPoint).join(' ').toUpperCase();
        const lineSpacing = fontSize * 1.2;
        ctx.fillText(line1, textRadius, -lineSpacing * 0.3);
        ctx.fillText(line2, textRadius, lineSpacing * 0.7);
      }
      
      ctx.restore();
      
      ctx.restore();

      ctx.restore();
    });

    // Draw center circle with clean modern design
    ctx.save();
    ctx.translate(centerX, centerY);
    const centerRadius = canvasSize * 0.12; // Larger center circle
    
    // Outer ring
    ctx.beginPath();
    ctx.arc(0, 0, centerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = wingShackTheme.colors.primary;
    ctx.lineWidth = 5;
    ctx.stroke();
    
    // Inner circle with gradient
    const innerRadius = centerRadius * 0.7;
    const centerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, innerRadius);
    centerGradient.addColorStop(0, '#ffffff');
    centerGradient.addColorStop(1, wingShackTheme.colors.primary);
    ctx.beginPath();
    ctx.arc(0, 0, innerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = centerGradient;
    ctx.fill();
    
    // Center text - clean and bold
    ctx.fillStyle = '#ffffff';
    const centerFontSize = Math.max(14, Math.min(18, canvasSize * 0.045));
    ctx.font = `bold ${centerFontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = wingShackTheme.colors.primary;
    ctx.lineWidth = 2;
    ctx.strokeText('SPIN', 0, -centerFontSize * 0.35);
    ctx.strokeText('HERE', 0, centerFontSize * 0.65);
    ctx.fillText('SPIN', 0, -centerFontSize * 0.35);
    ctx.fillText('HERE', 0, centerFontSize * 0.65);
    ctx.restore();
  }, [segments, canvasSize]);

  const resetGame = useCallback(() => {
    setIsSpinning(false);
    setHasSpun(false);
    setWinningSegment(null);
    setShowResult(false);
    setShowFireworks(false);
    setShowLoserAnimation(false);
    rotationRef.current = 0;
    velocityRef.current = 0;
    targetRotationRef.current = 0;
    nearMissRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    drawWheel();
  }, [drawWheel]);

  const lifecycle = useGameLifecycle({
    onReset: resetGame,
    onPause: () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    },
  });

  // Expose reset via ref if provided
  React.useImperativeHandle(gameRef, () => ({
    reset: resetGame,
  }), [resetGame]);

  // Calculate which segment is under the pointer
  const getSegmentAtPointer = useCallback((): WheelSegment | null => {
    const segmentAngle = (2 * Math.PI) / segments.length;
    // Pointer is at top (12 o'clock)
    // Account for rotation
    let angle = -rotationRef.current + Math.PI / 2;
    // Normalize to 0-2π
    angle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    
    const segmentIndex = Math.floor(angle / segmentAngle);
    return segments[segmentIndex] || null;
  }, [segments]);

  // Check for near-miss
  const checkNearMiss = useCallback((): boolean => {
    const segmentAngle = (2 * Math.PI) / segments.length;
    const pointerAngle = -rotationRef.current + Math.PI / 2;
    const normalizedAngle = ((pointerAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const segmentIndex = Math.floor(normalizedAngle / segmentAngle);
    const segmentStart = segmentIndex * segmentAngle;
    const distance = Math.abs(normalizedAngle - segmentStart);
    
    // Near-miss if within 5 degrees of segment boundary
    const nearMissThreshold = (5 * Math.PI) / 180;
    return distance < nearMissThreshold || distance > segmentAngle - nearMissThreshold;
  }, [segments]);

  // Animation loop
  const animate = useCallback(() => {
    if (!isSpinning && velocityRef.current === 0) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    // Update rotation
    rotationRef.current += velocityRef.current;

    // Apply deceleration
    velocityRef.current *= 0.98; // Friction coefficient

    // Check if spinning is complete
    if (velocityRef.current < 0.001 && isSpinning) {
      velocityRef.current = 0;
      setIsSpinning(false);

      // Snap to target if we have one
      if (targetRotationRef.current !== 0) {
        rotationRef.current = targetRotationRef.current;
      }

      // Determine winning segment
      const winner = getSegmentAtPointer();
      if (winner) {
        setWinningSegment(winner);
        setShowResult(true);
        
        // Show appropriate animation based on result
        if (winner.label.toLowerCase() === 'lose') {
          setShowLoserAnimation(true);
          setTimeout(() => setShowLoserAnimation(false), 3000);
        } else {
          setShowFireworks(true);
          setTimeout(() => setShowFireworks(false), 4000);
        }
        
        onWin?.(winner);
      }

      // Check for near-miss
      nearMissRef.current = checkNearMiss();
    } else {
      // Check near-miss during spin
      nearMissRef.current = checkNearMiss();
    }

    drawWheel();

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [isSpinning, drawWheel, getSegmentAtPointer, checkNearMiss, onWin]);

  // Start spinning
  const handleSpin = useCallback(() => {
    if (isSpinning || hasSpun) return;

    setIsSpinning(true);
    setHasSpun(true);
    setShowResult(false);
    setWinningSegment(null);
    nearMissRef.current = false;

    // Randomize outcome
    const segmentAngle = (2 * Math.PI) / segments.length;
    const randomSegment = Math.floor(Math.random() * segments.length);
    const targetSegmentAngle = randomSegment * segmentAngle - Math.PI / 2;
    
    // Calculate target rotation (multiple full rotations + target angle)
    const fullRotations = 5 + Math.random() * 3; // 5-8 full rotations
    targetRotationRef.current = fullRotations * 2 * Math.PI - targetSegmentAngle;

    // Set initial velocity based on target
    const distance = targetRotationRef.current - rotationRef.current;
    velocityRef.current = distance * 0.02; // Adjust multiplier for spin speed

    // Start animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [isSpinning, hasSpun, segments, animate]);

  // Responsive canvas sizing
  useEffect(() => {
    const updateCanvasSize = () => {
      const maxSize = Math.min(window.innerWidth - 80, 400); // Responsive with padding
      const minSize = 280; // Minimum for older phones
      const size = Math.max(minSize, maxSize);
      setCanvasSize(size);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvasSize;
    canvas.height = canvasSize;
    drawWheel();
  }, [drawWheel, canvasSize]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Check if result is a win or lose
  const isWin = winningSegment && winningSegment.label.toLowerCase() !== 'lose';

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
          padding: 'clamp(12px, 3vw, 20px)',
          gap: 'clamp(12px, 3vw, 20px)',
          backgroundColor: '#ffffff',
          minHeight: '100%',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Fireworks Animation */}
        <AnimatePresence>
          {showFireworks && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                zIndex: 1000,
              }}
            >
              {/* Multiple firework particles */}
              {[...Array(30)].map((_, i) => {
                const angle = (i / 30) * Math.PI * 2;
                const distance = 150 + Math.random() * 100;
                const delay = Math.random() * 0.5;
                const duration = 1.5 + Math.random() * 0.5;
                
                return (
                  <motion.div
                    key={i}
                    initial={{
                      x: '50%',
                      y: '50%',
                      scale: 0,
                      opacity: 1,
                    }}
                    animate={{
                      x: `calc(50% + ${Math.cos(angle) * distance}px)`,
                      y: `calc(50% + ${Math.sin(angle) * distance}px)`,
                      scale: [0, 1.5, 0],
                      opacity: [1, 1, 0],
                    }}
                    transition={{
                      delay,
                      duration,
                      ease: 'easeOut',
                    }}
                    style={{
                      position: 'absolute',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: [
                        wingShackTheme.colors.primary,
                        wingShackTheme.colors.secondary,
                        '#ffd700',
                        '#ff6b6b',
                        '#4ecdc4',
                      ][i % 5],
                      boxShadow: `0 0 20px ${[
                        wingShackTheme.colors.primary,
                        wingShackTheme.colors.secondary,
                        '#ffd700',
                        '#ff6b6b',
                        '#4ecdc4',
                      ][i % 5]}`,
                    }}
                  />
                );
              })}
              
              {/* Chicken emoji celebration */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ 
                  scale: [0, 1.5, 1],
                  rotate: [0, 360],
                  y: [0, -50, 0],
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ 
                  duration: 1,
                  ease: 'easeOut',
                }}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: 'clamp(80px, 15vw, 120px)',
                  filter: 'drop-shadow(0 10px 30px rgba(0, 0, 0, 0.3))',
                }}
              >
                🐔
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loser Animation */}
        <AnimatePresence>
          {showLoserAnimation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Sad chicken animation */}
              <motion.div
                initial={{ scale: 0, rotate: 0 }}
                animate={{ 
                  scale: [0, 1.2, 1],
                  rotate: [0, -10, 10, -10, 0],
                  y: [0, 20, 0],
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ 
                  duration: 1.5,
                  ease: 'easeOut',
                }}
                style={{
                  fontSize: 'clamp(100px, 20vw, 150px)',
                  filter: 'drop-shadow(0 10px 30px rgba(0, 0, 0, 0.3))',
                  transform: 'scaleX(-1)', // Flip horizontally for sad effect
                }}
              >
                😢
              </motion.div>
              
              {/* Fade overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: '#000',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        {/* Wheel Container with Enhanced UI */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {/* Interactive Wheel Canvas */}
          <div style={{ position: 'relative' }}>
            {/* Outer glow ring */}
            <div
              style={{
                position: 'absolute',
                top: '-8px',
                left: '-8px',
                right: '-8px',
                bottom: '-8px',
                borderRadius: '50%',
                background: isSpinning
                  ? `conic-gradient(from 0deg, ${wingShackTheme.colors.primary}40, ${wingShackTheme.colors.secondary}40, ${wingShackTheme.colors.primary}40)`
                  : 'transparent',
                animation: isSpinning ? 'spin 2s linear infinite' : 'none',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
            
            <canvas
              ref={canvasRef}
              style={{
                position: 'relative',
                zIndex: 2,
                width: `${canvasSize}px`,
                height: `${canvasSize}px`,
                maxWidth: '100%',
                maxHeight: '100%',
                border: `4px solid ${wingShackTheme.colors.primary}`,
                borderRadius: '50%',
                boxShadow: isSpinning
                  ? `0 0 30px ${wingShackTheme.colors.primary}60, 0 10px 40px rgba(159, 8, 8, 0.3)`
                  : `0 10px 40px rgba(159, 8, 8, 0.2), 0 0 20px ${wingShackTheme.colors.secondary}30`,
                cursor: isSpinning || hasSpun ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                transform: isSpinning ? 'scale(1.02)' : 'scale(1)',
                touchAction: 'none', // Prevent scrolling on touch
              }}
              onClick={handleSpin}
              onTouchStart={(e) => {
                e.preventDefault();
                if (!isSpinning && !hasSpun) {
                  handleSpin();
                }
              }}
              onMouseEnter={(e) => {
                if (!isSpinning && !hasSpun) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = `0 15px 50px rgba(159, 8, 8, 0.4), 0 0 30px ${wingShackTheme.colors.secondary}50`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSpinning && !hasSpun) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = `0 10px 40px rgba(159, 8, 8, 0.2), 0 0 20px ${wingShackTheme.colors.secondary}30`;
                }
              }}
            />
            
            {/* Pointer with enhanced styling - responsive */}
            <div
              style={{
                position: 'absolute',
                top: `-${Math.max(24, canvasSize * 0.075)}px`,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: `${Math.max(16, canvasSize * 0.05)}px solid transparent`,
                borderRight: `${Math.max(16, canvasSize * 0.05)}px solid transparent`,
                borderTop: `${Math.max(24, canvasSize * 0.075)}px solid ${wingShackTheme.colors.primary}`,
                filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
                zIndex: 3,
              }}
            />
            
            {/* Near-miss indicator with animation */}
            {nearMissRef.current && !isSpinning && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5 }}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: wingShackTheme.colors.secondary,
                  padding: 'clamp(8px, 2vw, 12px) clamp(16px, 4vw, 24px)',
                  borderRadius: wingShackTheme.borderRadius.md,
                  color: '#000',
                  fontWeight: 'bold',
                  fontSize: 'clamp(14px, 3vw, 16px)',
                  pointerEvents: 'none',
                  zIndex: 10,
                  boxShadow: `0 4px 20px ${wingShackTheme.colors.secondary}60`,
                  border: `2px solid ${wingShackTheme.colors.primary}`,
                }}
              >
                So Close! 🎯
              </motion.div>
            )}
          </div>

          {/* Spin Button - Enhanced */}
          {!hasSpun && !isSpinning && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSpin}
              style={{
                padding: 'clamp(12px, 3vw, 16px) clamp(32px, 8vw, 48px)',
                backgroundColor: wingShackTheme.colors.primary,
                color: '#ffffff',
                border: 'none',
                borderRadius: wingShackTheme.borderRadius.lg,
                fontFamily: wingShackTheme.typography.fontFamily.display,
                fontSize: 'clamp(18px, 4vw, 24px)',
                fontWeight: wingShackTheme.typography.fontWeight.bold,
                letterSpacing: '2px',
                cursor: 'pointer',
                boxShadow: `0 8px 24px ${wingShackTheme.colors.primary}50, 0 0 20px ${wingShackTheme.colors.secondary}40`,
                transition: 'all 0.3s ease',
                minWidth: '200px',
                width: '100%',
                maxWidth: '300px',
              }}
            >
              SPIN NOW!
            </motion.button>
          )}
        </div>

        {/* Result Display - Enhanced */}
        {showResult && winningSegment && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            style={{
              padding: '32px 48px',
              backgroundColor: isWin ? winningSegment.color : '#95a5a6',
              borderRadius: wingShackTheme.borderRadius.xl,
              textAlign: 'center',
              boxShadow: isWin 
                ? `0 12px 40px ${winningSegment.color}60, 0 0 30px ${winningSegment.color}40`
                : `0 12px 40px rgba(149, 165, 166, 0.4)`,
              border: `3px solid ${wingShackTheme.colors.primary}`,
              maxWidth: '400px',
            }}
          >
            {isWin ? (
              <>
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                  style={{ fontSize: '48px', marginBottom: '12px' }}
                >
                  🎉
                </motion.div>
                <h2
                  style={{
                    margin: 0,
                    color: '#000',
                    fontSize: 'clamp(20px, 5vw, 28px)',
                    marginBottom: '12px',
                    fontFamily: wingShackTheme.typography.fontFamily.display,
                    letterSpacing: '2px',
                  }}
                >
                  YOU WON!
                </h2>
                <p
                  style={{
                    margin: 0,
                    color: '#000',
                    fontSize: 'clamp(18px, 4vw, 24px)',
                    fontWeight: 'bold',
                    fontFamily: wingShackTheme.typography.fontFamily.display,
                  }}
                >
                  {winningSegment.label}
                </p>
              </>
            ) : (
              <>
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                  style={{ fontSize: '48px', marginBottom: '12px' }}
                >
                  😢
                </motion.div>
                <h2
                  style={{
                    margin: 0,
                    color: '#000',
                    fontSize: 'clamp(20px, 5vw, 28px)',
                    marginBottom: '12px',
                    fontFamily: wingShackTheme.typography.fontFamily.display,
                    letterSpacing: '2px',
                  }}
                >
                  BETTER LUCK NEXT TIME!
                </h2>
                <p
                  style={{
                    margin: 0,
                    color: '#000',
                    fontSize: 'clamp(18px, 4vw, 24px)',
                    fontWeight: 'bold',
                    fontFamily: wingShackTheme.typography.fontFamily.display,
                  }}
                >
                  {winningSegment.label}
                </p>
              </>
            )}
          </motion.div>
        )}

        {/* Status Messages - Enhanced */}
        {!hasSpun && !isSpinning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              textAlign: 'center',
              padding: 'clamp(8px, 2vw, 12px) clamp(16px, 4vw, 24px)',
              backgroundColor: wingShackTheme.colors.backgroundCard,
              borderRadius: wingShackTheme.borderRadius.md,
              border: `1px solid ${wingShackTheme.colors.primary}30`,
              width: '100%',
              maxWidth: '400px',
            }}
          >
            <p
              style={{
                color: wingShackTheme.colors.text,
                fontSize: 'clamp(14px, 3vw, 18px)',
                margin: 0,
                fontFamily: wingShackTheme.typography.fontFamily.body,
                fontWeight: wingShackTheme.typography.fontWeight.medium,
              }}
            >
              Tap the wheel or button to spin!
            </p>
          </motion.div>
        )}

        {hasSpun && !isSpinning && !showResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              textAlign: 'center',
              padding: 'clamp(8px, 2vw, 12px) clamp(16px, 4vw, 24px)',
              backgroundColor: wingShackTheme.colors.backgroundCard,
              borderRadius: wingShackTheme.borderRadius.md,
              border: `1px solid ${wingShackTheme.colors.textSecondary}30`,
              width: '100%',
              maxWidth: '400px',
            }}
          >
            <p
              style={{
                color: wingShackTheme.colors.textSecondary,
                fontSize: 'clamp(12px, 2.5vw, 16px)',
                margin: 0,
                fontFamily: wingShackTheme.typography.fontFamily.body,
              }}
            >
              Use the reset button to spin again
            </p>
          </motion.div>
        )}

        {isSpinning && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{
              textAlign: 'center',
              padding: 'clamp(8px, 2vw, 12px) clamp(16px, 4vw, 24px)',
              backgroundColor: wingShackTheme.colors.primary,
              borderRadius: wingShackTheme.borderRadius.md,
              width: '100%',
              maxWidth: '400px',
            }}
          >
            <p
              style={{
                color: '#ffffff',
                fontSize: 'clamp(16px, 3.5vw, 20px)',
                margin: 0,
                fontFamily: wingShackTheme.typography.fontFamily.display,
                fontWeight: wingShackTheme.typography.fontWeight.bold,
                letterSpacing: '2px',
              }}
            >
              SPINNING...
            </p>
          </motion.div>
        )}
      </div>
    </GameLifecycleWrapper>
  );
};

export default SpinTheWing;

