import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabaseClient';
import { braveNewsSearch } from '@/lib/braveSearch';
import { getNflState } from '@/lib/sleeperClient';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SKILL_POSITIONS = ['QB', 'RB', 'WR', 'TE'];

// Everyone actually available in this specific league - not a national
// "most added" list, which is only useful if the player is still
// unrostered here. Skips K/DEF: waiver "pickups" there aren't really a
// buzz-driven decision the way skill positions are.
async function getAvailablePlayerPool(league) {
  const { data: leagueRosters } = await supabase
    .from('rosters')
    .select('players, reserve, taxi')
    .eq('league_id', league.id);

  const rosteredIds = new Set(
    (leagueRosters || []).flatMap((r) => [...(r.players || []), ...(r.reserve || []), ...(r.taxi || [])])
  );

  const { data: players } = await supabase
    .from('sleeper_players')
    .select('player_id, full_name, position, team, injury_status')
    .in('position', SKILL_POSITIONS)
    .order('full_name');

  return (players || []).filter((p) => !rosteredIds.has(p.player_id) && p.team);
}

const PROMPT_TEMPLATE = ({ week, articlesText, poolText }) => `You are a fantasy football assistant helping a manager decide who to add off waivers this week (Week ${week}).

Here are recent waiver-wire/pickup articles and roundups (ESPN, Yahoo, FantasyPros, beat reporters, etc.):

${articlesText}

Here is every player actually still available (unrostered) in this manager's specific league, by position:

${poolText}

Cross-reference the two: find players mentioned as trending/recommended pickups in the articles above who are ALSO in the available list (a player recommended nationally but already rostered in this league is useless - skip them). Prioritize players with real opportunity (injury ahead of them, role change, hot recent performance) over name recognition alone.

Respond with 5-8 recommendations, ranked best first, in exactly this format (one block per player, nothing else):

NAME: <full name>
POSITION: <position>
TEAM: <team>
REASON: <one sentence on why - the specific opportunity or trend, not generic praise>

If fewer than 5 genuinely good candidates are both buzzed-about and available, return fewer rather than padding with weak options.`;

// Searches for this week's waiver-wire buzz, cross-references it
// against who's actually free in this league, and has Claude rank the
// real candidates with reasoning - not a national "most added" list.
export async function getWaiverRecommendations(league) {
  const nflState = await getNflState().catch(() => null);
  const week = nflState?.week;

  const query = `NFL fantasy football waiver wire pickups Week ${week || ''} ${league.season} add`;
  const [articles, pool] = await Promise.all([
    braveNewsSearch(query, 10).catch(() => []),
    getAvailablePlayerPool(league),
  ]);

  if (!articles.length) {
    return { recommendations: [], note: 'No recent waiver-wire coverage found.' };
  }

  const articlesText = articles
    .map((a, i) => {
      const snippets = a.extraSnippets.length ? a.extraSnippets.join(' ') : a.description;
      return `[${i + 1}] (${a.age || 'unknown age'}) ${a.title}\n${snippets}`;
    })
    .join('\n\n');

  const poolByPosition = {};
  for (const p of pool) {
    (poolByPosition[p.position] ||= []).push(`${p.full_name} (${p.team})`);
  }
  const poolText = SKILL_POSITIONS.map((pos) => `${pos}: ${(poolByPosition[pos] || []).join(', ')}`).join('\n\n');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 1200,
    messages: [{ role: 'user', content: PROMPT_TEMPLATE({ week, articlesText, poolText }) }],
  });

  const text = message.content.find((block) => block.type === 'text')?.text || '';
  const blocks = text.split(/\n(?=NAME:)/).filter((b) => b.trim().startsWith('NAME:'));

  const recommendations = blocks.map((block) => ({
    name: block.match(/NAME:\s*(.+)/)?.[1]?.trim() || '',
    position: block.match(/POSITION:\s*(.+)/)?.[1]?.trim() || '',
    team: block.match(/TEAM:\s*(.+)/)?.[1]?.trim() || '',
    reason: block.match(/REASON:\s*([\s\S]+?)(?=\n\n|$)/)?.[1]?.trim() || '',
  }));

  return { recommendations };
}
