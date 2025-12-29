'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import GameShell from '@/components/GameShell';
import SauceSimon from '@/components/games/SauceSimon';
import { wingShackTheme } from '@/theme/wingShackTheme';
import WingShackLogo from '@/components/ui/WingShackLogo';

export default function SauceSimonPage() {
  const [resetKey, setResetKey] = useState(0);
  const [gameOverRounds, setGameOverRounds] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Handle game over
  const handleGameOver = useCallback((roundsReached: number) => {
    setGameOverRounds(roundsReached);
    setPlayerName('');
    setSubmitError(null);
    setSubmitSuccess(false);
  }, []);

  // Handle score submission
  const handleSubmitScore = useCallback(async () => {
    if (!gameOverRounds || gameOverRounds < 1) return;
    
    const trimmedName = playerName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 16) {
      setSubmitError('Name must be between 2 and 16 characters');
      return;
    }

    if (!/^[a-zA-Z0-9\s]+$/.test(trimmedName)) {
      setSubmitError('Name can only contain letters, numbers, and spaces');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/leaderboard/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          game_id: 'sauce-simon',
          player_name: trimmedName,
          score: gameOverRounds,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit score');
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        setGameOverRounds(null);
        setSubmitSuccess(false);
      }, 2000);
    } catch (error: any) {
      setSubmitError(error.message || 'Failed to submit score');
    } finally {
      setSubmitting(false);
    }
  }, [gameOverRounds, playerName]);

  return (
    <div
      style={{
        width: '100vw',
        minHeight: '100vh',
        padding: 'clamp(8px, 2vw, 16px)',
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
        gap: 'clamp(8px, 2vw, 12px)',
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

      {/* Game Container */}
      <div
        style={{
          width: '100%',
          maxWidth: '1000px',
          margin: '0 auto',
        }}
      >
        <GameShell
          title="Sauce Simon"
          howToPlay="Watch the sauces light up. Repeat the sequence in the same order. Each round adds one more sauce. One mistake ends the game."
          onStart={() => console.log('Game started')}
          onReset={() => {
            setGameOverRounds(null);
            setResetKey((prev) => prev + 1);
          }}
          onPause={() => console.log('Game paused')}
          onResume={() => console.log('Game resumed')}
        >
          <SauceSimon
            key={resetKey}
            onScore={(score) => {
              console.log('Score:', score);
            }}
            onGameOver={handleGameOver}
          />
        </GameShell>
      </div>

      {/* Game Over Score Submission Overlay */}
      <AnimatePresence>
        {gameOverRounds !== null && (
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
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 'clamp(16px, 3vw, 24px)',
              pointerEvents: 'auto',
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                backgroundColor: wingShackTheme.colors.backgroundCard,
                borderRadius: wingShackTheme.borderRadius.xl,
                padding: 'clamp(24px, 5vw, 40px)',
                maxWidth: 'clamp(300px, 90vw, 500px)',
                width: '100%',
                boxShadow: wingShackTheme.shadows.cardElevated,
              }}
            >
              <h2
                style={{
                  fontFamily: wingShackTheme.typography.fontFamily.display,
                  fontSize: 'clamp(24px, 4vw, 32px)',
                  fontWeight: wingShackTheme.typography.fontWeight.bold,
                  color: wingShackTheme.colors.primary,
                  textAlign: 'center',
                  margin: '0 0 clamp(16px, 3vw, 24px) 0',
                }}
              >
                Game Over!
              </h2>

              <div
                style={{
                  fontFamily: wingShackTheme.typography.fontFamily.display,
                  fontSize: 'clamp(32px, 5vw, 48px)',
                  fontWeight: wingShackTheme.typography.fontWeight.bold,
                  color: wingShackTheme.colors.text,
                  textAlign: 'center',
                  margin: '0 0 clamp(24px, 4vw, 32px) 0',
                }}
              >
                Rounds Reached: {gameOverRounds}
              </div>

              {gameOverRounds >= 1 && !submitSuccess && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'clamp(12px, 2vw, 16px)',
                  }}
                >
                  <div>
                    <label
                      htmlFor="player-name-sauce"
                      style={{
                        display: 'block',
                        fontFamily: wingShackTheme.typography.fontFamily.body,
                        fontSize: 'clamp(14px, 2vw, 18px)',
                        fontWeight: wingShackTheme.typography.fontWeight.medium,
                        color: wingShackTheme.colors.text,
                        marginBottom: 'clamp(8px, 1.5vw, 12px)',
                      }}
                    >
                      Enter your name:
                    </label>
                    <input
                      id="player-name-sauce"
                      type="text"
                      value={playerName}
                      onChange={(e) => {
                        setPlayerName(e.target.value);
                        setSubmitError(null);
                      }}
                      maxLength={16}
                      placeholder="2-16 characters"
                      disabled={submitting}
                      style={{
                        width: '100%',
                        padding: 'clamp(10px, 2vw, 14px)',
                        fontSize: 'clamp(14px, 2vw, 18px)',
                        fontFamily: wingShackTheme.typography.fontFamily.body,
                        border: `2px solid ${submitError ? wingShackTheme.colors.error : 'rgba(0, 0, 0, 0.2)'}`,
                        borderRadius: wingShackTheme.borderRadius.md,
                        outline: 'none',
                        boxSizing: 'border-box',
                        backgroundColor: wingShackTheme.colors.backgroundCard,
                        color: wingShackTheme.colors.text,
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !submitting) {
                          handleSubmitScore();
                        }
                      }}
                    />
                    {submitError && (
                      <div
                        style={{
                          marginTop: 'clamp(6px, 1vw, 8px)',
                          color: wingShackTheme.colors.error,
                          fontSize: 'clamp(12px, 1.8vw, 16px)',
                          fontFamily: wingShackTheme.typography.fontFamily.body,
                        }}
                      >
                        {submitError}
                      </div>
                    )}
                  </div>

                  <motion.button
                    onClick={handleSubmitScore}
                    disabled={submitting || playerName.trim().length < 2}
                    style={{
                      padding: 'clamp(14px, 2.5vw, 18px) clamp(24px, 4vw, 32px)',
                      backgroundColor:
                        submitting || playerName.trim().length < 2
                          ? wingShackTheme.colors.textMuted
                          : wingShackTheme.colors.primary,
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: wingShackTheme.borderRadius.lg,
                      fontFamily: wingShackTheme.typography.fontFamily.display,
                      fontSize: 'clamp(16px, 2.5vw, 20px)',
                      fontWeight: wingShackTheme.typography.fontWeight.bold,
                      cursor:
                        submitting || playerName.trim().length < 2
                          ? 'not-allowed'
                          : 'pointer',
                      boxShadow: submitting || playerName.trim().length < 2 
                        ? '0 2px 4px rgba(0, 0, 0, 0.1)'
                        : '0 4px 12px rgba(159, 8, 8, 0.3)',
                      transition: 'all 0.2s ease',
                      opacity: submitting || playerName.trim().length < 2 ? 0.6 : 1,
                    }}
                    whileHover={
                      submitting || playerName.trim().length < 2
                        ? {}
                        : { y: -2, boxShadow: '0 6px 16px rgba(159, 8, 8, 0.4)' }
                    }
                    whileTap={
                      submitting || playerName.trim().length < 2
                        ? {}
                        : { y: 0 }
                    }
                  >
                    {submitting ? 'Submitting...' : 'Submit Score'}
                  </motion.button>
                </div>
              )}

              {submitSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    padding: 'clamp(16px, 3vw, 24px)',
                    backgroundColor: 'rgba(78, 205, 196, 0.1)',
                    borderRadius: wingShackTheme.borderRadius.md,
                    textAlign: 'center',
                    color: wingShackTheme.colors.success,
                    fontFamily: wingShackTheme.typography.fontFamily.body,
                    fontSize: 'clamp(16px, 2.5vw, 20px)',
                    fontWeight: wingShackTheme.typography.fontWeight.semibold,
                    marginTop: 'clamp(16px, 3vw, 24px)',
                  }}
                >
                  Score submitted successfully! 🎉
                </motion.div>
              )}

              {(!submitSuccess || gameOverRounds < 1) && (
                <motion.button
                  onClick={() => {
                    setGameOverRounds(null);
                    setSubmitSuccess(false);
                    setResetKey((prev) => prev + 1);
                  }}
                  style={{
                    marginTop: 'clamp(16px, 3vw, 24px)',
                    padding: 'clamp(10px, 2vw, 14px)',
                    backgroundColor: 'transparent',
                    color: wingShackTheme.colors.textSecondary,
                    border: `2px solid ${wingShackTheme.colors.textSecondary}40`,
                    borderRadius: wingShackTheme.borderRadius.md,
                    fontFamily: wingShackTheme.typography.fontFamily.body,
                    fontSize: 'clamp(14px, 2vw, 18px)',
                    fontWeight: wingShackTheme.typography.fontWeight.medium,
                    cursor: 'pointer',
                    width: '100%',
                  }}
                  whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  Close
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

