import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gameId = searchParams.get('game_id');

    // Only allow snake game
    if (gameId !== 'snake') {
      return NextResponse.json(
        { error: 'Invalid game_id. Only "snake" is allowed.' },
        { status: 400 }
      );
    }

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { 
          error: 'Server configuration error', 
          details: 'Supabase environment variables are not set. Please check Vercel settings.' 
        },
        { status: 500 }
      );
    }

    const supabase = getSupabaseClient();

    // Fetch top 10 scores
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .eq('game_id', 'snake')
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Supabase error:', JSON.stringify(error, null, 2));
      
      // Check for common errors
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'Table not found', 
            details: 'The "scores" table does not exist. Please create it in Supabase.' 
          },
          { status: 500 }
        );
      }
      
      if (error.message?.includes('permission denied') || error.message?.includes('RLS')) {
        return NextResponse.json(
          { 
            error: 'Permission denied', 
            details: 'Row Level Security (RLS) is blocking access. Please enable public read access for the scores table.' 
          },
          { status: 500 }
        );
      }
      
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { 
            error: 'Table not found', 
            details: 'The "scores" table does not exist in your Supabase database.' 
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { 
          error: 'Failed to fetch leaderboard', 
          details: error.message || 'Unknown error',
          code: error.code || 'UNKNOWN'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error('Leaderboard GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message || 'Unknown error occurred',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

