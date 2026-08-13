import React, { useState } from 'react';

interface RepairFormProps {
  onSuccess: () => void;
}

export const RepairForm: React.FC<RepairFormProps> = ({ onSuccess }) => {
  const [customerName, setCustomerName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleState, setVehicleState] = useState('MD');
  const [serviceType, setServiceType] = useState('');
  const [severity, setSeverity] = useState<number>(3);
  const [expectedCompletionDate, setExpectedCompletionDate] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const token = localStorage.getItem('amstar_token');

    // Automatically set the entry date to today
    const entryDate = new Date().toISOString().split('T')[0];

    // Construct the nested JSON payload expected by our backend
    const payload = {
      customerName,
      serviceType,
      severity,
      entryDate,
      expectedCompletionDate,
      status: 'PENDING',
      vehicle: {
        licensePlate,
        state: vehicleState
      }
    };

    try {
      const response = await fetch('http://localhost:8080/api/repairs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to submit repair ticket');
      }

      // Restet the form on success
      setCustomerName('');
      setLicensePlate('');
      setServiceType('');
      setSeverity(3);
      setExpectedCompletionDate('');

      // Trigger the queue to refresh
      onSuccess();
    } catch (err) {
      setError('Failed to submit. Ensure you are logged in and the server is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
      <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>New Vehicle Intake</h3>
      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>

        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Customer Name</label>
          <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} required style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>License Plate</label>
          <input type="text" value={licensePlate} onChange={e => setLicensePlate(e.target.value)} required style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Vehicle State</label>
          <input type="text" value={vehicleState} onChange={e => setVehicleState(e.target.value.toUpperCase())} maxLength={2} required style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Service Type</label>
          <input type="text" value={serviceType} onChange={e => setServiceType(e.target.value)} required style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Severity (1-5)</label>
          <select value={severity} onChange={e => setSeverity(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}>
            <option value={1}>1 - Routine Maintenance</option>
            <option value={2}>2 - Minor Repair</option>
            <option value={3}>3 - Standard Repair</option>
            <option value={4}>4 - Major Repair</option>
            <option value={5}>5 - Critical / Vehicle Disabled</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Target Completion</label>
          <input type="date" value={expectedCompletionDate} onChange={e => setExpectedCompletionDate(e.target.value)} required style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }} />
        </div>

        <div style={{ gridColumn: '1 / -1', textAlign: 'right', marginTop: '0.5rem' }}>
          <button type="submit" disabled={isSubmitting} style={{ padding: '0.75rem 1.5rem', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isSubmitting ? 'Submitting...' : 'Add to Queue'}
          </button>
        </div>

      </form>
    </div>
  );
};
