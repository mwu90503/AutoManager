'use client';

import { useEffect, useState } from 'react';
import { injuryAbbreviation } from '../../lib/injuryStatus';
import styles from '../shared.module.css';

// The tail of an injury-status sentence: fetches the Start/Sit verdict
// automatically as soon as the card renders, so the decision is already
// there rather than waiting on a click. "Get latest news" re-runs the
// lookup on demand afterward (news can change through the day) - it's
// not what triggers the first result. No source links shown - just the
// call and the reasoning.
function VerdictTail({ name, team, position, fallback }) {
  const [state, setState] = useState({ status: 'loading' });

  async function fetchVerdict() {
    setState({ status: 'loading' });
    try {
      const res = await fetch('/api/players/osint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, team, position }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lookup failed');
      setState({ status: 'done', result: json });
    } catch (err) {
      setState({ status: 'error', error: err.message });
    }
  }

  useEffect(() => {
    fetchVerdict();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.status === 'loading') {
    return <>Checking the latest news...</>;
  }

  if (state.status === 'error') {
    return (
      <>
        {fallback} <span className={styles.error}>({state.error})</span>{' '}
        <button type="button" className={styles.buttonSmall} onClick={fetchVerdict}>
          Retry
        </button>
      </>
    );
  }

  const { result } = state;
  return (
    <>
      <span className={`${styles.verdictBadge} ${styles[`verdict${result.verdict}`]}`}>{result.verdict}</span>
      {' — '}
      {result.summary}{' '}
      <button type="button" className={styles.buttonSmall} onClick={fetchVerdict}>
        Get latest news
      </button>
    </>
  );
}

// On-demand only (button click) - waiver scans are a weekly-cadence
// decision, not something to re-run on every page visit, and each call
// costs a news search + an LLM call across the whole available pool.
export function WaiverWirePickups({ leagueId }) {
  const [state, setState] = useState({ status: 'idle' });

  async function handleClick() {
    setState({ status: 'loading' });
    try {
      const res = await fetch(`/api/leagues/${leagueId}/waivers`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lookup failed');
      setState({ status: 'done', result: json });
    } catch (err) {
      setState({ status: 'error', error: err.message });
    }
  }

  return (
    <div>
      <h2 className={styles.sectionTitle}>Waiver Wire Pickups</h2>

      {state.status === 'idle' && (
        <button type="button" className={styles.buttonSmall} onClick={handleClick}>
          Scan waiver wire
        </button>
      )}
      {state.status === 'loading' && <p className={styles.message}>Scanning ESPN, Yahoo, and more...</p>}
      {state.status === 'error' && <p className={`${styles.message} ${styles.error}`}>{state.error}</p>}

      {state.status === 'done' &&
        (state.result.recommendations.length === 0 ? (
          <p className={styles.subtitle}>{state.result.note || 'No recommendations found.'}</p>
        ) : (
          <ul className={styles.list}>
            {state.result.recommendations.map((r, i) => (
              <li key={i} className={styles.playerRow}>
                <div>
                  <div className={styles.playerName}>{r.name}</div>
                  <div className={styles.playerMeta}>
                    {[r.position, r.team].filter(Boolean).join(' — ')}
                  </div>
                  <p className={styles.playerMeta}>{r.reason}</p>
                </div>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}

export function PlayerRow({ player, slot }) {
  if (player.isEmpty) {
    return (
      <li className={styles.playerRow}>
        {slot && <div className={styles.slotLabel}>{slot}</div>}
        <div className={styles.playerMeta}>Empty</div>
      </li>
    );
  }

  return (
    <li className={styles.playerRow}>
      {slot && <div className={styles.slotLabel}>{slot}</div>}
      <div className={styles.playerName}>{player.full_name}</div>
      {(player.position || player.team) && (
        <div className={styles.playerMeta}>{[player.position, player.team].filter(Boolean).join(' — ')}</div>
      )}
      {player.injury_status && (
        <div className={styles.injuryBadge}>{injuryAbbreviation(player.injury_status)}</div>
      )}
    </li>
  );
}

export function PlayerSection({ title, players, showSlot }) {
  if (!players?.length) return null;
  return (
    <>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <ul className={styles.list}>
        {players.map((p, i) => (
          <PlayerRow key={`${p.player_id}-${i}`} player={p} slot={showSlot ? p.slot : null} />
        ))}
      </ul>
    </>
  );
}

// readOnly hides the dismiss control entirely (not just disables it) -
// used for opponent views, where dismissing someone else's roster
// alerts wouldn't mean anything.
function Card({ id, dismissed, onDismiss, readOnly, children }) {
  if (!readOnly && dismissed.has(id)) return null;
  return (
    <div className={styles.recommendationCard}>
      {!readOnly && (
        <button type="button" className={styles.dismissButton} onClick={() => onDismiss(id)} aria-label="Dismiss">
          ×
        </button>
      )}
      {children}
    </div>
  );
}

function BenchOptions({ slot, options }) {
  if (!options?.length) return null;
  return (
    <>
      <p className={styles.playerMeta}>On the bench, eligible for {slot}:</p>
      <ul className={styles.list}>
        {options.map((b) => (
          <PlayerRow key={b.player_id} player={b} />
        ))}
      </ul>
    </>
  );
}

export function Recommendations({
  irRecommendations,
  availableByPosition,
  byeAlerts,
  criticalStatusStarters,
  riskyStatusStarters,
  lineupSwapRecommendations,
  openBenchSlots,
  taxiRecommendations,
  emptyStarterSlots,
  healthyOnIr,
  dismissed,
  onDismiss,
  readOnly = false,
}) {
  const hasEmpty = emptyStarterSlots?.length > 0;
  const hasCritical = criticalStatusStarters?.length > 0;
  const hasBye = byeAlerts?.length > 0;
  const hasRisky = riskyStatusStarters?.length > 0;
  const hasSwap = lineupSwapRecommendations?.length > 0;
  const hasOpenSlot = openBenchSlots > 0;
  const hasIr = irRecommendations?.length > 0;
  const hasHealthyOnIr = healthyOnIr?.length > 0;
  const hasTaxi = taxiRecommendations?.length > 0;
  if (
    !hasEmpty &&
    !hasCritical &&
    !hasBye &&
    !hasRisky &&
    !hasSwap &&
    !hasOpenSlot &&
    !hasIr &&
    !hasHealthyOnIr &&
    !hasTaxi
  ) {
    return null;
  }

  const cardProps = { dismissed: dismissed || new Set(), onDismiss: onDismiss || (() => {}), readOnly };

  return (
    <>
      <h2 className={styles.sectionTitle}>Recommendations</h2>

      {/* Tier 1: starter guaranteed zero points - empty slot, Out/IR/PUP, or bye */}
      {hasEmpty &&
        emptyStarterSlots.map((s, i) => (
          <Card key={`empty-${i}`} id={`empty-${i}`} {...cardProps}>
            <p>
              Slot <strong>{s.slot}</strong> is empty — that's guaranteed zero points. Fill it before kickoff.
            </p>
            <BenchOptions slot={s.slot} options={s.benchOptions} />
          </Card>
        ))}

      {hasCritical &&
        criticalStatusStarters.map((rec) => (
          <Card key={`critical-${rec.player.player_id}`} id={`critical-${rec.player.player_id}`} {...cardProps}>
            <p>
              <strong>{rec.player.full_name}</strong> ({rec.player.team}) is {rec.player.injury_status}
              {rec.player.practice_participation ? ` (Practice: ${rec.player.practice_participation})` : ''} in the{' '}
              <strong>{rec.player.slot}</strong> slot —{' '}
              <VerdictTail
                name={rec.player.full_name}
                team={rec.player.team}
                position={rec.player.position}
                fallback="that's guaranteed (or near-guaranteed) zero points. Swap them out before kickoff."
              />
            </p>
            <BenchOptions slot={rec.player.slot} options={rec.benchOptions} />
          </Card>
        ))}

      {byeAlerts.map((alert) => (
        <Card key={`bye-${alert.player.player_id}`} id={`bye-${alert.player.player_id}`} {...cardProps}>
          <p>
            <strong>{alert.player.full_name}</strong> ({alert.player.team}) is on bye in Week {alert.byeWeek}
            {alert.byeWeek === alert.currentWeek ? ' — this week' : ' — next week'}. Swap him out before kickoff.
          </p>
          <BenchOptions slot={alert.player.slot} options={alert.benchOptions} />
        </Card>
      ))}

      {/* Tier 2: risky but not guaranteed - Doubtful/Questionable starters */}
      {hasRisky &&
        riskyStatusStarters.map((rec) => (
          <Card key={`risky-${rec.player.player_id}`} id={`risky-${rec.player.player_id}`} {...cardProps}>
            <p>
              <strong>{rec.player.full_name}</strong> ({rec.player.team}) is {rec.player.injury_status} this week
              {rec.player.practice_participation ? ` (Practice: ${rec.player.practice_participation})` : ''} —{' '}
              <VerdictTail
                name={rec.player.full_name}
                team={rec.player.team}
                position={rec.player.position}
                fallback="verify they're playing before kickoff."
              />
            </p>
            <BenchOptions slot={rec.player.slot} options={rec.benchOptions} />
          </Card>
        ))}

      {hasSwap &&
        lineupSwapRecommendations.map((rec) => (
          <Card
            key={`swap-${rec.starter.player_id}`}
            id={`swap-${rec.starter.player_id}-${rec.bench.player_id}`}
            {...cardProps}
          >
            <p>
              <strong>{rec.bench.full_name}</strong> is projected for {rec.benchPoints.toFixed(1)} pts vs{' '}
              <strong>{rec.starter.full_name}</strong>'s {rec.starterPoints.toFixed(1)} pts in the{' '}
              <strong>{rec.starter.slot}</strong> slot — a {(rec.benchPoints - rec.starterPoints).toFixed(1)} point
              gap. Consider starting {rec.bench.full_name} instead.
            </p>
          </Card>
        ))}

      {/* Tier 3: open bench slot */}
      {hasOpenSlot && (
        <Card id="open-bench-slot" {...cardProps}>
          <p>
            {openBenchSlots} open bench slot{openBenchSlots > 1 ? 's' : ''} — room to pick up a free agent without
            dropping anyone.
          </p>
        </Card>
      )}

      {/* Tier 4: move an inactive bench/taxi player to IR */}
      {irRecommendations.map((rec) => {
        const available = availableByPosition?.[rec.player.position] || [];
        return (
          <Card key={rec.player.player_id} id={`ir-${rec.player.player_id}`} {...cardProps}>
            <p>
              <strong>{rec.player.full_name}</strong> ({rec.player.injury_status}) is on the{' '}
              {rec.source === 'taxi' ? 'taxi squad' : 'bench'}.{' '}
              {rec.irSlotsOpen > 0
                ? `Move to IR to free a ${rec.source === 'taxi' ? 'taxi' : 'bench'} spot.`
                : `No open IR slots — consider dropping a ${rec.source === 'taxi' ? 'taxi squad' : 'bench'} player instead.`}
            </p>

            {available.length > 0 && (
              <>
                <p className={styles.playerMeta}>Available {rec.player.position}s (unranked):</p>
                <ul className={styles.list}>
                  {available.map((c) => (
                    <PlayerRow key={c.player_id} player={c} />
                  ))}
                </ul>
              </>
            )}
          </Card>
        );
      })}

      {hasHealthyOnIr &&
        healthyOnIr.map((rec) => (
          <Card key={`healthy-${rec.player.player_id}`} id={`healthy-${rec.player.player_id}`} {...cardProps}>
            <p>
              <strong>{rec.player.full_name}</strong> is on IR but isn't marked injured anymore.{' '}
              {rec.hasBenchRoom
                ? 'There is room to bring them back to the bench.'
                : "It'll need a drop to bring them back."}
            </p>
          </Card>
        ))}

      {/* Tier 5: taxi-eligible bench players */}
      {hasTaxi &&
        taxiRecommendations.map((rec) => (
          <Card key={`taxi-${rec.player.player_id}`} id={`taxi-${rec.player.player_id}`} {...cardProps}>
            <p>
              <strong>{rec.player.full_name}</strong> ({rec.player.position},{' '}
              {rec.player.years_exp === 0 ? 'rookie' : `${rec.player.years_exp}yr`}) is on the bench and still
              taxi-eligible.{' '}
              {rec.taxiSlotsOpen > 0
                ? 'Move to taxi to free a bench spot.'
                : 'No open taxi slots — nothing to do unless one opens up.'}
            </p>
          </Card>
        ))}
    </>
  );
}
