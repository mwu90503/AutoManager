'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Script from 'next/script';

const CognitoContext = createContext(null);

// Cognito's own "username" here is an opaque generated id, not the
// email the person signed up with (the pool treats email as an alias,
// not the real username) - the email itself lives as a user attribute.
// Synced once per session so the backend can actually email this
// person, since every league/roster row is keyed to the opaque
// username, not the email.
function syncEmail(currentUser, username) {
  currentUser.getUserAttributes((err, attributes) => {
    if (err) return;
    const email = attributes?.find((a) => a.getName() === 'email')?.getValue();
    if (!email) return;
    fetch('/api/account/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email }),
    }).catch(() => {});
  });
}

// session: undefined = still checking, null = signed out, string = signed-in user's email
export function CognitoProvider({ children }) {
  const [sdkReady, setSdkReady] = useState(false);
  const [configError, setConfigError] = useState('');
  const [session, setSession] = useState(undefined);
  const userPoolRef = useRef(null);

  const refreshSession = useCallback(() => {
    if (!userPoolRef.current) return;
    const currentUser = userPoolRef.current.getCurrentUser();
    if (!currentUser) {
      setSession(null);
      return;
    }
    currentUser.getSession((err, sess) => {
      const valid = !err && sess.isValid();
      setSession(valid ? currentUser.getUsername() : null);
      if (valid) syncEmail(currentUser, currentUser.getUsername());
    });
  }, []);

  useEffect(() => {
    if (!sdkReady) return;
    try {
      userPoolRef.current = new window.AmazonCognitoIdentity.CognitoUserPool({
        UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
        ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
      });
    } catch (err) {
      setConfigError(err.message);
      setSession(null);
      return;
    }
    refreshSession();
  }, [sdkReady, refreshSession]);

  function signOut() {
    const cognitoUser = userPoolRef.current?.getCurrentUser();
    if (cognitoUser) cognitoUser.signOut();
    setSession(null);
  }

  return (
    <CognitoContext.Provider value={{ sdkReady, configError, session, userPoolRef, refreshSession, signOut }}>
      <Script
        src="https://cdn.jsdelivr.net/npm/amazon-cognito-identity-js@6.3.12/dist/amazon-cognito-identity.min.js"
        onReady={() => setSdkReady(true)}
      />
      {children}
    </CognitoContext.Provider>
  );
}

export function useCognito() {
  const ctx = useContext(CognitoContext);
  if (!ctx) throw new Error('useCognito must be used within CognitoProvider');
  return ctx;
}
