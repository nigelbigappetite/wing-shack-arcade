import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Simple in-memory rate limiting map
// Format: { ip: { count: number, resetAt: number } }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now > data.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

function getClientIP(request: NextRequest): string {
  // Try various headers for IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback to a default if no IP found
  return 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    // Reset or new entry
    rateLimitMap.set(ip, {
      count: 1,
      resetAt: now + 60 * 60 * 1000, // 1 hour
    });
    return { allowed: true, remaining: 9 };
  }

  if (entry.count >= 10) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: 10 - entry.count };
}

function validatePlayerName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  
  if (trimmed.length < 2 || trimmed.length > 16) {
    return {
      valid: false,
      error: 'Player name must be between 2 and 16 characters',
    };
  }

  // Allow letters, numbers, and spaces only
  if (!/^[a-zA-Z0-9\s]+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Player name can only contain letters, numbers, and spaces',
    };
  }

  return { valid: true };
}

function validateScore(score: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(score)) {
    return {
      valid: false,
      error: 'Score must be an integer',
    };
  }

  if (score < 0 || score > 9999) {
    return {
      valid: false,
      error: 'Score must be between 0 and 9999',
    };
  }

  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIP(request);
    const rateLimit = checkRateLimit(ip);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 10 submissions per hour.' },
        { status: 429 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { game_id, player_name, score } = body;

    // Validate game_id
    if (game_id !== 'snake') {
      return NextResponse.json(
        { error: 'Invalid game_id. Only "snake" is allowed.' },
        { status: 400 }
      );
    }

    // Validate player_name
    if (!player_name || typeof player_name !== 'string') {
      return NextResponse.json(
        { error: 'player_name is required and must be a string' },
        { status: 400 }
      );
    }

    const nameValidation = validatePlayerName(player_name);
    if (!nameValidation.valid) {
      return NextResponse.json(
        { error: nameValidation.error },
        { status: 400 }
      );
    }

    // Validate score
    if (score === undefined || score === null) {
      return NextResponse.json(
        { error: 'score is required' },
        { status: 400 }
      );
    }

    const scoreValidation = validateScore(score);
    if (!scoreValidation.valid) {
      return NextResponse.json(
        { error: scoreValidation.error },
        { status: 400 }
      );
    }

    // Insert into database
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('scores')
      .insert({
        game_id: 'snake',
        player_name: player_name.trim(),
        score: score,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', JSON.stringify(error, null, 2));
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      
      // Check for RLS/permission errors
      if (
        error.code === '42501' || 
        error.message?.toLowerCase().includes('permission denied') ||
        error.message?.toLowerCase().includes('row-level security') ||
        error.message?.toLowerCase().includes('rls') ||
        error.message?.toLowerCase().includes('policy') ||
        error.hint?.toLowerCase().includes('policy')
      ) {
        return NextResponse.json(
          { 
            error: 'RLS Permission Denied', 
            details: 'Row Level Security (RLS) is blocking score submission.',
            solution: 'In Supabase Dashboard: 1) Go to Authentication > Policies, 2) Create an INSERT policy for the "scores" table: "Enable insert for all users" (INSERT policy with "true" as the expression)',
            errorCode: error.code,
            errorMessage: error.message,
            errorHint: error.hint
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to submit score', 
          details: error.message || 'Unknown error',
          code: error.code || 'UNKNOWN',
          hint: error.hint,
          fullError: process.env.NODE_ENV === 'development' ? JSON.stringify(error, null, 2) : undefined
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: data,
        rateLimit: {
          remaining: rateLimit.remaining,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Leaderboard submit error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

