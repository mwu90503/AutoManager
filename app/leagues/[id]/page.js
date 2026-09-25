'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCognito } from '../../cognito-context';
import { PlayerSection, Recommendations, WaiverWirePickups } from '../../components/RosterRecommendations';
import { todayKey, isPermanentDismiss, loadDismissedState, saveDismissedState } from '../../../lib/dismissedState';
import styles from '../../shared.module.css';

export default function LeagueRosterPage() {
  const router = useRouter();
  const { id } = useParams();
  const { sdkReady, configError, session } = useCognito();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [dismissedState, setDismissedState] = useState({ day: todayKey(), daily: [], permanent: [] });
  const dismissed = new Set([...dismissedState.daily, ...dismissedState.permanent]);
  const [emailStatus, setEmailStatus] = useState({ text: '', error: false });
  const [friendUsername, setFriendUsername] = useState('');
  const [friendView, setFriendView] = useState(null);
  const [friendStatus, setFriendStatus] = useState({ text: '', error: false });

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

  useEffect(() => {
    const state = loadDismissedState(id);
    setDismissedState(state);
    saveDismissedState(id, state);
  }, [id]);

  useEffect(() => {
    if (!session) return;
    const params = new URLSearchParams(window.location.search);
    const ownerId = params.get('ownerId');
    if (!ownerId) return;
    setFriendStatus({ text: 'Loading...', error: false });
    fetch(`/api/leagues/${id}/friend?ownerId=${encodeURIComponent(ownerId)}&teamName=${encodeURIComponent(params.get('teamName') || '')}`)
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!ok) {
          setFriendStatus({ text: json.error || 'Failed to load.', error: true });
          return;
        }
        setFriendView(json);
        setFriendStatus({ text: '', error: false });
      });
  }, [session, id]);

  async function handleEmail() {
    setEmailStatus({ text: 'Sending...', error: false });
    // Taxi and lineup-swap recommendations are the types where a
    // dismissal means "I've made my call, stop suggesting it" rather
    // than "handled for now" - so those (and only those) also drop out
    // of the email.
    const roster = {
      ...data.roster,
      taxiRecommendations: (data.roster.taxiRecommendations || []).filter(
        (rec) => !dismissed.has(`taxi-${rec.player.player_id}`)
      ),
      lineupSwapRecommendations: (data.roster.lineupSwapRecommendations || []).filter(
        (rec) => !dismissed.has(`swap-${rec.starter.player_id}-${rec.bench.player_id}`)
      ),
    };
    const res = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ league: data.league, roster, username: session }),
    });
    const json = await res.json();
    setEmailStatus(
      res.ok ? { text: 'Sent.', error: false } : { text: json.error || 'Failed to send.', error: true }
    );
  }

  function handleDismiss(cardId) {
    setDismissedState((prev) => {
      const next = isPermanentDismiss(cardId)
        ? { ...prev, permanent: [...new Set([...prev.permanent, cardId])] }
        : { ...prev, daily: [...new Set([...prev.daily, cardId])] };
      saveDismissedState(id, next);
      return next;
    });
  }

  async function handleViewFriend(e) {
    e.preventDefault();
    setFriendStatus({ text: 'Loading...', error: false });
    const res = await fetch(`/api/leagues/${id}/friend?username=${encodeURIComponent(friendUsername)}`);
    const json = await res.json();
    if (!res.ok) {
      setFriendStatus({ text: json.error || 'Failed to load.', error: true });
      return;
    }
    setFriendView(json);
    setFriendStatus({ text: '', error: false });
  }

  function handleBackToMyRoster() {
    setFriendView(null);
    setFriendUsername('');
    setFriendStatus({ text: '', error: false });
    router.replace(`/leagues/${id}`);
  }

  const view = friendView || data;
  const viewingFriend = Boolean(friendView);

  if (!sdkReady || session === undefined || session === null) {
    return null;
  }

  return (
    <div className={styles.wideContainer}>
      <p className={styles.linkRow}>
        <Link className={styles.link} href="/leagues">
          ← My Leagues
        </Link>
      </p>

      {error && <p className={`${styles.message} ${styles.error}`}>{error}</p>}
      {!error && !data && <p>Loading...</p>}

      {data && (
        <>
          <h1 className={styles.title}>{view.league.name}</h1>
          <p className={styles.subtitle}>
            {viewingFriend ? `${view.roster.team_name || friendUsername}'s Roster (snapshot, not saved)` : 'Your Roster'}
          </p>

          {viewingFriend ? (
            <p className={styles.linkRow}>
              <button className={styles.buttonSmall} type="button" onClick={handleBackToMyRoster}>
                ← Back to my roster
              </button>
            </p>
          ) : (
            <form className={styles.form} onSubmit={handleViewFriend}>
              <input
                className={styles.input}
                type="text"
                placeholder="View a friend's Sleeper username"
                value={friendUsername}
                onChange={(e) => setFriendUsername(e.target.value)}
                required
              />
              <button className={styles.buttonSmall} type="submit">
                View
              </button>
            </form>
          )}
          {friendStatus.text && (
            <p className={`${styles.message} ${friendStatus.error ? styles.error : ''}`}>{friendStatus.text}</p>
          )}

          <div className={styles.rosterGrid}>
            <div>
              {!viewingFriend && (
                <p className={styles.linkRow}>
                  <button className={styles.buttonSmall} type="button" onClick={handleEmail}>
                    Email me these recommendations
                  </button>
                  {emailStatus.text && (
                    <span className={`${styles.message} ${emailStatus.error ? styles.error : ''}`}>
                      {' '}
                      {emailStatus.text}
                    </span>
                  )}
                </p>
              )}

              <Recommendations
                irRecommendations={view.roster.irRecommendations}
                availableByPosition={view.roster.availableByPosition}
                byeAlerts={view.roster.byeAlerts}
                criticalStatusStarters={view.roster.criticalStatusStarters}
                riskyStatusStarters={view.roster.riskyStatusStarters}
                lineupSwapRecommendations={view.roster.lineupSwapRecommendations}
                openBenchSlots={view.roster.openBenchSlots}
                taxiRecommendations={view.roster.taxiRecommendations}
                emptyStarterSlots={view.roster.emptyStarterSlots}
                healthyOnIr={view.roster.healthyOnIr}
                dismissed={dismissed}
                onDismiss={handleDismiss}
                readOnly={viewingFriend}
              />

              {!viewingFriend && <WaiverWirePickups leagueId={id} />}
            </div>

            <div className={styles.rosterSections}>
              <div>
                <PlayerSection title="Starters" players={view.roster.starters} showSlot />
              </div>
              <div>
                <PlayerSection title="Bench" players={view.roster.bench} />
              </div>
              <div>
                <PlayerSection title="IR" players={view.roster.ir} />
              </div>
              <div>
                <PlayerSection title="Taxi Squad" players={view.roster.taxi} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
