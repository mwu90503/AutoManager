'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCognito } from './cognito-context';

export default function Home() {
  const router = useRouter();
  const { sdkReady, configError, session, signOut } = useCognito();

  useEffect(() => {
    if (!sdkReady || configError) return;
    if (session === null) router.replace('/login');
  }, [sdkReady, configError, session, router]);

  if (configError) {
    return <p>Login is not configured yet: {configError}</p>;
  }

  if (!sdkReady || session === undefined || session === null) {
    return null;
  }

  return (
    <div>
      <p>Welcome to AutoManager</p>
      <p>Signed in as {session}</p>
      <p>
        <Link href="/leagues/import">Import a Sleeper league</Link>
      </p>
      <button
        onClick={() => {
          signOut();
          router.push('/login');
        }}
      >
        Sign Out
      </button>
    </div>
  );
}
