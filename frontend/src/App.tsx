import React, { useState, useEffect } from 'react';
import { RepairQueue } from './components/RepairQueue'
import { Login } from './components/Login';
import { Register } from './components/Register';

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState<boolean>(false);

  // Check if we already have a token when the app loads
  useEffect(() => {
    const savedToken = localStorage.getItem('amstar_token');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('amstar_token');
    setToken(null);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9f9f9', margin: 0, padding: 0 }}>
      <header style={{
        backgroundColor: '#2c3e50',
        color: '#ffffff',
        padding: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>AM Star Transmissions Dashboard</h1>
        {token && (
          <button
            onClick={handleLogout}
            style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
          >
            Logout
          </button>
        )}
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        {/* If we have a token, show the queue. Otherwise, show the login screen. */}
        {token ? (
          <RepairQueue />
        ) : showRegister ? (
          <Register onSwitchToLogin={() => setShowRegister(false)} />
        ) : (
          <Login
            onLoginSuccess={setToken}
            onSwitchToRegister={() => setShowRegister(true)}
          />
        )}
      </main>
    </div>
  );
};

export default App;
