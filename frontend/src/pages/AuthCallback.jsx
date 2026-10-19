import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

import Spinner from '../components/ui/Spinner';
import apiClient from '../lib/apiClient';
import { setSession } from '../lib/auth';
import { OAUTH_PROVIDERS, oauthErrorMessage } from '../lib/oauth';

/**
 * Landing page after the Google/GitHub round trip.
 *
 * The server has already set the httpOnly session cookie before redirecting
 * here; all this page does is confirm the result, read the non-sensitive user
 * object (so the navbar updates immediately) and send the visitor home.
 * Reachable at /auth/callback — nothing to do with the /api/auth/* endpoints.
 */
const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const [phase, setPhase] = useState('working');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const status = searchParams.get('status');
  const provider = searchParams.get('provider') || '';
  const code = searchParams.get('code');
  const label = OAUTH_PROVIDERS.find((item) => item.id === provider)?.label || '';

  useEffect(() => {
    if (status !== 'success') {
      setPhase('error');
      setMessage(oauthErrorMessage(code, provider));
      return undefined;
    }

    let alive = true;
    apiClient
      .get('/me', { skipAuthRedirect: true })
      .then(({ data }) => {
        if (!alive) return;
        if (!data?.success || !data.user) {
          setPhase('error');
          setMessage('Your session could not be restored. Please try signing in again.');
          return;
        }
        setSession(data.user, { remember: true });
        window.dispatchEvent(new Event('auth:changed'));
        setPhase('done');
        setTimeout(() => navigate('/', { replace: true }), 1200);
      })
      .catch(() => {
        if (!alive) return;
        setPhase('error');
        setMessage('Your session could not be restored. Please try signing in again.');
      });

    return () => {
      alive = false;
    };
  }, [status, provider, code, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center page-bg p-4">
      <div className="w-full max-w-md glass-card border border-white/20 rounded-2xl p-8 shadow-xl text-center space-y-5">
        {phase === 'working' && (
          <>
            <Spinner className="w-10 h-10 text-pink-300 mx-auto" />
            <h1 className="text-2xl font-bold text-white">Completing sign-in…</h1>
            <p className="text-sm text-gray-200">
              {label ? `Talking to ${label} and opening your session.` : 'Opening your session.'}
            </p>
          </>
        )}

        {phase === 'done' && (
          <>
            <FaCheckCircle className="w-12 h-12 text-green-400 mx-auto" />
            <h1 className="text-2xl font-bold text-white">
              Signed in{label ? ` with ${label}` : ''}!
            </h1>
            <p className="text-sm text-gray-200">Taking you to your dashboard…</p>
          </>
        )}

        {phase === 'error' && (
          <>
            <FaExclamationTriangle className="w-12 h-12 text-amber-400 mx-auto" />
            <h1 className="text-2xl font-bold text-white">Sign-in didn’t finish</h1>
            <p className="text-sm text-red-300">{message}</p>
            <div className="flex flex-col gap-3 pt-2">
              <Link
                to="/login"
                className="w-full btn-primary text-white font-bold py-3 rounded-lg transition-all"
              >
                Back to Login
              </Link>
              <Link to="/" className="text-sm text-pink-300 hover:underline">
                Go to home page
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
