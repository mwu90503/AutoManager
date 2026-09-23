'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCognito } from '../../cognito-context';
import { injuryAbbreviation } from '../../../lib/injuryStatus';
import styles from '../../shared.module.css';

function PlayerRow({ player, slot }) {
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

function Recommendations({ irRecommendations, availableByPosition, byeAlerts, openBenchSlots }) {
  const hasIr = irRecommendations?.length > 0;
  const hasBye = byeAlerts?.length > 0;
  const hasOpenSlot = openBenchSlots > 0;
  if (!hasIr && !hasBye && !hasOpenSlot) return null;

  return (
    <>
      <h2 className={styles.sectionTitle}>Recommendations</h2>

      {hasOpenSlot && (
        <div className={styles.recommendationCard}>
          <p>
            You have {openBenchSlots} open bench slot{openBenchSlots > 1 ? 's' : ''} — room to pick up a free agent
            without dropping anyone.
          </p>
        </div>
      )}

      {byeAlerts.map((alert) => (
        <div key={`bye-${alert.player.player_id}`} className={styles.recommendationCard}>
          <p>
            <strong>{alert.player.full_name}</strong> ({alert.player.team}) is on bye in Week {alert.byeWeek}
            {alert.byeWeek === alert.currentWeek ? ' — this week' : ' — next week'}. Swap him out before kickoff.
          </p>

          {alert.benchOptions.length > 0 && (
            <>
              <p className={styles.playerMeta}>On your bench at {alert.player.position}:</p>
              <ul className={styles.list}>
                {alert.benchOptions.map((b) => (
                  <PlayerRow key={b.player_id} player={b} />
                ))}
              </ul>
            </>
          )}
        </div>
      ))}

      {irRecommendations.map((rec) => {
        const available = availableByPosition?.[rec.player.position] || [];
        return (
          <div key={rec.player.player_id} className={styles.recommendationCard}>
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
          </div>
        );
      })}
    </>
  );
}

export default function LeagueRosterPage() {
  const router = useRouter();
  const { id } = useParams();
  const { sdkReady, configError, session } = useCognito();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

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
            openBenchSlots={data.roster.openBenchSlots}
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
