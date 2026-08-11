import React from 'react';
import { RepairQueue } from './components/RepairQueue'

const App: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9f9f9', margin: 0, padding: 0 }}>
      <header style={{
        backgroundColor: '#2c3e50',
        color: '#ffffff',
        padding: '1.5rem',
        textAlign: 'center',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0, fontSize: '2rem' }}>AM Star Transmissions Dashboard</h1>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <RepairQueue />
      </main>
    </div>
  );
};

export default App;
