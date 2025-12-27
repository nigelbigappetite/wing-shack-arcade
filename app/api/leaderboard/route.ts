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

    console.log('🔍 Supabase client initialized');
    console.log('🔍 Querying scores table for game_id=snake');

    // Fetch top 10 scores
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .eq('game_id', 'snake')
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(10);

    console.log('📊 Supabase query result:', {
      hasData: !!data,
      dataLength: data?.length || 0,
      hasError: !!error,
      error: error ? JSON.stringify(error, null, 2) : null
    });

    if (error) {
      console.error('Supabase error:', JSON.stringify(error, null, 2));
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      
      // Check for RLS/permission errors (most common issue)
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
            details: 'Row Level Security (RLS) is blocking access to the scores table.',
            solution: 'In Supabase Dashboard: 1) Go to Authentication > Policies, 2) Create a policy for the "scores" table: "Enable read access for all users" (SELECT policy with "true" as the expression), 3) Create a policy for INSERT: "Enable insert for all users" (INSERT policy with "true" as the expression)',
            errorCode: error.code,
            errorMessage: error.message,
            errorHint: error.hint
          },
          { status: 403 }
        );
      }
      
      // Check for table not found errors
      if (
        error.code === 'PGRST116' ||
        error.message?.toLowerCase().includes('relation') || 
        error.message?.toLowerCase().includes('does not exist') ||
        error.message?.toLowerCase().includes('table') && error.message?.toLowerCase().includes('not found')
      ) {
        return NextResponse.json(
          { 
            error: 'Table not found', 
            details: 'The "scores" table does not exist in your Supabase database.',
            solution: 'Create the table in Supabase with columns: id (uuid, primary key), game_id (text), player_name (text), score (integer), created_at (timestamp)',
            errorCode: error.code,
            errorMessage: error.message
          },
          { status: 500 }
        );
      }

      // Generic error with full details
      return NextResponse.json(
        { 
          error: 'Failed to fetch leaderboard', 
          details: error.message || 'Unknown error',
          code: error.code || 'UNKNOWN',
          hint: error.hint,
          fullError: process.env.NODE_ENV === 'development' ? JSON.stringify(error, null, 2) : undefined
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

