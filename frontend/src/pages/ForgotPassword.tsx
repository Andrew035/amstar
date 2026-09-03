import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SHARED_INPUT_STYLE, PANEL_STYLE, LABEL_STYLE } from '../styles/controls';
import { API_BASE } from '../config';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch {
      // The response is deliberately identical either way, so a network
      // failure shows the same confirmation rather than leaking a difference.
    }
    setSent(true);
    setIsSubmitting(false);
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <div className={`${PANEL_STYLE} p-8 shadow-2xl w-full max-w-md`}>
        <h2 className="font-cond text-xl uppercase tracking-wider text-amstar-ink mb-2 text-center">
          Reset Password
        </h2>

        {sent ? (
          <>
            <p className="text-sm text-amstar-ink-dim text-center mt-6 mb-6">
              If that address has an account, a reset link is on its way. The link expires in 30 minutes.
            </p>
            <Link to="/login" className="block text-center text-amstar-red-ink font-bold hover:underline">
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-amstar-ink-dim text-center mb-6">
              Enter your email and we'll send you a link to choose a new password.
            </p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={LABEL_STYLE}>Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={SHARED_INPUT_STYLE}
                  placeholder="you@email.com"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-amstar-red hover:bg-red-700 text-white font-cond uppercase tracking-widest rounded-sm shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)] transition disabled:opacity-70"
              >
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-amstar-ink-dim">
              <Link to="/login" className="text-amstar-red-ink font-bold hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};
