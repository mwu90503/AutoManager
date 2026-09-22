'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCognito } from '../../cognito-context';

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
    <div>
      <p>
        <Link href="/leagues">← My Leagues</Link>
      </p>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {!error && !data && <p>Loading...</p>}

      {data && (
        <>
          <h1>{data.league.name}</h1>
          <h2>Your Roster</h2>
          <ul>
            {data.roster.resolvedPlayers.map((p) => (
              <li key={p.player_id}>
                {p.full_name}
                {p.position ? ` — ${p.position}` : ''}
                {p.team ? ` (${p.team})` : ''}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
