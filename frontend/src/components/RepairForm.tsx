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

  // Vehicle Specification States
  const [vin, setVin] = useState('');
  const [vehicleMake, setVehicleMake] = useState('Unknown');
  const [vehicleModel, setVehicleModel] = useState('Vehicle');
  const [vehicleYear, setVehicleYear] = useState<number>(new Date().getFullYear());
  const [carImageUrl, setCarImageUrl] = useState('');
  const [isDecoding, setIsDecoding] = useState(false);

  useEffect(() => {
    if (!isAdmin && currentUser) {
      setAssignedWorker(currentUser);
    }
  }, [currentUser, isAdmin]);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // NHTSA VIN DECODER api 1
  const handleDecodeVin = async () => {
    if (!vin || vin.length !== 17) {
      setError("Please enter a valid 17-character VIN.");
      return;
    }

    setIsDecoding(true);
    setError('');

    try {
      // Fetch specs from the US Department of Transportation
      const nhtsaResponse = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`);
      const nhtsaData = await nhtsaResponse.json();
      const vehicleInfo = nhtsaData.Results[0];

      if (vehicleInfo.Make && vehicleInfo.Model) {
        setVehicleMake(vehicleInfo.Make);
        setVehicleModel(vehicleInfo.Model);
        setVehicleYear(Number(vehicleInfo.ModelYear) || new Date().getFullYear());

        // Pass the decoded info to our Image Search API
        fetchVehicleImage(vehicleInfo.Make, vehicleInfo.Model);
      } else {
        setError("VIN decoded, but Make/Model were not found.");
      }
    } catch (error) {
      setError("Failed to decode VIN. The NHTSA service might be down.");
    } finally {
      setIsDecoding(false);
    }
  }

  // WIKIMEDIA ARTICLE MAIN IMAGE SEARCH api 2
  const fetchVehicleImage = async (make: string, model: string) => {
    try {
      // OpenSearch to find the exact official Wikipedia article title      
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(make + ' ' + model)}&limit=1&format=json&origin=*`;
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      // Ensure the search actually found a matching article
      if (searchData[1] && searchData[1].length > 0) {
        const exactTitle = searchData[1][0]; // e.g., "Ford F-150" resolves to "Ford F-Series"

        // Modern REST API to fetch the page summary and images
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(exactTitle)}`;
        const summaryResponse = await fetch(summaryUrl);
        const summaryData = await summaryResponse.json();

        // Prefer the high-resolution original image, fallback to the standard thumbnail
        if (summaryData.originalimage && summaryData.originalimage.source) {
          setCarImageUrl(summaryData.originalimage.source);
        } else if (summaryData.thumbnail && summaryData.thumbnail.source) {
          setCarImageUrl(summaryData.thumbnail.source);
        } else {
          console.log("Article found, but no main image was attached.");
        }
      } else {
        console.log("No exact Wikipedia match found.");
      }
    } catch (error) {
      console.error("Failed to fetch image from Wikipedia REST API.", error);
    }
  };

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
        vin: vin || "Unknown",
        licensePlate,
        state: vehicleState,
        make: vehicleMake,
        model: vehicleModel,
        year: vehicleYear,
        carImageUrl: carImageUrl
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
      setVin('');
      setVehicleMake('Unknown');
      setVehicleModel('Vehicle');
      setVehicleYear(new Date().getFullYear());
      setCarImageUrl('');
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
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>VIN (Optional)</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={vin}
              onChange={e => setVin(e.target.value.toUpperCase())}
              maxLength={17}
              placeholder='17-Digit VIN'
              style={{ ...sharedInputStyle, flex: 1 }}
            />
            <button
              type="button"
              onClick={handleDecodeVin}
              disabled={isDecoding || vin.length !== 17}
              style={{ padding: '0 1rem', background: '#0b3068', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {isDecoding ? '...' : 'Decode'}
            </button>
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

        {vehicleMake !== "Unknown" && (
          <div style={{ gridColumn: '1 / -1', background: '#f8f9fa', padding: '1rem', borderRadius: '4px', border: '1px solid #e9ecef', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {carImageUrl && <img src={carImageUrl} alt="Vehicle" style={{ width: '100px', borderRadius: '4px', objectFit: 'cover' }} />}
            <div>
              <strong>Decoded Vehicle:</strong>
              <p style={{ margin: 0 }}>{vehicleYear} {vehicleMake} {vehicleModel}</p>
            </div>
          </div>
        )}
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
