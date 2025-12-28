'use client';

import Link from 'next/link';
import Image from 'next/image';
import { wingShackTheme } from '@/theme/wingShackTheme';
import WingShackLogo from '@/components/ui/WingShackLogo';
import GameCard from '@/components/ui/GameCard';
import ThreeCupLogo from '@/components/ui/ThreeCupLogo';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Game {
  id: string;
  title: string;
  description: string;
  href: string;
  color: string;
  icon: string;
  category?: string;
}

const games: Game[] = [
  {
    id: 'three-cup',
    title: 'Three Cup Game',
    description: 'Follow the cup and find the ball!',
    href: '/three-cup',
    color: wingShackTheme.colors.primary,
    icon: 'three-cup-logo',
    category: 'Arcade',
  },
  {
    id: 'wing-tap-frenzy',
    title: 'Wing Tap Frenzy',
    description: 'Tap as many wings as you can in 10 seconds!',
    href: '/wing-tap-frenzy',
    color: wingShackTheme.colors.secondary,
    icon: '🍗',
    category: 'Arcade',
  },
  {
    id: 'sauce-simon',
    title: 'SAUCE SIMON',
    description: 'MEMORISE THE SAUCE SEQUENCE',
    href: '/sauce-simon',
    color: '#FF6B35',
    icon: 'sauce-simon',
    category: 'Arcade',
  },
  {
    id: 'snake',
    title: 'SNAKE',
    description: 'EAT THE WINGS. DON\'T CRASH.',
    href: '/snake',
    color: '#28a745',
    icon: '🐍',
    category: 'Arcade',
  },
  {
    id: 'flappy-wing',
    title: 'FLAPPY WING',
    description: 'TAP TO FLY. DON\'T CLIP THE PIPES.',
    href: '/flappy-wing',
    color: '#FF8C00',
    icon: 'flappy-wing-image',
    category: 'Arcade',
  },
];

