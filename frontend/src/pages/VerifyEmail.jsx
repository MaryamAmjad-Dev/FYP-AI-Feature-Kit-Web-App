import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiClient from '../lib/apiClient';
import { extractErrorMessage } from '../lib/api';

/**
 * Landing page for the link in the signup-verification email:
 * /verify-email?token=...
 * It posts the token to the API once (StrictMode-safe), then either shows
 * the success state or an error state with a resend form.
 */
const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendInfo, setResendInfo] = useState('');
  const [resendError, setResendError] = useState('');
  const [sending, setSending] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('This verification link is incomplete. Request a new email below.');
      return;
    }

    (async () => {
      try {
        const res = await apiClient.post('/verify-email', { token });
        setStatus('success');
        setMessage(res.data.message || 'Email verified successfully. You can now log in.');
      } catch (err) {
        setStatus('error');
        setMessage(await extractErrorMessage(err));
      }
    })();
  }, [searchParams]);

  const handleResend = async (e) => {
    e.preventDefault();
    setResendInfo('');
    setResendError('');

    if (!resendEmail) {
      setResendError('Please enter your email address.');
      return;
    }

    setSending(true);
    try {
      const res = await apiClient.post('/resend-verification', { email: resendEmail });
      setResendInfo(
        res.data.message ||
          'If that account exists and is not verified yet, a new verification email has been sent.'
      );
    } catch (err) {
      setResendError(await extractErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center page-bg p-4">
      <div className="w-full max-w-md glass-card border border-white/20 rounded-2xl p-8 shadow-xl space-y-6 text-center">
        <h1 className="text-3xl font-bold gradient-title">Email Verification</h1>

        {status === 'loading' && (
          <div className="space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-400 mx-auto" />
            <p className="text-sm text-white">Verifying your email…</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="text-5xl">✅</div>
            <p className="text-green-300">{message}</p>
            <Link
              to="/login"
              className="block w-full btn-primary text-white font-bold py-3 rounded-lg transition-all"
            >
              Continue to Login
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="text-5xl">⚠️</div>
            <p className="text-red-400">{message}</p>

            <form onSubmit={handleResend} className="space-y-3 text-left">
              <label htmlFor="resendEmail" className="block text-sm font-medium text-white">
                Didn't get the email? Enter your address to resend it:
              </label>
              <input
                type="email"
                id="resendEmail"
                className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400"
                placeholder="your@email.com"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                required
                disabled={sending}
              />
              {resendInfo && <p className="text-green-300 text-sm">{resendInfo}</p>}
              {resendError && <p className="text-red-400 text-sm">{resendError}</p>}
              <button
                type="submit"
                disabled={sending}
                className="w-full btn-primary text-white font-bold py-3 rounded-lg transition-all disabled:opacity-60"
              >
                {sending ? 'Sending…' : 'Resend Verification Email'}
              </button>
            </form>

            <Link to="/login" className="block text-sm text-pink-300 hover:underline">
              <b>Back to Login</b>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
