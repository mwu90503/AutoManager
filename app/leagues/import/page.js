'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCognito } from '../../cognito-context';
import styles from '../../shared.module.css';

export default function ImportLeaguePage() {
  const router = useRouter();
  const { sdkReady, configError, session } = useCognito();
  const [username, setUsername] = useState('');
  const [sleeperUserId, setSleeperUserId] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const [status, setStatus] = useState({ text: '', error: false });
  const [importedLeague, setImportedLeague] = useState(null);
  const [espnLeagueId, setEspnLeagueId] = useState('');
  const [espnSeason, setEspnSeason] = useState(String(new Date().getFullYear()));
  const [espnStatus, setEspnStatus] = useState({ text: '', error: false });

  useEffect(() => {
    if (!sdkReady || configError) return;
    if (session === null) router.replace('/login');
  }, [sdkReady, configError, session, router]);

  async function handleLookup(e) {
    e.preventDefault();
    setStatus({ text: 'Looking up leagues...', error: false });
    setLeagues([]);
    setImportedLeague(null);

    const res = await fetch('/api/sleeper/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();

    if (!res.ok) {
      setStatus({ text: data.error, error: true });
      return;
    }

    setSleeperUserId(data.sleeperUserId);
    setLeagues(data.leagues);
    setStatus(
      data.leagues.length
        ? { text: '', error: false }
        : { text: `No ${data.season} leagues found for that username.`, error: true }
    );
  }

  async function handleImport(leagueId) {
    setStatus({ text: 'Importing league...', error: false });

    const res = await fetch('/api/sleeper/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId, sleeperUserId, username: session }),
    });
    const data = await res.json();

    if (!res.ok) {
      setStatus({ text: data.error, error: true });
      return;
    }

    setStatus({ text: `Imported "${data.league.name}".`, error: false });
    setImportedLeague(data);
  }

  async function handleEspnImport(e) {
    e.preventDefault();
    setEspnStatus({ text: 'Importing league...', error: false });

    const res = await fetch('/api/espn/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId: espnLeagueId, season: espnSeason, username: session }),
    });
    const data = await res.json();

    if (!res.ok) {
      setEspnStatus({ text: data.error, error: true });
      return;
    }

    setEspnStatus({ text: `Imported "${data.league.name}".`, error: false });
    setImportedLeague(data);
  }

  if (!sdkReady || session === undefined || session === null) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Import a Sleeper League</h1>
      <p className={styles.linkRow}>
        <Link className={styles.link} href="/leagues">
          ← My Leagues
        </Link>
      </p>

      <form className={styles.form} onSubmit={handleLookup}>
        <input
          className={styles.input}
          type="text"
          placeholder="Sleeper username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <button className={styles.button} type="submit">
          Find Leagues
        </button>
      </form>

      {status.text && (
        <p className={`${styles.message} ${status.error ? styles.error : ''}`}>{status.text}</p>
      )}

      {leagues.length > 0 && (
        <ul className={styles.list}>
          {leagues.map((league) => (
            <li key={league.id} className={styles.listItem}>
              {league.name}
              <button className={styles.buttonSmall} type="button" onClick={() => handleImport(league.id)}>
                Import
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2 className={styles.sectionTitle}>Import an ESPN League</h2>
      <form className={styles.form} onSubmit={handleEspnImport}>
        <input
          className={styles.input}
          type="text"
          placeholder="ESPN league ID"
          value={espnLeagueId}
          onChange={(e) => setEspnLeagueId(e.target.value)}
          required
        />
        <input
          className={`${styles.input} ${styles.inputSmall}`}
          type="text"
          placeholder="Season"
          value={espnSeason}
          onChange={(e) => setEspnSeason(e.target.value)}
          required
        />
        <button className={styles.button} type="submit">
          Import
        </button>
      </form>
      <p className={styles.playerMeta}>League ID is in your league's URL: fantasy.espn.com/football/team?leagueId=XXXXXXX</p>
      {espnStatus.text && (
        <p className={`${styles.message} ${espnStatus.error ? styles.error : ''}`}>{espnStatus.text}</p>
      )}

      {importedLeague?.league && (
        <p className={styles.linkRow}>
          <Link className={styles.link} href={`/leagues/${importedLeague.league.id}`}>
            View your roster →
          </Link>
        </p>
      )}
    </div>
  );
}
