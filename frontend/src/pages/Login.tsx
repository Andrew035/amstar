import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

//  Tailwind Upgraded Login Page
export const Login: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
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
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        throw new Error('Invalid username or password');
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
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 w-full max-w-md">

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-4 h-8 bg-amstar-red rounded-sm" />
            <h1 className="text-3xl font-black text-amstar-blue tracking-tight leading-none">AM STAR</h1>
          </div>
          <span className="text-sm font-semibold text-slate-500 tracking-widest uppercase">Transmissions</span>
        </div>

        <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Technician Portal Login</h2>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm font-bold rounded-lg text-center border border-red-100">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amstar-blue transition shadow-sm"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amstar-blue transition shadow-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-amstar-blue hover:bg-slate-800 text-white font-bold rounded-lg shadow-md transition disabled:opacity-70"
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Need an account?{' '}
          <Link to="/register" className="text-amstar-blue font-bold hover:underline">
            Register here
          </Link>
        </p>

      </div>
    </div>
  );
};
