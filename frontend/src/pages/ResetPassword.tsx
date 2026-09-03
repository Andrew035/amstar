import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { SHARED_INPUT_STYLE, PANEL_STYLE, LABEL_STYLE } from '../styles/controls';
import { API_BASE } from '../config';

export const ResetPassword: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? 'Could not reset the password.');
        return;
      }
      navigate('/login');
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <div className={`${PANEL_STYLE} p-8 shadow-2xl w-full max-w-md text-center`}>
          <p className="text-sm text-amstar-ink-dim mb-6">
            This reset link is missing its token. Request a new one.
          </p>
          <Link to="/forgot-password" className="text-amstar-red-ink font-bold hover:underline">
            Request a reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <div className={`${PANEL_STYLE} p-8 shadow-2xl w-full max-w-md`}>
        <h2 className="font-cond text-xl uppercase tracking-wider text-amstar-ink mb-6 text-center">
          Choose a New Password
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-amstar-red/20 text-white text-sm font-bold rounded-lg text-center border border-amstar-red">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={LABEL_STYLE}>New Password</label>
            <input type="password" required value={password}
              onChange={e => setPassword(e.target.value)}
              className={SHARED_INPUT_STYLE} placeholder="At least 8 characters" />
          </div>
          <div>
            <label className={LABEL_STYLE}>Confirm Password</label>
            <input type="password" required value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className={SHARED_INPUT_STYLE} placeholder="••••••••" />
          </div>
          <button type="submit" disabled={isSubmitting}
            className="w-full py-3 bg-amstar-red hover:bg-red-700 text-white font-cond uppercase tracking-widest rounded-sm shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)] transition disabled:opacity-70">
            {isSubmitting ? 'Saving...' : 'Set Password'}
          </button>
        </form>
      </div>
    </div>
  );
};
