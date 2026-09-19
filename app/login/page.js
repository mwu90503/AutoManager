'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import styles from './login.module.css';

export default function LoginPage() {
  const [sdkReady, setSdkReady] = useState(false);
  const [tab, setTab] = useState('signin');
  const [message, setMessage] = useState({ text: '', error: false });
  const [session, setSession] = useState(null);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [configError, setConfigError] = useState('');
  const userPoolRef = useRef(null);

  useEffect(() => {
    if (!sdkReady) return;
    try {
      userPoolRef.current = new window.AmazonCognitoIdentity.CognitoUserPool({
        UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
        ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
      });
    } catch (err) {
      setConfigError(err.message);
      return;
    }

    const currentUser = userPoolRef.current.getCurrentUser();
    if (currentUser) {
      currentUser.getSession((err, sess) => {
        if (!err && sess.isValid()) setSession(currentUser.getUsername());
      });
    }
  }, [sdkReady]);

  function switchTab(next) {
    setTab(next);
    setMessage({ text: '', error: false });
  }

  function handleSignUp(e) {
    e.preventDefault();
    if (!userPoolRef.current) return;
    const { email, password } = Object.fromEntries(new FormData(e.target));
    const attributeList = [
      new window.AmazonCognitoIdentity.CognitoUserAttribute({ Name: 'email', Value: email }),
    ];
    userPoolRef.current.signUp(email, password, attributeList, null, (err) => {
      if (err) return setMessage({ text: err.message, error: true });
      setMessage({ text: 'Sign up successful. Check your email for a confirmation code.', error: false });
      setConfirmEmail(email);
      setTab('confirm');
    });
  }

  function handleConfirm(e) {
    e.preventDefault();
    if (!userPoolRef.current) return;
    const { email, code } = Object.fromEntries(new FormData(e.target));
    const cognitoUser = new window.AmazonCognitoIdentity.CognitoUser({
      Username: email,
      Pool: userPoolRef.current,
    });
    cognitoUser.confirmRegistration(code, true, (err) => {
      if (err) return setMessage({ text: err.message, error: true });
      setMessage({ text: 'Account confirmed. You can now sign in.', error: false });
      setTab('signin');
    });
  }

  function handleSignIn(e) {
    e.preventDefault();
    if (!userPoolRef.current) return;
    const { email, password } = Object.fromEntries(new FormData(e.target));
    const authDetails = new window.AmazonCognitoIdentity.AuthenticationDetails({
      Username: email,
      Password: password,
    });
    const cognitoUser = new window.AmazonCognitoIdentity.CognitoUser({
      Username: email,
      Pool: userPoolRef.current,
    });
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: () => setSession(email),
      onFailure: (err) => setMessage({ text: err.message, error: true }),
    });
  }

  function handleSignOut() {
    const cognitoUser = userPoolRef.current?.getCurrentUser();
    if (cognitoUser) cognitoUser.signOut();
    setSession(null);
  }

  return (
    <div className={styles.page}>
      <Script
        src="https://cdn.jsdelivr.net/npm/amazon-cognito-identity-js@6.3.12/dist/amazon-cognito-identity.min.js"
        onReady={() => setSdkReady(true)}
      />
      <div className={styles.card}>
        <h1 className={styles.heading}>Account</h1>

        {configError ? (
          <div className={`${styles.message} ${styles.messageError}`}>
            Login is not configured yet: {configError}
          </div>
        ) : session ? (
          <div className={styles.session}>
            <p>Signed in as {session}</p>
            <button className={styles.button} onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        ) : (
          <>
            <div className={styles.tabs}>
              <button
                type="button"
                className={`${styles.tab} ${tab === 'signin' ? styles.tabActive : ''}`}
                onClick={() => switchTab('signin')}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`${styles.tab} ${tab === 'signup' ? styles.tabActive : ''}`}
                onClick={() => switchTab('signup')}
              >
                Sign Up
              </button>
            </div>

            <form
              className={`${styles.form} ${tab === 'signin' ? styles.formActive : ''}`}
              onSubmit={handleSignIn}
            >
              <input className={styles.input} type="email" name="email" placeholder="Email" required />
              <input className={styles.input} type="password" name="password" placeholder="Password" required />
              <button className={styles.button} type="submit">
                Sign In
              </button>
            </form>

            <form
              className={`${styles.form} ${tab === 'signup' ? styles.formActive : ''}`}
              onSubmit={handleSignUp}
            >
              <input className={styles.input} type="email" name="email" placeholder="Email" required />
              <input className={styles.input} type="password" name="password" placeholder="Password" required />
              <button className={styles.button} type="submit">
                Sign Up
              </button>
            </form>

            <form
              className={`${styles.form} ${tab === 'confirm' ? styles.formActive : ''}`}
              onSubmit={handleConfirm}
            >
              <input
                className={styles.input}
                type="email"
                name="email"
                placeholder="Email"
                defaultValue={confirmEmail}
                required
              />
              <input className={styles.input} type="text" name="code" placeholder="Confirmation code" required />
              <button className={styles.button} type="submit">
                Confirm Account
              </button>
            </form>

            {message.text && (
              <div className={`${styles.message} ${message.error ? styles.messageError : styles.messageSuccess}`}>
                {message.text}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
