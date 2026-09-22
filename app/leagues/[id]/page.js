'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCognito } from '../../cognito-context';
import styles from '../../shared.module.css';

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
          <ul className={styles.list}>
            {data.roster.resolvedPlayers.map((p) => (
              <li key={p.player_id} className={styles.playerRow}>
                <div className={styles.playerName}>{p.full_name}</div>
                {(p.position || p.team) && (
                  <div className={styles.playerMeta}>
                    {[p.position, p.team].filter(Boolean).join(' — ')}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
