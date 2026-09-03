import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SHARED_INPUT_STYLE, PANEL_STYLE, LABEL_STYLE } from '../styles/controls';
import { API_BASE } from '../config';

//  Tailwind Upgraded Login Page
export const Login: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Adjust this URL if your backend auth endpoint is different
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error('Invalid email or password');
      }

      const data = await response.json();
      // Expecting { token: "eyJ..." } from your Spring Boot backend
      localStorage.setItem('amstar_token', data.token);

      onLoginSuccess();
      navigate('/'); // Redirect to the dashboard
    } catch (err: any) {
      setError(err.message || 'Failed to connect to server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <div className={`${PANEL_STYLE} p-8 shadow-2xl w-full max-w-md`}>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-11 h-11 bg-amstar-red rounded-sm grid place-items-center font-cond font-bold text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.28)]">AM</div>
            <h1 className="font-cond text-3xl font-bold text-amstar-ink tracking-tight leading-none">AM STAR</h1>
          </div>
          <span className="font-cond text-sm text-amstar-ink-dim tracking-[0.22em] uppercase">Transmissions</span>
        </div>

        <h2 className="font-cond text-xl uppercase tracking-wider text-amstar-ink-dim mb-6 text-center">Technician Portal Login</h2>

        {error && <div className="mb-4 p-3 bg-amstar-red/20 text-white text-sm font-bold rounded-lg text-center border border-amstar-red">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-5">
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

          <div>
            <label className={LABEL_STYLE}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={SHARED_INPUT_STYLE}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-amstar-red hover:bg-red-700 text-white font-cond uppercase tracking-widest rounded-sm shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)] transition disabled:opacity-70"
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-amstar-ink-dim">
          Need an account?{' '}
          <Link to="/register" className="text-amstar-red-ink font-bold hover:underline">
            Register here
          </Link>
        </p>

        <p className='mt-4 text-center text-sm'>
          <Link to="/forgot-password" className='text-amstar-ink-dim hover:text-amstar-ink hover:underline'>
            Forgot your passowrd?
          </Link>
        </p>

      </div>
    </div>
  );
};
