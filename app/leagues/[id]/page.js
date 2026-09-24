'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCognito } from '../../cognito-context';
import { injuryAbbreviation } from '../../../lib/injuryStatus';
import styles from '../../shared.module.css';

function PlayerRow({ player, slot }) {
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

function PlayerSection({ title, players, showSlot }) {
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

function Card({ id, dismissed, onDismiss, children }) {
  if (dismissed.has(id)) return null;
  return (
    <div className={styles.recommendationCard}>
      <button
        type="button"
        className={styles.dismissButton}
        onClick={() => onDismiss(id)}
        aria-label="Dismiss"
      >
        ×
      </button>
      {children}
    </div>
  );
}

function BenchOptions({ slot, options }) {
  if (!options?.length) return null;
  return (
    <>
      <p className={styles.playerMeta}>On your bench, eligible for {slot}:</p>
      <ul className={styles.list}>
        {options.map((b) => (
          <PlayerRow key={b.player_id} player={b} />
        ))}
      </ul>
    </>
  );
}

function Recommendations({
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

  const cardProps = { dismissed, onDismiss };

  return (
    <>
      <h2 className={styles.sectionTitle}>Recommendations</h2>

      {/* Tier 1: starter guaranteed zero points - empty slot, Out/IR/PUP, or bye */}
      {hasEmpty &&
        emptyStarterSlots.map((s, i) => (
          <Card key={`empty-${i}`} id={`empty-${i}`} {...cardProps}>
            <p>
              Your <strong>{s.slot}</strong> slot is empty — that's guaranteed zero points. Fill it before kickoff.
            </p>
            <BenchOptions slot={s.slot} options={s.benchOptions} />
          </Card>
        ))}

      {hasCritical &&
        criticalStatusStarters.map((rec) => (
          <Card key={`critical-${rec.player.player_id}`} id={`critical-${rec.player.player_id}`} {...cardProps}>
            <p>
              <strong>{rec.player.full_name}</strong> ({rec.player.team}) is {rec.player.injury_status} — that's
              guaranteed (or near-guaranteed) zero points in your <strong>{rec.player.slot}</strong> slot. Swap them
              out before kickoff.
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
              <strong>{rec.player.full_name}</strong> ({rec.player.team}) is {rec.player.injury_status} this week —
              verify they're playing before kickoff.
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
              <strong>{rec.starter.full_name}</strong>'s {rec.starterPoints.toFixed(1)} pts in your{' '}
              <strong>{rec.starter.slot}</strong> slot — a {(rec.benchPoints - rec.starterPoints).toFixed(1)} point
              gap. Consider starting {rec.bench.full_name} instead.
            </p>
          </Card>
        ))}

      {/* Tier 3: open bench slot */}
      {hasOpenSlot && (
        <Card id="open-bench-slot" {...cardProps}>
          <p>
            You have {openBenchSlots} open bench slot{openBenchSlots > 1 ? 's' : ''} — room to pick up a free agent
            without dropping anyone.
          </p>
        </Card>
      )}

      {/* Tier 4: move an inactive bench/taxi player to IR */}
      {irRecommendations.map((rec) => {
        const available = availableByPosition?.[rec.player.position] || [];
        return (
          <Card key={rec.player.player_id} id={`ir-${rec.player.player_id}`} {...cardProps}>
            <p>
              <strong>{rec.player.full_name}</strong> ({rec.player.injury_status}) is on your{' '}
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
                ? 'You have room to bring them back to the bench.'
                : "You'll need to make room (drop someone) to bring them back."}
            </p>
          </Card>
        ))}

      {/* Tier 5: taxi-eligible bench players */}
      {hasTaxi &&
        taxiRecommendations.map((rec) => (
          <Card key={`taxi-${rec.player.player_id}`} id={`taxi-${rec.player.player_id}`} {...cardProps}>
            <p>
              <strong>{rec.player.full_name}</strong> ({rec.player.position},{' '}
              {rec.player.years_exp === 0 ? 'rookie' : `${rec.player.years_exp}yr`}) is on your bench and still
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

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// Taxi dismissals mean "keep this player active, stop suggesting it" -
// permanent. Everything else means "seen it today" - if it's still true
// tomorrow (not actually fixed), it should reappear rather than staying
// silently hidden forever.
function isPermanentDismiss(cardId) {
  return cardId.startsWith('taxi-');
}

function loadDismissedState(leagueId) {
  const empty = { day: todayKey(), daily: [], permanent: [] };
  try {
    const raw = localStorage.getItem(`automanager:dismissed:${leagueId}`);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);

    // Migrate the old plain-array format (everything permanent) into
    // the new shape, sorting into daily/permanent by id.
    if (Array.isArray(parsed)) {
      return {
        day: todayKey(),
        daily: parsed.filter((cardId) => !isPermanentDismiss(cardId)),
        permanent: parsed.filter(isPermanentDismiss),
      };
    }

    if (parsed.day !== todayKey()) {
      return { ...parsed, day: todayKey(), daily: [] };
    }
    return parsed;
  } catch {
    return empty;
  }
}

function saveDismissedState(leagueId, state) {
  try {
    localStorage.setItem(`automanager:dismissed:${leagueId}`, JSON.stringify(state));
  } catch {
    // Ignore - dismissal is a convenience, not critical state.
  }
}

export default function LeagueRosterPage() {
  const router = useRouter();
  const { id } = useParams();
  const { sdkReady, configError, session } = useCognito();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [dismissedState, setDismissedState] = useState({ day: todayKey(), daily: [], permanent: [] });
  const dismissed = new Set([...dismissedState.daily, ...dismissedState.permanent]);
  const [emailStatus, setEmailStatus] = useState({ text: '', error: false });

  useEffect(() => {
    if (!sdkReady || configError) return;
    if (session === null) router.replace('/login');
  }, [sdkReady, configError, session, router]);

  useEffect(() => {
    if (!session) return;
    fetch(`/api/leagues/${id}`)
      .then((res) => res.json())
      .then((json) => (json.error ? setError(json.error) : setData(json)));
  }, [session, id]);

  useEffect(() => {
    const state = loadDismissedState(id);
    setDismissedState(state);
    saveDismissedState(id, state);
  }, [id]);

  async function handleEmail() {
    setEmailStatus({ text: 'Sending...', error: false });
    // Taxi recommendations are the one type where a dismissal means "I
    // want this player active, stop suggesting it" rather than "handled
    // for now" - so those (and only those) also drop out of the email.
    const roster = {
      ...data.roster,
      taxiRecommendations: (data.roster.taxiRecommendations || []).filter(
        (rec) => !dismissed.has(`taxi-${rec.player.player_id}`)
      ),
    };
    const res = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ league: data.league, roster }),
    });
    const json = await res.json();
    setEmailStatus(
      res.ok ? { text: 'Sent.', error: false } : { text: json.error || 'Failed to send.', error: true }
    );
  }

  function handleDismiss(cardId) {
    setDismissedState((prev) => {
      const next = isPermanentDismiss(cardId)
        ? { ...prev, permanent: [...new Set([...prev.permanent, cardId])] }
        : { ...prev, daily: [...new Set([...prev.daily, cardId])] };
      saveDismissedState(id, next);
      return next;
    });
  }

  if (!sdkReady || session === undefined || session === null) {
    return null;
  }

  return (
    <div className={styles.wideContainer}>
      <p className={styles.linkRow}>
        <Link className={styles.link} href="/leagues">
          ← My Leagues
        </Link>
      </p>

      {error && <p className={`${styles.message} ${styles.error}`}>{error}</p>}
      {!error && !data && <p>Loading...</p>}

      {data && (
        <>
          <h1 className={styles.title}>{data.league.name}</h1>
          <p className={styles.subtitle}>Your Roster</p>

          <div className={styles.rosterGrid}>
            <div>
              <p className={styles.linkRow}>
                <button className={styles.buttonSmall} type="button" onClick={handleEmail}>
                  Email me these recommendations
                </button>
                {emailStatus.text && (
                  <span className={`${styles.message} ${emailStatus.error ? styles.error : ''}`}>
                    {' '}
                    {emailStatus.text}
                  </span>
                )}
              </p>

              <Recommendations
                irRecommendations={data.roster.irRecommendations}
                availableByPosition={data.roster.availableByPosition}
                byeAlerts={data.roster.byeAlerts}
                criticalStatusStarters={data.roster.criticalStatusStarters}
                riskyStatusStarters={data.roster.riskyStatusStarters}
                lineupSwapRecommendations={data.roster.lineupSwapRecommendations}
                openBenchSlots={data.roster.openBenchSlots}
                taxiRecommendations={data.roster.taxiRecommendations}
                emptyStarterSlots={data.roster.emptyStarterSlots}
                healthyOnIr={data.roster.healthyOnIr}
                dismissed={dismissed}
                onDismiss={handleDismiss}
              />
            </div>

            <div className={styles.rosterSections}>
              <div>
                <PlayerSection title="Starters" players={data.roster.starters} showSlot />
              </div>
              <div>
                <PlayerSection title="Bench" players={data.roster.bench} />
              </div>
              <div>
                <PlayerSection title="IR" players={data.roster.ir} />
              </div>
              <div>
                <PlayerSection title="Taxi Squad" players={data.roster.taxi} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
