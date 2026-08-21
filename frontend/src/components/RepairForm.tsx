import React, { useState, useEffect } from 'react';

interface RepairFormProps {
  onSuccess: () => void;
  currentUser: string;
  isAdmin: boolean;
  historicalServiceMap: Record<string, number>
}

export const RepairForm: React.FC<RepairFormProps> = ({ onSuccess, currentUser, isAdmin, historicalServiceMap }) => {
  const [customerName, setCustomerName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleState, setVehicleState] = useState('MD');
  const [serviceType, setServiceType] = useState('');
  const [severity, setSeverity] = useState<number>(3);
  const [expectedCompletionDate, setExpectedCompletionDate] = useState('');
  const [assignedWorkersArray, setAssignedWorkersArray] = useState<string[]>([]);

  // Vehicle Specification States
  const [vin, setVin] = useState('');

  const workersList = [
    { id: "Technician 1", name: "Technician 1" },
    { id: "Technician 2", name: "Technician 2" },
    { id: "Technician 3", name: "Technician 3" },
  ]

  useEffect(() => {
    if (!isAdmin && currentUser) {
      setAssignedWorkersArray([currentUser]);
    }
  }, [currentUser, isAdmin]);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleWorker = (id: string) => {
    if (assignedWorkersArray.includes(id)) {
      setAssignedWorkersArray(assignedWorkersArray.filter(w => w !== id));
    } else {
      setAssignedWorkersArray([...assignedWorkersArray, id]);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Establish fallback variables in case the API fails or no VIN is provided
    let finalMake = "Unknown";
    let finalModel = "Vehicle";
    let finalYear = new Date().getFullYear();
    let finalImageUrl = "";

    // Decoding: Wait for the APIs to fetch the data BEFORE building the payload
    if (vin && vin.length === 17) {
      try {
        // Fetch specs from the US Department of Transportation
        const nhtsaResponse = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`);
        const nhtsaData = await nhtsaResponse.json();
        const vehicleInfo = nhtsaData.Results[0];

        if (vehicleInfo.Make && vehicleInfo.Model) {
          finalMake = vehicleInfo.Make;
          finalModel = vehicleInfo.Model;
          finalYear = Number(vehicleInfo.ModelYear) || finalYear;

          // Fetch Image from Wikipedia REST API using the freshly decoded Make & Model
          const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(finalMake + ' ' + finalModel)}&limit=1&format=json&origin=*`;
          const searchResponse = await fetch(searchUrl);
          const searchData = await searchResponse.json();

          if (searchData[1] && searchData[1].length > 0) {
            const exactTitle = searchData[1][0];
            const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(exactTitle)}`;
            const summaryResponse = await fetch(summaryUrl);
            const summaryData = await summaryResponse.json();

            if (summaryData.originalimage && summaryData.originalimage.source) {
              finalImageUrl = summaryData.originalimage.source;
            } else if (summaryData.thumbnail && summaryData.thumbnail.source) {
              finalImageUrl = summaryData.thumbnail.source;
            }
          }
        }
      } catch (error) {
        console.warn("Background decoding failed, proceeding with default empty vehicle specs.", error);
      }
    }
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
      assignedWorker: isAdmin ? assignedWorkersArray.join(', ') : currentUser, // Admin choice OR Worker default
      status: 'PENDING',
      vehicle: {
        vin: vin || "Unknown",
        licensePlate,
        state: vehicleState,
        make: finalMake,
        model: finalModel,
        year: finalYear,
        carImageUrl: finalImageUrl
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
      setVin('');
      setLicensePlate('');
      setServiceType('');
      setSeverity(3);
      setExpectedCompletionDate('');
      if (isAdmin) setAssignedWorkersArray([]);

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
    fontSize: '0.95rem',
    height: '40px',
    WebkitAppearance: 'none',
    appearance: 'none',
  };

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
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>VIN (17-Digits)</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={vin}
              onChange={e => setVin(e.target.value.toUpperCase())}
              maxLength={17}
              placeholder='e.g. 1G1RC6E45BU...'
              style={sharedInputStyle}
            />
          </div>
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

          <input
            type="text"
            list="historical-services"
            value={serviceType}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              setServiceType(val);
              // Auto-fill severity if the service matches our historical memory!
              if (historicalServiceMap[val]) {
                setSeverity(historicalServiceMap[val]);
              }
            }}
            placeholder='Search or type a new service...'
            required
            style={sharedInputStyle}
          />
          <datalist id="historical-services">
            {Object.keys(historicalServiceMap).sort().map((service, idx) => (
              <option key={idx} value={service} />
            ))}
          </datalist>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Severity Level</label>
          <select
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            required
            style={sharedInputStyle}
          >
            <option value={1}>Level 1 - Routine / Low</option>
            <option value={2}>Level 2 - Minor Repair</option>
            <option value={3}>Level 3 - Standard Repair</option>
            <option value={4}>Level 4 - Major / Urgent</option>
            <option value={5}>Level 5 - Critical / Safety</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Target Completion</label>
          <input type="date" value={expectedCompletionDate} onChange={e => setExpectedCompletionDate(e.target.value)} required style={sharedInputStyle} />
        </div>

        {isAdmin && (
          <div className='md:col-span-2'>
            <label className='block text-sm font-bold text-slate-600 mb-2'>Assign Technician(s) <span className='font-normal text-xs text-slate-400 ml-2'>(Optional)</span></label>
            <div className='flex flex-wrap gap-2'>
              {workersList.map(w => {
                const isSelected = assignedWorkersArray.includes(w.id);
                return (
                  <button
                    type='button'
                    key={w.id}
                    onClick={() => toggleWorker(w.id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition border shadow-sm ${isSelected
                      ? 'bg-amstar-blue text-white border-amstar-blue hover:bg-slate-800'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                      }`}
                  >
                    {isSelected && <span className='mr-1.5'>{'\u2713'}</span>}
                    {w.name}
                  </button>
                )
              })}
            </div>
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
