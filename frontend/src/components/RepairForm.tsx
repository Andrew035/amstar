import React, { useState, useEffect } from 'react';

const SERVICE_SEVERITY_MAP: Record<string, number> = {
  'Oil changes': 1,
  'Auto fluids and filters maintenance': 1,
  'Routine automotive maintenance': 1,

  'Auto light repair': 2,
  'Transmission leak inspection': 2,

  'Auto battery or electrical system repair': 3,
  'Auto brake repair': 3,
  'Auto HVAC repair': 3,

  'Auto steering and suspension repair': 4,

  'Auto engine repair': 5,
  'Auto transmission repair': 5
};

interface RepairFormProps {
  onSuccess: () => void;
  currentUser: string;
  isAdmin: boolean;
}

export const RepairForm: React.FC<RepairFormProps> = ({ onSuccess, currentUser, isAdmin }) => {
  const [customerName, setCustomerName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleState, setVehicleState] = useState('MD');
  const [serviceType, setServiceType] = useState('');
  const [severity, setSeverity] = useState<number>(3);
  const [expectedCompletionDate, setExpectedCompletionDate] = useState('');

  const [assignedWorker, setAssignedWorker] = useState<string>('');

  useEffect(() => {
    if (!isAdmin && currentUser) {
      setAssignedWorker(currentUser);
    }
  }, [currentUser, isAdmin]);

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
      assignedWorker: isAdmin ? assignedWorker : currentUser, // Admin choice OR Worker default
      status: 'PENDING',
      vehicle: {
        licensePlate,
        state: vehicleState,
        make: "Unknown",
        model: "Vehicle",
        year: 2020
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
      if (isAdmin) setAssignedWorker('');

      // Trigger the queue to refresh
      onSuccess();
    } catch (err) {
      setError('Failed to submit. Ensure you are logged in and the server is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sharedInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.6rem',
    boxSizing: 'border-box',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: '#fff',
    outline: 'none',
    fontSize: '0.95rem'
  }

  return (
    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
      <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>New Vehicle Intake</h3>
      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>

        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Customer Name</label>
          <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} required style={sharedInputStyle} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>License Plate</label>
          <input type="text" value={licensePlate} onChange={e => setLicensePlate(e.target.value)} required style={sharedInputStyle} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Vehicle State</label>
          <input type="text" value={vehicleState} onChange={e => setVehicleState(e.target.value.toUpperCase())} maxLength={2} required style={sharedInputStyle} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Service Type</label>
          <select
            value={serviceType}
            onChange={(e) => {
              const selectedService = e.target.value;
              setServiceType(selectedService);

              // Automatically update the severity based on the map!
              if (SERVICE_SEVERITY_MAP[selectedService]) {
                setSeverity(SERVICE_SEVERITY_MAP[selectedService]);
              }
            }}
            required
            style={sharedInputStyle}
          >
            <option value="" disabled>Select a service...</option>
            <option value="Auto battery or electrical system repair">Auto battery or electrical system repair</option>
            <option value="Auto brake repair">Auto brake repair</option>
            <option value="Auto engine repair">Auto engine repair</option>
            <option value="Auto fluids and filters maintenance">Auto fluids and filters maintenance</option>
            <option value="Auto HVAC repair">Auto HVAC repair</option>
            <option value="Auto light repair">Auto light repair</option>
            <option value="Auto steering and suspension repair">Auto steering and suspension repair</option>
            <option value="Auto transmission repair">Auto transmission repair</option>
            <option value="Oil changes">Oil changes</option>
            <option value="Routine automotive maintenance">Routine automotive maintenance</option>
            <option value="Transmission leak inspection">Transmission leak inspection</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Target Completion</label>
          <input type="date" value={expectedCompletionDate} onChange={e => setExpectedCompletionDate(e.target.value)} required style={sharedInputStyle} />
        </div>

        {isAdmin && (
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Assign To Worker (Optional)</label>
            <select
              value={assignedWorker}
              onChange={e => setAssignedWorker(e.target.value)}
              required
              style={sharedInputStyle}
            >
              <option value="">Unassigned</option>
              <option value="worker1">worker1</option>
              <option value="worker2">worker2</option>
              <option value="worker3">worker3</option>
            </select>
          </div>
        )}

        <div style={{ gridColumn: '1 / -1', textAlign: 'right', marginTop: '0.5rem' }}>
          <button type="submit" disabled={isSubmitting} style={{ padding: '0.75rem 1.5rem', background: '#d62027', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isSubmitting ? 'Submitting...' : 'Add to Queue'}
          </button>
        </div>

      </form>
    </div>
  );
};
