'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCognito } from '../cognito-context';
import styles from '../shared.module.css';

function LeagueOpponents({ league }) {
  const [opponents, setOpponents] = useState(null);

  useEffect(() => {
    fetch(`/api/leagues/${league.id}/opponents`)
      .then((res) => res.json())
      .then(setOpponents);
  }, [league.id]);

  if (opponents !== null && opponents.length === 0) return null;

  return (
    <>
      <h2 className={styles.sectionTitle}>{league.name}</h2>
      {opponents === null && <p>Loading...</p>}
      {opponents?.length > 0 && (
        <ul className={styles.list}>
          {opponents.map((o) => (
            <li key={o.ownerId} className={styles.listItem}>
              <Link
                className={styles.link}
                href={`/leagues/${league.id}?ownerId=${encodeURIComponent(o.ownerId)}&teamName=${encodeURIComponent(o.teamName)}`}
              >
                {o.teamName}
              </Link>
              <span className={styles.playerMeta}>
                {o.wins}-{o.losses}
                {o.ties ? `-${o.ties}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function OpponentsPage() {
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
      <p className={styles.linkRow}>
        <Link className={styles.link} href="/">
          ← Home
        </Link>
      </p>

      <h1 className={styles.title}>Opponents</h1>
      <p className={styles.subtitle}>Read-only snapshots — nothing here is saved or affects your own team.</p>

      {leagues === null && <p>Loading...</p>}
      {leagues?.length === 0 && <p className={styles.subtitle}>No leagues imported yet.</p>}
      {leagues?.map((league) => (
        <LeagueOpponents key={league.id} league={league} />
      ))}
    </div>
  );
}
