import React, { useEffect, useState } from 'react';
import type { VehicleRepair } from '../types/repair';
import { RepairForm } from './RepairForm';

export const RepairQueue: React.FC = () => {
  const [repairs, setRepairs] = useState<VehicleRepair[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<string>('');

  // State to hold our search query
  const [searchTerm, setSearchTerm] = useState<string>('');

  const isAdmin = currentUser === 'admin1' || currentUser === 'admin2';

  useEffect(() => {
    const token = localStorage.getItem('amstar_token');
    if (token) {
      try {
        // Decode the JWT to find out who is logged in
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUser(payload.sub); // 'sub' is the standard JWT subject (username)
      } catch (error) {
        console.error("Invalid token format");
      }
    }
    fetchQueue();
  }, [])

  const fetchQueue = async () => {
    try {
      const token = localStorage.getItem('amstar_token');
      if (!token) return;

      const response = await fetch('http://localhost:8080/api/repairs/queue', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        // If the token is expired or invalid, log the user out
        localStorage.removeItem('amstar_token');
        window.location.reload();
        return;
      }

      const data = await response.json();
      setRepairs(data);
    } catch (error) {
      console.error('Failed to fetch repairs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle changing the status via the backend
  const handleStatusChange = async (id: number, newStatus: string) => {
    const token = localStorage.getItem('amstar_token');
    try {
      const response = await fetch(`http://localhost:8080/api/repairs/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchQueue(); // Refresh the data so the UI updates instantly
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleAssignWorker = async (id: number, workerUsername: string) => {
    const token = localStorage.getItem("amstar_token");
    try {
      const response = await fetch(`http://localhost:8080/api/repairs/${id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ worker: workerUsername })
      });

      if (response.ok) {
        fetchQueue();
      }
    } catch (error) {
      console.error("Failed to update status:", error)
    }
  }

  // Helper funtion to check if an item matches our search term
  const matchesSearch = (item: VehicleRepair) => {
    if (!searchTerm) return true; // If search is empty, show everything!
    const lowerSearch = searchTerm.toLowerCase();

    return (
      item.customerName?.toLowerCase().includes(lowerSearch) ||
      item.vehicle?.licensePlate?.toLowerCase().includes(lowerSearch) ||
      item.vehicle?.vin?.toLowerCase().includes(lowerSearch) ||
      item.vehicle?.make?.toLowerCase().includes(lowerSearch) ||
      item.vehicle?.model?.toLowerCase().includes(lowerSearch) ||
      item.assignedWorker?.toLowerCase().includes(lowerSearch) ||
      item.serviceType?.toLowerCase().includes(lowerSearch)
    );
  }


  // Filters: Admins see everything. Workers only see their assigned tickets.
  const activeRepairs = repairs
    .filter(r => r.status !== 'COMPLETED' && (isAdmin || r.assignedWorker === currentUser))
    .filter(matchesSearch)
    // Sort descending by priorityScore (highest score goes to the top!)
    .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

  const completedRepairs = repairs
    .filter(r => r.status === 'COMPLETED')
    .filter(matchesSearch)
    // Sort descending by completion date (newest first)
    .sort((a, b) => new Date(b.actualCompletionDate || b.expectedCompletionDate).getTime() - new Date(a.actualCompletionDate || a.expectedCompletionDate).getTime());

  // Shared UI Style for Table Dropdowns
  const tableDropdownStyle: React.CSSProperties = {
    padding: '0.2rem 0.4rem',
    fontSize: '0.8rem',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontWeight: 'bold',
    outline: 'none',
    cursor: 'pointer',
    backgroundColor: '#fff',
    width: 'auto'
  }

  // Wait until we know who the user is before rendering the UI
  if (!currentUser) return <div style={{ padding: '2rem' }}>Loading user data...</div>

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>

      <RepairForm onSuccess={fetchQueue} currentUser={currentUser} isAdmin={isAdmin} />

      {/* Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '3px solid #d62027', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        <h2 style={{ color: '#0b3068', margin: 0 }}>
          {isAdmin ? 'Shop Active Queue (Admin View)' : `My Assigned Tasks (${currentUser})`}
        </h2>

        <input
          type="text"
          placeholder='Search by name, VIN, plate, or vehilce...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '0.6rem 1rem',
            borderRadius: '20px',
            border: '1px solid #ccc',
            width: '300px',
            outline: 'none',
            fontSize: '0.9rem'
          }}
        />
      </div>

      {loading ? (
        <p>Loading active repairs...</p>
      ) : activeRepairs.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', background: '#fff', borderRadius: '8px', border: '1px dashed #ccc' }}>
          {searchTerm ? 'No repairs match your search.' : 'No active repairs assigned at this time.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', marginBottom: '3rem' }}>
          <table border={1} cellPadding={6} style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: '#fff', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f4f4f4' }}>
                <th>Rank</th>
                <th>Score</th>
                <th>Customer</th>
                <th>Vehicle Image</th>
                <th>License Plate</th>
                <th>Vehicle Specs</th>
                <th>VIN</th>
                <th>Service Required</th>
                <th>Severity (1-5)</th>
                <th>Entry Date</th>
                <th>Due Date</th>
                <th>Assigned Worker</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {activeRepairs.map((item, index) => (
                <tr key={item.id} style={{ backgroundColor: index === 0 && !searchTerm ? '#fff3cd' : 'transparent' }}>
                  <td><strong>#{index + 1}</strong></td>
                  <td><strong>{item.priorityScore?.toFixed(1)}</strong></td>
                  <td>{item.customerName}</td>
                  <td>
                    {item.vehicle?.carImageUrl ? (
                      <img
                        src={item.vehicle.carImageUrl}
                        alt={`${item.vehicle.make} ${item.vehicle.model}`}
                        style={{ width: '80px', borderRadius: '6px', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ color: '#999' }}>No Image</span>
                    )}
                  </td>
                  <td>
                    {item.vehicle?.licensePlate ? (
                      <div style={{ padding: '4px', border: '1px solid #333', textAlign: 'center', borderRadius: '4px', background: '#eee' }}>
                        <strong>{item.vehicle.licensePlate}</strong><br />
                        <small style={{ fontSize: '10px' }}>{item.vehicle.state}</small>
                      </div>
                    ) : 'N/A'}
                  </td>
                  <td>{item.vehicle?.year} {item.vehicle?.make} {item.vehicle?.model}</td>
                  <td><small style={{ fontFamily: 'monospace' }}>{item.vehicle?.vin || 'Unknown'}</small></td>
                  <td>{item.serviceType}</td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      whiteSpace: 'nowrap',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      color: '#fff',
                      backgroundColor: item.severity >= 4 ? '#d9534f' : item.severity >= 3 ? '#f0ad4e' : '#5cb85c'
                    }}>
                      Level {item.severity}
                    </span>
                  </td>
                  <td>{item.entryDate}</td>
                  <td>{item.expectedCompletionDate}</td>
                  {/* Assignment Dropdown */}
                  <td>
                    {isAdmin ? (
                      <select
                        value={item.assignedWorker || ''}
                        onChange={(e) => handleAssignWorker(item.id!, e.target.value)}
                        style={tableDropdownStyle}
                      >
                        <option value="">Unassigned</option>
                        <option value="worker1">worker1</option>
                        <option value="worker2">worker2</option>
                        <option value="worker3">worker3</option>
                      </select>
                    ) : (
                      <strong>{item.assignedWorker || 'Unassigned'}</strong>
                    )}
                  </td>
                  <td>
                    <select
                      value={item.status || 'PENDING'}
                      onChange={(e) => handleStatusChange(item.id!, e.target.value)}
                      style={tableDropdownStyle}
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="COMPLETED">COMPLETED</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {completedRepairs.length > 0 && (
        <>
          <h2 style={{ color: '#555', borderBottom: '3px solid #ccc', paddingBottom: '0.5rem', marginTop: '2rem' }}>
            Completed Services History
          </h2>
          <div style={{ overflowX: 'auto', opacity: 0.8 }}>
            <table border={1} cellPadding={6} style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: '#fff', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#eee' }}>
                  <th>Entry Date</th>
                  <th>Completion Date</th>
                  <th>Customer</th>
                  <th>Vehicle Image</th>
                  <th>License Plate</th>
                  <th>Vehicle Specs</th>
                  <th>Service Performed</th>
                  <th>Assigned Worker</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {completedRepairs.map((item) => (
                  <tr key={item.id}>
                    <td>{item.entryDate}</td>
                    <td><strong>{item.actualCompletionDate}</strong></td>
                    <td>{item.customerName}</td>
                    <td>
                      {item.vehicle?.carImageUrl ? (
                        <img
                          src={item.vehicle.carImageUrl}
                          alt={`${item.vehicle.make} ${item.vehicle.model}`}
                          style={{ width: '80px', borderRadius: '6px', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ color: '#999' }}>No Image</span>
                      )}
                    </td>
                    <td>
                      {item.vehicle?.licensePlate ? (
                        <div style={{ padding: '4px', border: '1px solid #333', textAlign: 'center', borderRadius: '4px', background: 'eee' }}>
                          <strong>{item.vehicle.licensePlate}</strong><br />
                          <small style={{ fontSize: '10px' }}>{item.vehicle.state}</small>
                        </div>
                      ) : 'N/A'}
                    </td>
                    <td>{item.vehicle?.year} {item.vehicle?.make} {item.vehicle?.model}</td>
                    <td>{item.serviceType}</td>
                    <td>{item.assignedWorker || 'Unknown'}</td>
                    <td>
                      {isAdmin ? (
                        <select
                          value={item.status}
                          onChange={(e) => handleStatusChange(item.id!, e.target.value)}
                          style={tableDropdownStyle}
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="IN_PROGRESS">IN PROGRESS</option>
                          <option value="COMPLETED">COMPLETED</option>
                        </select>
                      ) : (
                        <span style={tableDropdownStyle}>COMPLETED</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