export default function Home() {
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);

  return (
    <div
      style={{
        width: '100vw',
        minHeight: '100vh',
        padding: 'clamp(16px, 3vw, 32px)',
        boxSizing: 'border-box',
        backgroundColor: wingShackTheme.colors.background,
        backgroundImage: `
          radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 248, 240, 1) 100%),
          radial-gradient(circle at 20% 30%, rgba(200, 88, 32, 0.05) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(159, 8, 8, 0.03) 0%, transparent 50%)
        `,
        backgroundAttachment: 'fixed',
        overflowX: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto clamp(24px, 4vw, 48px)',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <GameCard
          elevated
          style={{
            borderRadius: wingShackTheme.borderRadius.xl,
            padding: 'clamp(16px, 3vw, 32px)',
            textAlign: 'center',
          }}
        >
          <WingShackLogo size="md" showText={false} />
          <h1
            style={{
              fontFamily: wingShackTheme.typography.fontFamily.display,
              fontSize: 'clamp(32px, 6vw, 64px)',
              fontWeight: wingShackTheme.typography.fontWeight.bold,
              color: wingShackTheme.colors.text,
              margin: 'clamp(12px, 2vw, 24px) 0 0 0',
              letterSpacing: 'clamp(2px, 0.5vw, 6px)',
              textShadow: `0 1px 3px rgba(0, 0, 0, 0.1)`,
            }}
          >
            ARCADE
          </h1>
          <p
            style={{
              fontFamily: wingShackTheme.typography.fontFamily.body,
              fontSize: 'clamp(14px, 2.5vw, 20px)',
              color: wingShackTheme.colors.textSecondary,
              margin: 'clamp(8px, 1.5vw, 16px) 0 0 0',
            }}
          >
            PLAY THE BEST GAMES
          </p>
        </GameCard>
      </div>

      {/* Games Grid - Miniclip Style */}
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div
          className="arcade-grid"
          style={{
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {games.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              onHoverStart={() => setHoveredGame(game.id)}
              onHoverEnd={() => setHoveredGame(null)}
              style={{
                width: '100%',
                minWidth: 0,
              }}
            >
              <Link
                href={game.href}
                style={{
                  textDecoration: 'none',
                  display: 'block',
                  width: '100%',
                  height: '100%',
                }}
              >
                <GameCard
                  hover
                  elevated
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: 'clamp(320px, 40vh, 400px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'clamp(12px, 2vw, 20px)',
                    background: `linear-gradient(135deg, ${game.color}20 0%, ${wingShackTheme.colors.backgroundCard} 100%)`,
                    border: `3px solid ${hoveredGame === game.id ? game.color : game.color + '40'}`,
                    borderRadius: wingShackTheme.borderRadius.xl,
                    padding: 'clamp(20px, 3vw, 32px)',
                    transition: 'all 0.3s ease',
                    transform: hoveredGame === game.id ? 'translateY(-8px)' : 'translateY(0)',
                    boxShadow:
                      hoveredGame === game.id
                        ? `0 15px 40px rgba(0, 0, 0, 0.2), 0 5px 15px rgba(0, 0, 0, 0.1)`
                        : `0 10px 30px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)`,
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Game Icon */}
                  <motion.div
                    animate={{
                      scale: hoveredGame === game.id ? 1.15 : 1,
                      rotate: hoveredGame === game.id ? [0, -5, 5, -5, 0] : 0,
                    }}
                    transition={{ duration: 0.3 }}
                    style={{
                      fontSize: 'clamp(100px, 15vw, 150px)',
                      lineHeight: 1,
                      filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))',
                      marginTop: 'clamp(8px, 1.5vw, 16px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {game.icon === 'three-cup-logo' ? (
                      <ThreeCupLogo size="lg" />
                    ) : game.icon === 'sauce-simon' ? (
                      <motion.div
                        animate={{
                          scale: [1, 1.1, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        style={{
                          fontSize: 'clamp(100px, 15vw, 150px)',
                          lineHeight: 1,
                          filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        🧠
                      </motion.div>
                    ) : game.icon === 'flappy-wing-image' ? (
                      <Image
                        src="/wingston flappybird.png"
                        alt="Flappy Wing"
                        width={150}
                        height={150}
                        style={{
                          width: 'clamp(100px, 15vw, 150px)',
                          height: 'clamp(100px, 15vw, 150px)',
                          objectFit: 'contain',
                          filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))',
                        }}
                      />
                    ) : (
                      game.icon
                    )}
                  </motion.div>

                  {/* Game Info */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 'clamp(8px, 1.5vw, 12px)',
                      flex: 1,
                      justifyContent: 'center',
                    }}
                  >
                    {/* Category Badge */}
                    {game.category && (
                      <div
                        style={{
                          padding: 'clamp(4px, 0.8vw, 8px) clamp(12px, 2vw, 20px)',
                          backgroundColor: game.color + '30',
                          borderRadius: wingShackTheme.borderRadius.full,
                          fontSize: 'clamp(10px, 1.8vw, 14px)',
                          fontFamily: wingShackTheme.typography.fontFamily.body,
                          color: game.color,
                          fontWeight: wingShackTheme.typography.fontWeight.medium,
                          letterSpacing: '1px',
                        }}
                      >
                        {game.category}
                      </div>
                    )}

                    {/* Game Title */}
                    <h2
                      style={{
                        fontFamily: wingShackTheme.typography.fontFamily.display,
                        fontSize: 'clamp(20px, 3.5vw, 28px)',
                        fontWeight: wingShackTheme.typography.fontWeight.bold,
                        color: wingShackTheme.colors.text,
                        margin: 0,
                        letterSpacing: 'clamp(1px, 0.3vw, 2px)',
                        textAlign: 'center',
                        textShadow: `0 1px 3px rgba(0, 0, 0, 0.1)`,
                      }}
                    >
                      {game.title}
                    </h2>

                    {/* Game Description */}
                    <p
                      style={{
                        fontFamily: wingShackTheme.typography.fontFamily.body,
                        fontSize: 'clamp(12px, 2vw, 16px)',
                        color: wingShackTheme.colors.textSecondary,
                        margin: 0,
                        textAlign: 'center',
                        lineHeight: 1.5,
                      }}
                    >
                      {game.description}
                    </p>
                  </div>

                  {/* Play Button */}
                  <motion.div
                    animate={{
                      scale: hoveredGame === game.id ? 1.05 : 1,
                    }}
                    style={{
                      width: '100%',
                      padding: 'clamp(12px, 2vw, 16px)',
                      backgroundColor: game.color,
                      color: '#ffffff',
                      borderRadius: wingShackTheme.borderRadius.lg,
                      fontFamily: wingShackTheme.typography.fontFamily.display,
                      fontSize: 'clamp(14px, 2.5vw, 18px)',
                      fontWeight: wingShackTheme.typography.fontWeight.bold,
                      letterSpacing: '2px',
                      textAlign: 'center',
                      boxShadow: `0 6px 20px ${game.color}50`,
                      transition: 'all 0.3s ease',
                      marginTop: 'auto',
                    }}
                  >
                    PLAY NOW →
                  </motion.div>
                </GameCard>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          maxWidth: '1400px',
          margin: 'clamp(32px, 5vw, 64px) auto 0',
          padding: 'clamp(16px, 3vw, 32px)',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: wingShackTheme.typography.fontFamily.body,
            fontSize: 'clamp(12px, 2vw, 16px)',
            color: wingShackTheme.colors.textSecondary,
            margin: 0,
          }}
        >
          More games coming soon!
        </p>
      </div>
    </div>
  );
}
