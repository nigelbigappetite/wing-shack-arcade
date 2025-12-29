# Supabase Setup for Wing Shack Arcade Leaderboards

This document provides SQL scripts to set up and verify your Supabase database for leaderboard functionality.

## Table Structure

The `scores` table should have the following structure:

```sql
-- Create the scores table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on game_id for faster queries
CREATE INDEX IF NOT EXISTS idx_scores_game_id ON public.scores(game_id);

-- Create an index on score for faster sorting
CREATE INDEX IF NOT EXISTS idx_scores_score ON public.scores(score DESC);

-- Create a composite index for game_id + score queries
CREATE INDEX IF NOT EXISTS idx_scores_game_score ON public.scores(game_id, score DESC);
```

## Row Level Security (RLS) Policies

RLS must be enabled and policies must allow anonymous users to read and insert scores.

### Enable RLS

```sql
-- Enable RLS on the scores table
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
```

### Create SELECT Policy (Read Access)

This allows anyone to read scores:

```sql
-- Drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "Allow public read access" ON public.scores;

-- Create SELECT policy for all users
CREATE POLICY "Allow public read access"
ON public.scores
FOR SELECT
TO public
USING (true);
```

### Create INSERT Policy (Write Access)

This allows anyone to insert scores:

```sql
-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Allow public insert access" ON public.scores;

-- Create INSERT policy for all users
CREATE POLICY "Allow public insert access"
ON public.scores
FOR INSERT
TO public
WITH CHECK (true);
```

## Verify Setup

Run these queries to verify your setup:

```sql
-- Check if table exists and has correct structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'scores'
ORDER BY ordinal_position;

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'scores';

-- Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'scores';

-- Test insert (should work)
INSERT INTO public.scores (game_id, player_name, score)
VALUES ('flappy-wing', 'Test Player', 100);

-- Test select (should return data)
SELECT * FROM public.scores WHERE game_id = 'flappy-wing' ORDER BY score DESC LIMIT 10;

-- Clean up test data
DELETE FROM public.scores WHERE player_name = 'Test Player';
```

## Supported Game IDs

Currently supported game IDs:
- `snake` - Snake game leaderboard
- `flappy-wing` - Flappy Wing game leaderboard
- `sauce-simon` - Sauce Simon game leaderboard (tracks rounds reached)

## Troubleshooting

### Issue: "RLS Permission Denied"

**Solution:** Make sure you have both SELECT and INSERT policies created as shown above.

### Issue: "Table not found"

**Solution:** Run the table creation SQL above.

### Issue: Scores not showing up

**Check:**
1. RLS is enabled: `SELECT rowsecurity FROM pg_tables WHERE tablename = 'scores';`
2. Policies exist: Run the policy verification query above
3. Data exists: `SELECT COUNT(*) FROM public.scores WHERE game_id = 'flappy-wing';`

### Issue: Can't insert scores

**Check:**
1. INSERT policy exists and allows public access
2. The `game_id` being submitted is either 'snake', 'flappy-wing', or 'sauce-simon'
3. Score is a valid integer
4. Player name meets validation (2-16 characters, alphanumeric + spaces)

## Quick Setup Script

Run this complete setup script in your Supabase SQL Editor:

```sql
-- ============================================
-- Complete Setup Script for Wing Shack Arcade
-- ============================================

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_scores_game_id ON public.scores(game_id);
CREATE INDEX IF NOT EXISTS idx_scores_score ON public.scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_game_score ON public.scores(game_id, score DESC);

-- 3. Enable RLS
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies (if any)
DROP POLICY IF EXISTS "Allow public read access" ON public.scores;
DROP POLICY IF EXISTS "Allow public insert access" ON public.scores;

-- 5. Create SELECT policy
CREATE POLICY "Allow public read access"
ON public.scores
FOR SELECT
TO public
USING (true);

-- 6. Create INSERT policy
CREATE POLICY "Allow public insert access"
ON public.scores
FOR INSERT
TO public
WITH CHECK (true);

-- 7. Verify setup
SELECT 'Setup complete! Table exists: ' || EXISTS(
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'scores'
) as status;
```

