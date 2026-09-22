'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Script from 'next/script';

const CognitoContext = createContext(null);

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
      setSession(!err && sess.isValid() ? currentUser.getUsername() : null);
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
