import { supabase } from '@/lib/supabaseClient';

// Resolves a Cognito username to the real email that account synced
// (see app/cognito-context.js). Falls back to EMAIL_TO so accounts from
// before this existed (or a sync that hasn't landed yet) don't just
// silently fail to get their email.
export async function getEmailForUsername(username) {
  const { data } = await supabase.from('app_users').select('email').eq('username', username).single();
  return data?.email || process.env.EMAIL_TO || null;
}

// { username: email } for every user who has at least one league, used
// by the scheduled digests to send each person their own email instead
// of one blended one.
export async function getEmailsForUsernames(usernames) {
  const unique = [...new Set(usernames)];
  const { data } = await supabase.from('app_users').select('username, email').in('username', unique);

  const byUsername = new Map((data || []).map((row) => [row.username, row.email]));
  const result = {};
  for (const username of unique) {
    result[username] = byUsername.get(username) || null;
  }
  return result;
}
