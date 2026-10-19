import React, { useState, useEffect } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../lib/apiClient';
import { extractErrorMessage } from '../lib/api';

/**
 * Two-step password reset:
 *   1. Request a one-time code for an email address.
 *   2. Submit that code together with the new password.
 * The server never accepts "email + newPassword" alone, so an attacker
 * cannot take over an account without access to the mailbox (or, in local
 * development, the backend console where the code is printed).
 */
const ForgotPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Arriving from the email link: /reset-password?token=...
  useEffect(() => {
    const linkedToken = searchParams.get('token');
    if (linkedToken) {
      setToken(linkedToken);
      setStep('reset');
    }
  }, [searchParams]);

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/forgot-password', { email });
      setInfo(
        res.data.message ||
          'If an account exists for that email, a password reset code has been sent.'
      );
      setStep('reset');
    } catch (err) {
      setError(await extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!token.trim() || !newPassword || !confirmPassword) {
      setError('All fields are required!');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match!');
      return;
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Password must be at least 8 characters and contain a letter and a number.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/reset-password', {
        token: token.trim(),
        newPassword,
      });
      if (res.data.success) {
        setInfo('Password changed successfully! You can now log in.');
        setToken('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setError(res.data.message || 'Failed to reset password');
      }
    } catch (err) {
      setError(await extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center page-bg p-4">
      <div className="w-full max-w-md glass-card border border-white/20 rounded-2xl p-8 shadow-xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold gradient-title">
            {step === 'request' ? 'Forgot Password' : 'Reset Password'}
          </h1>
          <p className="text-sm text-white">
            {step === 'request'
              ? 'We will send you a one-time reset code'
              : 'Enter the reset code and your new password'}
          </p>
        </div>

        {step === 'request' ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white">Email</label>
              <input
                type="email"
                id="email"
                className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {error && <p className="text-red-400 text-center text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary text-white font-bold py-3 rounded-lg transition-all disabled:opacity-60"
            >
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {info && <p className="text-green-300 text-center text-sm">{info}</p>}

            <div>
              <label htmlFor="token" className="block text-sm font-medium text-white">Reset Code</label>
              <input
                type="text"
                id="token"
                className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400 tracking-widest"
                placeholder="Paste the 64-character code"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-white">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  id="newPassword"
                  className="w-full p-3 pr-10 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <div
                  className="absolute inset-y-0 right-3 flex items-center cursor-pointer text-gray-300 hover:text-white"
                  onClick={() => setShowNew(!showNew)}
                >
                  {showNew ? <FaEyeSlash /> : <FaEye />}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-white">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  id="confirmPassword"
                  className="w-full p-3 pr-10 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <div
                  className="absolute inset-y-0 right-3 flex items-center cursor-pointer text-gray-300 hover:text-white"
                  onClick={() => setShowConfirm(!showConfirm)}
                >
                  {showConfirm ? <FaEyeSlash /> : <FaEye />}
                </div>
              </div>
            </div>

            {error && <p className="text-red-400 text-center text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary text-white font-bold py-3 rounded-lg transition-all disabled:opacity-60"
            >
              {loading ? 'Updating...' : 'Change Password'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('request');
                setError('');
                setInfo('');
              }}
              className="w-full text-sm text-pink-300 hover:underline"
            >
              Use a different email
            </button>
          </form>
        )}

        <p className="text-sm text-center text-gray-300">
          <Link to="/login" className="text-pink-300 hover:underline"><b>Back to Login</b></Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
