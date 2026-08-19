import React, { useEffect, useState } from 'react';
import type { VehicleRepair } from '../types/repair';
import { RepairForm } from './RepairForm';

// Custom UI: Circular Progress Ring
const CircularProgress = ({ percent, color, label, count }: { percent: number, color: string, label: string, count: number }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #eee', flex: 1, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
      <svg width="100" height="100">
        {/* Background Ring */}
        <circle stroke="#e9ecef" fill="transparent" strokeWidth="8" r={radius} cx="50" cy="50" />
        {/* Colored Progress Ring */}
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth="8"
          r={radius}
          cx="50"
          cy="50"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap='round'
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
          transform="rotate(-90 50 50)"
        />
        {/* Center Text */}
        <text x="50" y="50" fill="#333" fontSize="1.5rem" fontWeight="bold" textAnchor='middle' dy='.3em'>{count}</text>
      </svg>
      <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#555', marginTop: '1rem', textAlign: 'center' }}>{label}</div>
    </div>
  );
};

export const RepairQueue: React.FC = () => {
  const [repairs, setRepairs] = useState<VehicleRepair[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<string>('');

  // State to hold our search query
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Tab Navigation State   
  const [currentTab, setCurrentTab] = useState<'DASHBOARD' | 'ACTIVE' | 'HISTORY'>('DASHBOARD');

  // Custom Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [repairToDelete, setRepairToDelete] = useState<number | null>(null);

  const isAdmin = ['admin1', 'admin2', 'admin3'].includes(currentUser);

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

  // Delete logic
  // Triggered when the row is clicked
  const handleDeleteClick = (id: number) => {
    if (!isAdmin) return;
    setRepairToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (repairToDelete === null) return;

    const token = localStorage.getItem("amstar_token");
    try {
      const response = await fetch(`http://localhost:8080/api/repairs/${repairToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchQueue();
      } else {
        alert("Failed to delete the ticket. Make sure the backend supports this.")
      }
    } catch (error) {
      console.error("Failed to delete ticket:", error);
    } finally {
      // Close modal and reset state whether it succeeded or failed
      setIsDeleteModalOpen(false);
      setRepairToDelete(null);
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setRepairToDelete(null);
  };

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
    .filter(r => r.status !== 'COMPLETED')
    .filter(matchesSearch)
    // Sort descending by priorityScore (highest score goes to the top!)
    .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

  const completedRepairs = repairs
    .filter(r => r.status === 'COMPLETED')
    .filter(matchesSearch)
    // Sort descending by completion date (newest first)
    .sort((a, b) => new Date(b.actualCompletionDate || b.expectedCompletionDate).getTime() - new Date(a.actualCompletionDate || a.expectedCompletionDate).getTime());

  // Dashboard Calculations
  const totalRepairs = repairs.length;
  const pendingCount = repairs.filter(r => r.status === 'PENDING').length;
  const inProgressCount = repairs.filter(r => r.status === 'IN_PROGRESS').length;
  const completedCount = completedRepairs.length;

  const pendingPercent = totalRepairs === 0 ? 0 : (pendingCount / totalRepairs) * 100;
  const inProgressPercent = totalRepairs === 0 ? 0 : (inProgressCount / totalRepairs) * 100;
  const completedPercent = totalRepairs === 0 ? 0 : (completedCount / totalRepairs) * 100;

  // Find workers who have tickets IN_PROGRESS
  const activeWorkers = repairs.filter(r => r.status === 'IN_PROGRESS' && r.assignedWorker);

  // Find critical vehicles sitting in PENDING
  const criticalPending = repairs.filter(r => r.status === 'PENDING' && r.severity >= 4).sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

  // Helper function to grab the right color based on status
  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'PENDING': return '#f0ad4e';
      case 'IN_PROGRESS': return '#3498db';
      case 'COMPLETED': return '#27ae60';
      default: return '#ccc';
    }
  }

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


  const activeTabStyle: React.CSSProperties = {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#0b3068',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '1rem'
  };

  const inactiveTabStyle: React.CSSProperties = {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#e9ecef',
    color: '#495057',
    border: 'none',
    borderRadius: '4px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '1rem'
  }

  // Wait until we know who the user is before rendering the UI
  if (!currentUser) return <div style={{ padding: '2rem' }}>Loading user data...</div>

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>

      {/* Custom Delete confirmation modal */}
      {isDeleteModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>

          <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', width: '400px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, color: '#d9534f', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Confirm Deletion
            </h3>
            <p style={{ color: '#444', lineHeight: '1.5', fontSize: '1rem' }}>
              Are you sure you want to permanently delete this repair ticket? <strong style={{ color: '#d9534f' }}>This action cannot be undone.</strong>
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button onClick={cancelDelete} style={{ padding: '0.6rem 1.2rem', border: '1px solid #ccc', background: '#f8f9fa', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#333' }}>
                Cancel
              </button>
              <button onClick={confirmDelete} style={{ padding: '0.6rem 1.2rem', border: 'none', background: '#d9534f', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#fff' }}>
                Delete Repair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline CSS for Admin Hover Delete Effect */}
      <style>{`
        .admin-row {
          transition: background-color 0.15s ease-in-out;
        }
        .admin-row:hover {
          background-color: #fee2e2 !important;
          cursor: pointer;
        }
      `}</style>

      {/* Tab Navigation Menu */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => setCurrentTab('DASHBOARD')} style={currentTab === 'DASHBOARD' ? activeTabStyle : inactiveTabStyle}>
          Shop Overview
        </button>
        <button
          onClick={() => setCurrentTab('ACTIVE')}
          style={currentTab === 'ACTIVE' ? activeTabStyle : inactiveTabStyle}
        >
          Active Shop Queue
        </button>
        {isAdmin && (
          <button
            onClick={() => setCurrentTab('HISTORY')}
            style={currentTab === 'HISTORY' ? activeTabStyle : inactiveTabStyle}
          >
            Completed Services History
          </button>
        )}
      </div>

      {currentTab === 'ACTIVE' && isAdmin && (
        <RepairForm onSuccess={fetchQueue} currentUser={currentUser} isAdmin={isAdmin} />
      )}

      {/* Dashboard Tab View */}
      {currentTab === 'DASHBOARD' && (
        <div>
          <h2 style={{ color: '#0b3068', borderBottom: '3px solid #d62027', paddingBottom: '0.5rem', marginBottom: '1.5rem', marginTop: 0 }}>
            AM Star Transmissions | Real-Time Shop Metrics
          </h2>

          {/* Circular Progress Row */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <CircularProgress percent={pendingPercent} color="#f0ad4e" label="Vehicles Pending" count={pendingCount} />
            <CircularProgress percent={inProgressPercent} color="#3498db" label="Vehicles In Progress" count={inProgressCount} />
            <CircularProgress percent={completedPercent} color="#27ae60" label="Vehicles Completed" count={completedCount} />
          </div>

          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {/* Left Column: Active Technicians */}
            <div style={{ flex: 1, background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #eee' }}>
              <h3 style={{ color: '#555', marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Active Bays (In Progress)</h3>
              {activeWorkers.length === 0 ? (
                <p style={{ color: '#999', fontSize: '0.9rem' }}>No technicians are currently marked in progress.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {activeWorkers.map(item => (
                    <li key={item.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid #f8f9fa', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3498db' }}></div>
                      <div>
                        <strong style={{ fontSize: '1.1rem' }}>{item.assignedWorker}</strong> is working on <br />
                        <span style={{ color: '#666', fontSize: '0.9rem' }}>{item.vehicle?.year} {item.vehicle?.make} {item.vehicle?.model} - {item.serviceType}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Right Column: Critical Pending Queue */}
            <div style={{ flex: 1, background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #eee' }}>
              <h3 style={{ color: '#d9534f', marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Critical Pending Approvals</h3>
              {criticalPending.length === 0 ? (
                <p style={{ color: '#999', fontSize: '0.9rem' }}>No critical level vehicles are pending. Excellent work.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {criticalPending.map(item => (
                    <li key={item.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid #f8f9fa', display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <strong>{item.vehicle?.year} {item.vehicle?.make} {item.vehicle?.model}</strong><br />
                        <span style={{ color: '#666', fontSize: '0.9rem' }}>{item.serviceType}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ padding: '2px 6px', background: '#d9534f', color: '#fff', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>Level {item.severity}</span>
                        <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '4px' }}>Score: {item.priorityScore?.toFixed(1)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      {currentTab !== 'DASHBOARD' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '3px solid #d62027', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
          <h2 style={{ color: '#0b3068', margin: 0 }}>
            {currentTab === 'ACTIVE'
              ? (isAdmin ? 'Shop Active Queue (Admin View)' : `My Assigned Tasks (${currentUser})`)
              : 'Completed Services Ledger'}
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
      )}
      {/* Active Tab View */}
      {currentTab === 'ACTIVE' && (
        <>

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
                    <tr
                      key={item.id}
                      className={isAdmin ? 'admin-row' : ''}
                      title={isAdmin ? "Click to delete this repair" : ""}
                      onClick={() => isAdmin && handleDeleteClick(item.id!)}
                      style={{ backgroundColor: index === 0 && !searchTerm ? '#fff3cd' : 'transparent' }}
                    >
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
                            onClick={(e) => e.stopPropagation()}
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
                        {isAdmin ? (
                          <select
                            value={item.status || 'PENDING'}
                            onChange={(e) => handleStatusChange(item.id!, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              ...tableDropdownStyle,
                              backgroundColor: getStatusColor(item.status),
                              color: '#fff',
                              border: 'none'
                            }}
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="IN_PROGRESS">IN PROGRESS</option>
                            <option value="COMPLETED">COMPLETED</option>
                          </select>
                        ) : (
                          <span
                            style={{
                              ...tableDropdownStyle,
                              display: 'inline-block',
                              backgroundColor: getStatusColor(item.status),
                              color: '#fff',
                              border: 'none'
                            }}
                          >
                            {item.status?.replace('_', ' ')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {/* History Tab View */}
      {isAdmin && currentTab === 'HISTORY' && (
        <>

          {completedRepairs.length > 0 && (
            <>
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
                      <tr
                        key={item.id}
                        className='admin-row'
                        title="Click to delete this ticket"
                        onClick={() => handleDeleteClick(item.id!)}
                      >
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
                        <td>
                          <select
                            value={item.assignedWorker || ''}
                            onChange={(e) => handleAssignWorker(item.id!, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            style={tableDropdownStyle}
                          >
                            <option value="">Unassigned</option>
                            <option value="worker1">worker1</option>
                            <option value="worker2">worker2</option>
                            <option value="worker3">worker3</option>
                          </select>
                        </td>
                        <td>
                          {isAdmin ? (
                            <select
                              value={item.status}
                              onChange={(e) => handleStatusChange(item.id!, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                ...tableDropdownStyle,
                                display: 'inline-block',
                                backgroundColor: getStatusColor(item.status),
                                color: '#fff',
                                border: 'none'
                              }}
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
        </>
      )}
    </div>
  )
}
