'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { wingShackTheme } from '@/theme/wingShackTheme';
import WingShackLogo from '@/components/ui/WingShackLogo';
import GameCard from '@/components/ui/GameCard';

interface LeaderboardEntry {
  id?: string;
  game_id: string;
  player_name: string;
  score: number;
  created_at?: string;
}

export default function FlappyWingLeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      console.log('🔍 Fetching leaderboard from /api/leaderboard?game_id=flappy-wing');
      const response = await fetch('/api/leaderboard?game_id=flappy-wing');
      
      console.log('📡 Response status:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('📦 Full API response:', JSON.stringify(data, null, 2));
      
      if (!response.ok) {
        console.error('❌ API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          details: data.details,
        });
        
        const errorMsg = data.error || data.details || 'Failed to fetch leaderboard';
        throw new Error(errorMsg);
      }
      
      // Handle both { data: [...] } and direct array responses
      const leaderboardData = Array.isArray(data) ? data : (data.data || []);
      console.log('✅ Parsed leaderboard data:', leaderboardData);
      console.log('✅ Leaderboard data length:', leaderboardData.length);
      
      setLeaderboard(leaderboardData);
    } catch (error: any) {
      console.error('❌ Leaderboard fetch error:', error);
      setLeaderboardError(error.message || 'Failed to load leaderboard');
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return (
    <div
      style={{
        width: '100vw',
        minHeight: '100vh',
        padding: 'clamp(16px, 3vw, 24px)',
        boxSizing: 'border-box',
        backgroundColor: wingShackTheme.colors.background,
        backgroundImage: `
          radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 248, 240, 1) 100%),
          radial-gradient(circle at 20% 30%, rgba(200, 88, 32, 0.08) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(159, 8, 8, 0.05) 0%, transparent 60%)
        `,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 'clamp(16px, 3vw, 24px)',
      }}
    >
      {/* Header with Logo */}
      <Link
        href="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          marginTop: 'clamp(8px, 2vw, 16px)',
          textDecoration: 'none',
          cursor: 'pointer',
        }}
      >
        <WingShackLogo size="sm" showText={false} />
      </Link>

      {/* Back to Game Button */}
      <div
        style={{
          width: '100%',
          maxWidth: '600px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'flex-start',
        }}
      >
        <Link
          href="/flappy-wing"
          style={{
            textDecoration: 'none',
          }}
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: 'clamp(8px, 1.5vw, 12px) clamp(16px, 2.5vw, 20px)',
              backgroundColor: wingShackTheme.colors.primary,
              color: '#ffffff',
              border: 'none',
              borderRadius: wingShackTheme.borderRadius.md,
              fontFamily: wingShackTheme.typography.fontFamily.body,
              fontSize: 'clamp(14px, 2vw, 18px)',
              fontWeight: wingShackTheme.typography.fontWeight.semibold,
              cursor: 'pointer',
              boxShadow: `0 4px 12px ${wingShackTheme.colors.primary}40`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            ← Back to Game
          </motion.button>
        </Link>
      </div>

      {/* Leaderboard Card */}
      <GameCard
        elevated
        style={{
          width: '100%',
          maxWidth: '600px',
          margin: '0 auto',
          padding: 'clamp(24px, 4vw, 32px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <h1
          style={{
            fontFamily: wingShackTheme.typography.fontFamily.display,
            fontSize: 'clamp(28px, 4vw, 36px)',
            fontWeight: wingShackTheme.typography.fontWeight.bold,
            color: wingShackTheme.colors.primary,
            margin: '0 0 clamp(8px, 1.5vw, 16px) 0',
            textAlign: 'center',
          }}
        >
          🐦 FLAPPY WING LEADERBOARD
        </h1>

        <h2
          style={{
            fontFamily: wingShackTheme.typography.fontFamily.display,
            fontSize: 'clamp(18px, 3vw, 24px)',
            fontWeight: wingShackTheme.typography.fontWeight.bold,
            color: wingShackTheme.colors.textSecondary,
            margin: '0 0 clamp(24px, 4vw, 32px) 0',
            textAlign: 'center',
          }}
        >
          TOP 10 SCORES
        </h2>

        {leaderboardLoading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'clamp(60px, 10vw, 100px)',
              color: wingShackTheme.colors.textSecondary,
              fontFamily: wingShackTheme.typography.fontFamily.body,
              fontSize: 'clamp(16px, 2.5vw, 20px)',
            }}
          >
            Loading...
          </div>
        ) : leaderboardError ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'clamp(60px, 10vw, 100px)',
              gap: 'clamp(16px, 2.5vw, 24px)',
            }}
          >
            <div
              style={{
                color: wingShackTheme.colors.error,
                fontFamily: wingShackTheme.typography.fontFamily.body,
                fontSize: 'clamp(16px, 2.5vw, 20px)',
                textAlign: 'center',
              }}
            >
              {leaderboardError}
            </div>
            <button
              onClick={fetchLeaderboard}
              style={{
                padding: 'clamp(12px, 2vw, 16px) clamp(24px, 4vw, 32px)',
                backgroundColor: wingShackTheme.colors.primary,
                color: '#ffffff',
                border: 'none',
                borderRadius: wingShackTheme.borderRadius.md,
                fontFamily: wingShackTheme.typography.fontFamily.body,
                fontSize: 'clamp(14px, 2vw, 18px)',
                fontWeight: wingShackTheme.typography.fontWeight.semibold,
                cursor: 'pointer',
                boxShadow: `0 4px 12px ${wingShackTheme.colors.primary}40`,
              }}
            >
              Retry
            </button>
          </div>
        ) : leaderboard.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'clamp(60px, 10vw, 100px)',
              color: wingShackTheme.colors.textMuted,
              fontFamily: wingShackTheme.typography.fontFamily.body,
              fontSize: 'clamp(16px, 2.5vw, 20px)',
              textAlign: 'center',
            }}
          >
            No scores yet. Be the first!
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'clamp(8px, 1.5vw, 12px)',
            }}
          >
            {leaderboard.map((entry, index) => (
              <motion.div
                key={entry.id || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'clamp(12px, 2vw, 16px) clamp(16px, 2.5vw, 20px)',
                  backgroundColor: index < 3 ? 'rgba(159, 8, 8, 0.08)' : 'rgba(0, 0, 0, 0.03)',
                  borderRadius: wingShackTheme.borderRadius.md,
                  border: index < 3 ? `2px solid ${wingShackTheme.colors.primary}40` : '1px solid rgba(0, 0, 0, 0.1)',
                  boxShadow: index < 3 ? `0 4px 12px ${wingShackTheme.colors.primary}20` : '0 2px 4px rgba(0, 0, 0, 0.05)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'clamp(12px, 2vw, 16px)',
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontFamily: wingShackTheme.typography.fontFamily.display,
                      fontSize: 'clamp(20px, 3vw, 28px)',
                      fontWeight: wingShackTheme.typography.fontWeight.bold,
                      color: index < 3 ? wingShackTheme.colors.primary : wingShackTheme.colors.textSecondary,
                      minWidth: 'clamp(40px, 5vw, 50px)',
                      textAlign: 'center',
                    }}
                  >
                    #{index + 1}
                  </div>
                  <div
                    style={{
                      fontFamily: wingShackTheme.typography.fontFamily.body,
                      fontSize: 'clamp(16px, 2.5vw, 20px)',
                      fontWeight: wingShackTheme.typography.fontWeight.medium,
                      color: wingShackTheme.colors.text,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {entry.player_name}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: wingShackTheme.typography.fontFamily.display,
                    fontSize: 'clamp(20px, 3vw, 28px)',
                    fontWeight: wingShackTheme.typography.fontWeight.bold,
                    color: wingShackTheme.colors.primary,
                  }}
                >
                  {entry.score}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </GameCard>
    </div>
  );
}

