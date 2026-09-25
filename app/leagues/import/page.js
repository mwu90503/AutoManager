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
  const [espnS2, setEspnS2] = useState('');
  const [espnSwid, setEspnSwid] = useState('');
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
      body: JSON.stringify({
        leagueId: espnLeagueId,
        season: espnSeason,
        username: session,
        espnS2,
        swid: espnSwid,
      }),
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
      <p className={styles.subtitle}>
        ESPN has no public login for apps like this one, so importing needs your own league ID plus two values
        copied out of your browser (think of them like a temporary login for this one import — not your ESPN
        password). Every person importing their own ESPN league does this with their own account.
      </p>

      <details className={styles.helpBox}>
        <summary className={styles.helpSummary}>How do I find my espn_s2 and SWID values?</summary>
        <ol className={styles.helpList}>
          <li>
            Log into your ESPN Fantasy Football account at{' '}
            <a className={styles.link} href="https://fantasy.espn.com" target="_blank" rel="noreferrer">
              fantasy.espn.com
            </a>{' '}
            in a normal browser tab — make sure you're actually signed in.
          </li>
          <li>
            Open Developer Tools:
            <ul className={styles.helpList}>
              <li>Chrome / Edge: press F12, or right-click the page → "Inspect"</li>
              <li>Firefox: press F12, or right-click the page → "Inspect"</li>
              <li>
                Safari: turn on the Develop menu first (Safari → Settings → Advanced → "Show Develop menu"), then
                Develop → "Show Web Inspector"
              </li>
            </ul>
          </li>
          <li>
            Find the cookie list:
            <ul className={styles.helpList}>
              <li>
                Chrome / Edge: click the <strong>Application</strong> tab, then in the left sidebar expand{' '}
                <strong>Cookies</strong> and click <strong>https://fantasy.espn.com</strong>
              </li>
              <li>
                Firefox: click the <strong>Storage</strong> tab, expand <strong>Cookies</strong>, and click{' '}
                <strong>https://fantasy.espn.com</strong>
              </li>
              <li>
                Safari: click the <strong>Storage</strong> tab, then <strong>Cookies</strong>
              </li>
            </ul>
          </li>
          <li>
            In that list, find the rows named <strong>espn_s2</strong> and <strong>SWID</strong>. Click each one and
            copy its <strong>Value</strong> — espn_s2 is a long string of letters/numbers; SWID looks like{' '}
            <code>{'{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}'}</code>.
          </li>
          <li>Paste both values into the fields below.</li>
        </ol>
        <p className={styles.playerMeta}>
          Treat these like your ESPN password — don't share them with anyone you don't trust. They can stop working
          if you log out of ESPN everywhere or change your password; if import ever fails, just repeat these steps
          for fresh values.
        </p>
      </details>

      <form onSubmit={handleEspnImport}>
        <div className={styles.form}>
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
        </div>
        <div className={styles.form}>
          <input
            className={styles.input}
            type="password"
            placeholder="espn_s2 value"
            value={espnS2}
            onChange={(e) => setEspnS2(e.target.value)}
            required
          />
          <input
            className={styles.input}
            type="password"
            placeholder="SWID value"
            value={espnSwid}
            onChange={(e) => setEspnSwid(e.target.value)}
            required
          />
        </div>
        <button className={styles.button} type="submit">
          Import
        </button>
      </form>
      <p className={styles.playerMeta}>
        League ID is in your league's URL: fantasy.espn.com/football/team?leagueId=XXXXXXX
      </p>
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
