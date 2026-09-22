'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCognito } from '../../cognito-context';

export default function ImportLeaguePage() {
  const router = useRouter();
  const { sdkReady, configError, session } = useCognito();
  const [username, setUsername] = useState('');
  const [sleeperUserId, setSleeperUserId] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const [status, setStatus] = useState({ text: '', error: false });
  const [importedLeague, setImportedLeague] = useState(null);

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

  if (!sdkReady || session === undefined || session === null) {
    return null;
  }

  return (
    <div>
      <h1>Import a Sleeper League</h1>

      <form onSubmit={handleLookup}>
        <input
          type="text"
          placeholder="Sleeper username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <button type="submit">Find Leagues</button>
      </form>

      {status.text && <p style={{ color: status.error ? 'crimson' : 'inherit' }}>{status.text}</p>}

      {leagues.length > 0 && (
        <ul>
          {leagues.map((league) => (
            <li key={league.id}>
              {league.name}{' '}
              <button type="button" onClick={() => handleImport(league.id)}>
                Import
              </button>
            </li>
          ))}
        </ul>
      )}

      {importedLeague?.league && (
        <p>
          <Link href={`/leagues/${importedLeague.league.id}`}>View your roster →</Link>
        </p>
      )}
    </div>
  );
}
