// lumisRateLimit.ts
// Tracks Lumis (ML) usage per user per day using Supabase.
// Limit: 2 generations per account per calendar day (UTC).

import { supabase } from '../supabase/supabaseClient';

const DAILY_LUMIS_LIMIT = 2;

// Returns today's date string in UTC — e.g. "2024-06-05"
function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface LumisUsage {
  used: number;       // how many used today
  limit: number;      // always 2
  remaining: number;  // how many left today
  resetAt: string;    // date string when it resets (next UTC day)
}

/**
 * Check how many Lumis generations the user has left today.
 */
export async function getLumisUsage(userId: string): Promise<LumisUsage> {
  const todayKey = getTodayKey();
  const id = `${userId}_${todayKey}`;
  
  const { data } = await supabase
    .from('lumis_usage')
    .select('count')
    .eq('id', id)
    .single();

  const used = data?.count ?? 0;

  return {
    used,
    limit: DAILY_LUMIS_LIMIT,
    remaining: Math.max(0, DAILY_LUMIS_LIMIT - used),
    resetAt: todayKey,
  };
}

/**
 * Check if the user can generate, and increment the counter if so.
 * Throws an error if the daily limit is reached.
 */
export async function checkAndIncrementLumis(userId: string): Promise<LumisUsage> {
  const todayKey = getTodayKey();
  const id = `${userId}_${todayKey}`;

  // 1. Fetch current usage
  const { data: fetchResult } = await supabase
    .from('lumis_usage')
    .select('count')
    .eq('id', id)
    .single();

  const currentCount = fetchResult?.count ?? 0;

  if (currentCount >= DAILY_LUMIS_LIMIT) {
    throw new Error(
      `Daily limit reached. Lumis allows ${DAILY_LUMIS_LIMIT} AI generations per account per day. ` +
      `Your limit resets at midnight UTC.`
    );
  }

  const newCount = currentCount + 1;

  // 2. Upsert usage
  const { error: upsertError } = await supabase
    .from('lumis_usage')
    .upsert({
      id: id,
      user_id: userId,
      date: todayKey,
      count: newCount
    });

  if (upsertError) throw upsertError;

  return {
    used: newCount,
    limit: DAILY_LUMIS_LIMIT,
    remaining: Math.max(0, DAILY_LUMIS_LIMIT - newCount),
    resetAt: todayKey,
  };
}
