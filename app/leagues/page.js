'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCognito } from '../cognito-context';
import styles from '../shared.module.css';

export default function LeaguesPage() {
  const router = useRouter();
  const { sdkReady, configError, session } = useCognito();
  const [leagues, setLeagues] = useState(null);

  useEffect(() => {
    if (!sdkReady || configError) return;
    if (session === null) router.replace('/login');
  }, [sdkReady, configError, session, router]);

  useEffect(() => {
    if (!session) return;
    fetch(`/api/leagues?username=${encodeURIComponent(session)}`)
      .then((res) => res.json())
      .then(setLeagues);
  }, [session]);

  if (!sdkReady || session === undefined || session === null) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>My Leagues</h1>
      <p className={styles.linkRow}>
        <Link className={styles.link} href="/leagues/import">
          Import another league
        </Link>
      </p>

      {leagues === null && <p>Loading...</p>}
      {leagues?.length === 0 && <p className={styles.subtitle}>No leagues imported yet.</p>}
      {leagues?.length > 0 && (
        <ul className={styles.list}>
          {leagues.map((league) => (
            <li key={league.id} className={styles.listItem}>
              <Link className={styles.link} href={`/leagues/${league.id}`}>
                {league.name} ({league.season})
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
