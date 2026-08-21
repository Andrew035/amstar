import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Tailwind Upgraded Register Page 
export const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    setIsSubmitting(true);

    try {
      // Adjust this URL if your backend auth endpoint is different
      const response = await fetch('http://localhost:8080/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        throw new Error('Registration failed. Username might be taken.');
      }

      setSuccessMessage("Registration successful! Redirecting to login...");
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (error: any) {
      setError(error.message || 'Failed to connect to server.');
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
        </div>

        <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Create Technician Account</h2>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm font-bold rounded-lg text-center border border-red-100">{error}</div>}
        {successMessage && <div className='mb-4 p-3 bg-emerald-50 text-emerald-600 text-sm font-bold rounded-lg text-center border border-emerald-100 flex items-center justify-center gap-2'>{successMessage}</div>}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amstar-blue transition shadow-sm"
              placeholder="Choose a username"
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
              placeholder="Create a password"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amstar-blue transition shadow-sm"
              placeholder="Repeat password"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 mt-2 bg-amstar-red hover:bg-red-700 text-white font-bold rounded-lg shadow-md transition disabled:opacity-70"
          >
            {isSubmitting ? 'Registering...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-amstar-blue font-bold hover:underline">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  );
};
