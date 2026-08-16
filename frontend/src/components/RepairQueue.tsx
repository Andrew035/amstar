import React, { useEffect, useState } from 'react';
import type { VehicleRepair } from '../types/repair';
import { RepairForm } from './RepairForm';

export const RepairQueue: React.FC = () => {
  const [repairs, setRepairs] = useState<VehicleRepair[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchQueue = async () => {
    try {
      const token = localStorage.getItem('amstar_token');
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

  useEffect(() => {
    fetchQueue();
  }, []);

  // Filter and sort the data into two separate arrays
  const activeRepairs = repairs.filter(r => r.status !== 'COMPLETED');

  const completedRepairs = repairs
    .filter(r => r.status === 'COMPLETED')
    // Sort descending by completion date (newest first)
    .sort((a, b) => new Date(b.expectedCompletionDate).getTime() - new Date(a.expectedCompletionDate).getTime());

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h2>Am Star Transmissions - Service Priority Queue</h2>
      <p style={{ color: '#666' }}>
        Priority calculation is driven by repair severity, entry timestamp, and targeted completion deadlines.
      </p>

      <RepairForm onSuccess={fetchQueue} />

      {loading ? (
        <p>Loading active repairs...</p>
      ) : activeRepairs.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', background: '#fff', borderRadius: '8px', border: '1px dashed #ccc' }}>
          No repairs in the queue. Submit a new intake above!
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>

          <table border={1} cellPadding={10} style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f4f4f4' }}>
                <th>Priority Rank</th>
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
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {activeRepairs.map((item, index) => (
                <tr key={item.id} style={{ backgroundColor: index === 0 ? '#fff3cd' : 'tranparent' }}>
                  <td><strong>#{index + 1}</strong></td>
                  <td><strong>{item.priorityScore?.toFixed(1)}</strong></td>
                  <td>{item.customerName}</td>
                  <td>
                    {item.vehicle?.carImageUrl ? (
                      <img
                        src={item.vehicle.carImageUrl}
                        alt={`${item.vehicle.make} ${item.vehicle.model}`}
                        style={{ width: '120px', borderRadius: '6px', objectFit: 'cover' }}
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
                  <td>
                    <select
                      value={item.status || 'PENDING'}
                      onChange={(e) => handleStatusChange(item.id!, e.target.value)}
                      style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc', fontWeight: 'bold' }}
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
            <table border={1} cellPadding={10} style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: '#fafafa' }}>
              <thead>
                <tr style={{ background: '#eee' }}>
                  <th>Completion Date</th>
                  <th>Customer</th>
                  <th>Vehicle Specs</th>
                  <th>Service Performed</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {completedRepairs.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.expectedCompletionDate}</strong></td>
                    <td>{item.customerName}</td>
                    <td>{item.vehicle?.year} {item.vehicle?.make} {item.vehicle?.model}</td>
                    <td>{item.serviceType}</td>
                    <td>
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.id!, e.target.value)}
                        style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#e2f0e6', color: '#27ae60', fontWeight: 'bold' }}
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
        </>
      )}
    </div>
  )
}
