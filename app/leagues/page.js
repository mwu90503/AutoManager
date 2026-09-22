'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCognito } from '../cognito-context';

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
    <div>
      <h1>My Leagues</h1>
      <p>
        <Link href="/leagues/import">Import another league</Link>
      </p>

      {leagues === null && <p>Loading...</p>}
      {leagues?.length === 0 && <p>No leagues imported yet.</p>}
      {leagues?.length > 0 && (
        <ul>
          {leagues.map((league) => (
            <li key={league.id}>
              <Link href={`/leagues/${league.id}`}>
                {league.name} ({league.season})
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
