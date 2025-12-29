import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gameId = searchParams.get('game_id');

    // Only allow snake, flappy-wing, and sauce-simon games
    if (gameId !== 'snake' && gameId !== 'flappy-wing' && gameId !== 'sauce-simon') {
      return NextResponse.json(
        { error: 'Invalid game_id. Only "snake", "flappy-wing", and "sauce-simon" are allowed.' },
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
    console.log(`🔍 Querying scores table for game_id=${gameId}`);

    // First, let's check what's actually in the table (without filter)
    const { data: allData, error: allError } = await supabase
      .from('scores')
      .select('*')
      .limit(100);

    console.log('📋 All scores in table (first 100):', {
      count: allData?.length || 0,
      data: allData,
      error: allError ? JSON.stringify(allError, null, 2) : null
    });
    
    // Log game_id distribution for debugging
    if (allData && allData.length > 0) {
      const gameIdCounts: Record<string, number> = {};
      const gameIdValues: string[] = [];
      allData.forEach((row: any) => {
        const gid = row.game_id || 'unknown';
        gameIdCounts[gid] = (gameIdCounts[gid] || 0) + 1;
        if (!gameIdValues.includes(gid)) {
          gameIdValues.push(gid);
        }
      });
      console.log('📊 Game ID distribution:', gameIdCounts);
      console.log('📊 All unique game_id values found:', gameIdValues);
      console.log(`📊 Looking for game_id='${gameId}' (exact match)`);
      console.log(`📊 Records with exact game_id='${gameId}':`, allData.filter((row: any) => row.game_id === gameId).length);
      console.log(`📊 Records with game_id containing '${gameId}':`, allData.filter((row: any) => row.game_id && row.game_id.includes(gameId)).length);
      
      // Show sample of game_id values
      const sampleGameIds = allData.slice(0, 5).map((row: any) => ({
        id: row.id,
        game_id: row.game_id,
        game_id_type: typeof row.game_id,
        game_id_length: row.game_id?.length
      }));
      console.log('📊 Sample game_id values:', sampleGameIds);
    }

    // Now fetch with filter - try multiple approaches
    console.log('🔍 Attempting filtered query with .eq()');
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .eq('game_id', gameId)
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(10);

    console.log(`📊 Filtered query result (game_id=${gameId}):`, {
      hasData: !!data,
      dataLength: data?.length || 0,
      data: data,
      hasError: !!error,
      error: error ? JSON.stringify(error, null, 2) : null
    });

    // Always use client-side filtering if we have allData, to ensure we get all matching records
    let finalData = data;
    if (allData && allData.length > 0) {
      console.log('🔄 Using client-side filtering to ensure all matching records are included');
      const filtered = allData
        .filter((row: any) => {
          // Try exact match first
          if (row.game_id === gameId) return true;
          // Try case-insensitive match
          if (row.game_id && row.game_id.toLowerCase() === gameId.toLowerCase()) return true;
          // Try trimmed match (in case of whitespace)
          if (row.game_id && row.game_id.trim() === gameId.trim()) return true;
          return false;
        })
        .sort((a: any, b: any) => {
          // Sort by score descending, then by created_at ascending (older first for same score)
          if (b.score !== a.score) return b.score - a.score;
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
          return aTime - bTime;
        })
        .slice(0, 10);
      
      console.log('📊 Client-side filtered result:', {
        count: filtered.length,
        exactMatchCount: allData.filter((row: any) => row.game_id === gameId).length,
        caseInsensitiveMatchCount: allData.filter((row: any) => row.game_id && row.game_id.toLowerCase() === gameId.toLowerCase()).length,
        data: filtered.map((row: any) => ({
          id: row.id,
          game_id: row.game_id,
          player_name: row.player_name,
          score: row.score
        }))
      });
      
      finalData = filtered;
    }


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

    // Return data with debug info
    const response: any = { data: finalData || [] };
    
    // Always include debug info to help diagnose RLS issues
    response.debug = {
      queryResult: data?.length || 0,
      clientSideFiltered: finalData?.length || 0,
      allDataCount: allData?.length || 0,
      usedClientSideFilter: (!data || data.length === 0) && allData && allData.length > 0,
      hasError: false
    };
    
    // Add cache-busting headers to ensure fresh data
    const responseObj = NextResponse.json(response);
    responseObj.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    responseObj.headers.set('Pragma', 'no-cache');
    responseObj.headers.set('Expires', '0');
    return responseObj;
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

