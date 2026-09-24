'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCognito } from './cognito-context';
import styles from './shared.module.css';

export default function Home() {
  const router = useRouter();
  const { sdkReady, configError, session, signOut } = useCognito();

  useEffect(() => {
    if (!sdkReady || configError) return;
    if (session === null) router.replace('/login');
  }, [sdkReady, configError, session, router]);

  if (configError) {
    return (
      <div className={styles.container}>
        <p className={styles.error}>Login is not configured yet: {configError}</p>
      </div>
    );
  }

  if (!sdkReady || session === undefined || session === null) {
    return null;
  }

  return (
    <div className={styles.dashboardContainer}>
      <h1 className={styles.title}>AutoManager</h1>
      <p className={styles.subtitle}>Signed in as {session}</p>

      <div className={styles.navGrid}>
        <Link className={styles.navCard} href="/leagues">
          <div className={styles.navCardTitle}>My Team</div>
          <div className={styles.navCardDesc}>Look up your own rosters, league by league.</div>
        </Link>
        <Link className={styles.navCard} href="/opponents">
          <div className={styles.navCardTitle}>Opponents</div>
          <div className={styles.navCardDesc}>Browse any other team in your leagues — read-only snapshots.</div>
        </Link>
        <Link className={styles.navCard} href="/alerts">
          <div className={styles.navCardTitle}>Alert Center</div>
          <div className={styles.navCardDesc}>Everything across your leagues that needs attention, in one place.</div>
        </Link>
      </div>

      <p className={styles.linkRow}>
        <Link className={styles.link} href="/leagues/import">
          Import a Sleeper league
        </Link>
      </p>

      <button
        className={styles.buttonSmall}
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
