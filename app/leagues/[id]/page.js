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
  const hasOpenSlot = openBenchSlots > 0;
  const hasIr = irRecommendations?.length > 0;
  const hasHealthyOnIr = healthyOnIr?.length > 0;
  const hasTaxi = taxiRecommendations?.length > 0;
  if (
    !hasEmpty &&
    !hasCritical &&
    !hasBye &&
    !hasRisky &&
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

      {/* Tier 3: open bench slot */}
      {hasOpenSlot && (
        <Card id="open-bench-slot" {...cardProps}>
          <p>
            You have {openBenchSlots} open bench slot{openBenchSlots > 1 ? 's' : ''} — room to pick up a free agent
            without dropping anyone.
          </p>
        </Card>
      )}

      {/* Tier 4: move an inactive bench player to IR */}
      {irRecommendations.map((rec) => {
        const available = availableByPosition?.[rec.player.position] || [];
        return (
          <Card key={rec.player.player_id} id={`ir-${rec.player.player_id}`} {...cardProps}>
            <p>
              <strong>{rec.player.full_name}</strong> ({rec.player.injury_status}) is on your bench.{' '}
              {rec.irSlotsOpen > 0
                ? 'Move to IR to free a bench spot.'
                : 'No open IR slots — consider dropping a bench player instead.'}
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

function loadDismissed(leagueId) {
  try {
    const raw = localStorage.getItem(`automanager:dismissed:${leagueId}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(leagueId, dismissed) {
  try {
    localStorage.setItem(`automanager:dismissed:${leagueId}`, JSON.stringify([...dismissed]));
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
  const [dismissed, setDismissed] = useState(new Set());

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
    setDismissed(loadDismissed(id));
  }, [id]);

  function handleDismiss(cardId) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(cardId);
      saveDismissed(id, next);
      return next;
    });
  }

  if (!sdkReady || session === undefined || session === null) {
    return null;
  }

  return (
    <div className={styles.container}>
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

          <Recommendations
            irRecommendations={data.roster.irRecommendations}
            availableByPosition={data.roster.availableByPosition}
            byeAlerts={data.roster.byeAlerts}
            criticalStatusStarters={data.roster.criticalStatusStarters}
            riskyStatusStarters={data.roster.riskyStatusStarters}
            openBenchSlots={data.roster.openBenchSlots}
            taxiRecommendations={data.roster.taxiRecommendations}
            emptyStarterSlots={data.roster.emptyStarterSlots}
            healthyOnIr={data.roster.healthyOnIr}
            dismissed={dismissed}
            onDismiss={handleDismiss}
          />

          <PlayerSection title="Starters" players={data.roster.starters} showSlot />
          <PlayerSection title="Bench" players={data.roster.bench} />
          <PlayerSection title="IR" players={data.roster.ir} />
          <PlayerSection title="Taxi Squad" players={data.roster.taxi} />
        </>
      )}
    </div>
  );
}
