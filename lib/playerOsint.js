import Anthropic from '@anthropic-ai/sdk';
import { braveWebSearch } from './braveSearch';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT_TEMPLATE = ({ name, team, position, sourcesText }) => `You are helping a fantasy football manager decide whether to start or sit ${name} (${position}, ${team}) this week, based on recent injury/practice news.

Recent search results about this player:

${sourcesText}

Weigh these signals specifically, not just the official Questionable/Doubtful/Out tag:
- Injury type and how it affects a ${position}'s ability to handle a full workload (e.g. a rib injury limits contact and explosiveness; ankle/foot affects cutting; hamstring/groin affects speed; concussion is a binary pass/fail protocol, not a workload question).
- Practice trajectory across the week: DNP -> Limited -> Full trends toward a real role; Limited all week with vague language trends toward a reduced role. "Estimated" participation on a player's planned rest day is not a real injury signal - discount it.
- How late availability was decided. A Friday-afternoon clearance reads very differently than a Sunday-morning game-time decision, even under the identical official tag - a late decision is a red flag for a reduced role even if he ultimately plays.
- Explicit workload language from coaches or reporters: phrases like "limited role," "we'll ease him in," "left practice early," "non-contact," "individual drills only," "snap count" directly override a generic tag.

Respond in exactly this format, nothing else:
VERDICT: [START|SIT|MONITOR]
SUMMARY: <2-3 sentences, written for a fantasy manager deciding their lineup right now>

Use MONITOR only when there is genuinely not enough recent, relevant information to make a confident call - not as a hedge when the evidence actually points one way.`;

// Search for recent news on a player, then have Claude weigh the
// specific signals that separate "hurt but still a real workload" from
// "will barely play" - not just restate the official injury tag.
export async function getPlayerOsint({ name, team, position }) {
  const query = `${name} ${team} NFL injury practice report`;
  const results = await braveWebSearch(query, 8);

  if (!results.length) {
    return {
      verdict: 'MONITOR',
      summary: 'No recent reporting found for this player — not enough information to make a confident call.',
      sources: [],
    };
  }

  const sourcesText = results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.description}\nURL: ${r.url}`)
    .join('\n\n');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 700,
    messages: [{ role: 'user', content: PROMPT_TEMPLATE({ name, team, position, sourcesText }) }],
  });

  const text = message.content.find((block) => block.type === 'text')?.text || '';
  const verdictMatch = text.match(/VERDICT:\s*(START|SIT|MONITOR)/i);
  const summaryMatch = text.match(/SUMMARY:\s*([\s\S]*)/i);

  return {
    verdict: verdictMatch ? verdictMatch[1].toUpperCase() : 'MONITOR',
    summary: summaryMatch ? summaryMatch[1].trim() : text.trim(),
    sources: results.slice(0, 5).map((r) => ({ title: r.title, url: r.url })),
  };
}
