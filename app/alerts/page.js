'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCognito } from '../cognito-context';
import { Recommendations } from '../components/RosterRecommendations';
import { todayKey, isPermanentDismiss, loadDismissedState, saveDismissedState } from '../../lib/dismissedState';
import styles from '../shared.module.css';

function hasAnyRecommendations(roster) {
  return (
    roster.emptyStarterSlots?.length > 0 ||
    roster.criticalStatusStarters?.length > 0 ||
    roster.byeAlerts?.length > 0 ||
    roster.riskyStatusStarters?.length > 0 ||
    roster.lineupSwapRecommendations?.length > 0 ||
    roster.openBenchSlots > 0 ||
    roster.irRecommendations?.length > 0 ||
    roster.healthyOnIr?.length > 0 ||
    roster.taxiRecommendations?.length > 0
  );
}

function LeagueAlerts({ league, roster, dismissedState, onDismiss }) {
  const dismissed = new Set([...(dismissedState?.daily || []), ...(dismissedState?.permanent || [])]);

  return (
    <div>
      <h2 className={styles.sectionTitle}>
        <Link className={styles.link} href={`/leagues/${league.id}`}>
          {league.name}
        </Link>
      </h2>
      <Recommendations
        irRecommendations={roster.irRecommendations}
        availableByPosition={roster.availableByPosition}
        byeAlerts={roster.byeAlerts}
        criticalStatusStarters={roster.criticalStatusStarters}
        riskyStatusStarters={roster.riskyStatusStarters}
        lineupSwapRecommendations={roster.lineupSwapRecommendations}
        openBenchSlots={roster.openBenchSlots}
        taxiRecommendations={roster.taxiRecommendations}
        emptyStarterSlots={roster.emptyStarterSlots}
        healthyOnIr={roster.healthyOnIr}
        dismissed={dismissed}
        onDismiss={(cardId) => onDismiss(league.id, cardId)}
      />
    </div>
  );
}

export default function AlertsPage() {
  const router = useRouter();
  const { sdkReady, configError, session } = useCognito();
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [dismissedByLeague, setDismissedByLeague] = useState({});

  useEffect(() => {
    if (!sdkReady || configError) return;
    if (session === null) router.replace('/login');
  }, [sdkReady, configError, session, router]);

  useEffect(() => {
    if (!session) return;
    fetch('/api/alerts')
      .then((res) => res.json())
      .then((json) => (json.error ? setError(json.error) : setResults(json)));
  }, [session]);

  useEffect(() => {
    if (!results) return;
    const next = {};
    for (const { league } of results) {
      const state = loadDismissedState(league.id);
      next[league.id] = state;
      saveDismissedState(league.id, state);
    }
    setDismissedByLeague(next);
  }, [results]);

  function handleDismiss(leagueId, cardId) {
    setDismissedByLeague((prev) => {
      const current = prev[leagueId] || { day: todayKey(), daily: [], permanent: [] };
      const next = isPermanentDismiss(cardId)
        ? { ...current, permanent: [...new Set([...current.permanent, cardId])] }
        : { ...current, daily: [...new Set([...current.daily, cardId])] };
      saveDismissedState(leagueId, next);
      return { ...prev, [leagueId]: next };
    });
  }

  if (!sdkReady || session === undefined || session === null) {
    return null;
  }

  const leaguesWithAlerts = (results || []).filter(({ roster }) => hasAnyRecommendations(roster));

  return (
    <div className={styles.container}>
      <p className={styles.linkRow}>
        <Link className={styles.link} href="/">
          ← Home
        </Link>
      </p>

      <h1 className={styles.title}>Alert Center</h1>
      <p className={styles.subtitle}>Everything across your active leagues that needs attention.</p>

      {error && <p className={`${styles.message} ${styles.error}`}>{error}</p>}
      {!error && results === null && <p>Loading...</p>}
      {results?.length === 0 && <p className={styles.subtitle}>No active leagues yet.</p>}
      {results?.length > 0 && leaguesWithAlerts.length === 0 && (
        <p className={styles.subtitle}>All clear — nothing needs your attention right now.</p>
      )}

      {leaguesWithAlerts.map(({ league, roster }) => (
        <LeagueAlerts
          key={league.id}
          league={league}
          roster={roster}
          dismissedState={dismissedByLeague[league.id]}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  );
}
