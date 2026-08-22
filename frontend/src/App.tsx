import React, { useCallback, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import type { VehicleRepair } from './types/repair';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { ActiveQueue } from './pages/ActiveQueue';
import { PricingPage } from './pages/Pricing';
import { HistoryPage } from './pages/History';
import { Login } from './pages/Login';
import { Register } from './pages/Register';

export const App: React.FC = () => {
  const [repairs, setRepairs] = useState<VehicleRepair[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // Global Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [repairToDelete, setRepairToDelete] = useState<number | null>(null);
  const [viewedRepair, setViewedRepair] = useState<VehicleRepair | null>(null);

  // Global Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Helper function to display toast and auto-dismiss after 3 seconds
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  const isAdmin = ['admin1', 'admin2', 'admin3'].includes(currentUser || '');

  useEffect(() => {
    const token = localStorage.getItem('amstar_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUser(payload.sub);
      } catch (error) {
        console.error("Invalid token format");
      }
    }
    fetchQueue();
  }, []);

  // Centralized Authentication Check
  const authenticateUser = useCallback(() => {
    const token = localStorage.getItem('amstar_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUser(payload.sub);
        return true;
      } catch (error) {
        console.error("Invalid token format");
        localStorage.removeItem('amstar_token');
      }
    }
    setCurrentUser(null);
    return false;
  }, []);

  // On-Load Login
  useEffect(() => {
    const isLoggedIn = authenticateUser();
    if (isLoggedIn) {
      fetchQueue();
    } else {
      setLoading(false); // Stop loading immediately if not logged in
    }
  }, [authenticateUser]);

  // Logic to run immediately after login
  const handleLoginSuccess = () => {
    authenticateUser();
    setLoading(true);
    fetchQueue();
  };

  const fetchQueue = async () => {
    try {
      const token = localStorage.getItem('amstar_token');
      if (!token) return;

      const response = await fetch('http://localhost:8080/api/repairs/queue', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
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

  const handleStatusChange = async (id: number, newStatus: string) => {
    if (!isAdmin) return;
    const token = localStorage.getItem('amstar_token');
    try {
      const response = await fetch(`http://localhost:8080/api/repairs/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) fetchQueue();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleAssignWorker = async (id: number, workerUsername: string) => {
    if (!isAdmin) return;
    const token = localStorage.getItem('amstar_token');
    try {
      const response = await fetch(`http://localhost:8080/api/repairs/${id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ worker: workerUsername })
      });
      if (response.ok) fetchQueue();
    } catch (error) {
      console.error("Failed to assign worker:", error);
    }
  };

  const handleServiceChange = async (id: number, newService: string) => {
    if (!isAdmin) return;
    const token = localStorage.getItem('amstar_token');
    try {
      const response = await fetch(`http://localhost:8080/api/repairs/${id}/service`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ serviceType: newService })
      });
      if (response.ok) fetchQueue();
    } catch (error) { console.error("Failed to update service:", error); }
  };

  const handleSavePricing = async (id: number, payload: any) => {
    const token = localStorage.getItem('amstar_token');
    try {
      const response = await fetch(`http://localhost:8080/api/repairs/${id}/pricing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        showToast("Pricing updated successfully!", "success");
        fetchQueue();
      } else {
        showToast("Failed to save pricing parameters.", "error");
      }
    } catch (error) {
      console.error("Failed to save pricing:", error);
      showToast("Network error. Could not save pricing.", "error");
    }
  };

  const handleDeleteClick = (id: number) => {
    if (!isAdmin) return;
    setRepairToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (repairToDelete === null) return;
    const token = localStorage.getItem('amstar_token');
    try {
      const response = await fetch(`http://localhost:8080/api/repairs/${repairToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        showToast("Repair permanently deleted.", "success");
        fetchQueue();
      } else {
        showToast("Failed to delete the repair.", "error");
      }
    } catch (error) {
      console.error("Failed to delete repair:", error);
      showToast("Network error. Could not delete repair.", "error");
    } finally {
      setIsDeleteModalOpen(false);
      setRepairToDelete(null);
    }
  };

  // === NEW: DELIMITED SERVICE PARSING ===
  const historicalServiceMap: Record<string, number> = {};
  [...repairs].sort((a, b) => (b.id || 0) - (a.id || 0)).forEach(r => {
    if (r.serviceType && r.severity) {
      // Split by comma, trim spaces, convert to uppercase, and remove empty strings
      const services = r.serviceType.split(',').map(s => s.trim().toUpperCase()).filter(s => s !== '');

      services.forEach(serviceName => {
        if (!historicalServiceMap[serviceName]) {
          historicalServiceMap[serviceName] = r.severity;
        }
      });
    }
  });

  const handleLogout = () => {
    localStorage.removeItem('amstar_token');
    window.location.reload();
  };

  if (loading) return <div className='p-8 text-center text-slate-500'>Connecting to AMStar database...</div>

  return (
    <div className='min-h-screen bg-slate-50'>

      {/* Inline Animation CSS for the Toast */}
      <style>
        {`
          @keyframes slideUp {
            from { transform: translateY(150%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .animate-slide-up { animation: slideUp 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        `}
      </style>

      {/* Top Navigation */}
      {currentUser && <Navbar isAdmin={isAdmin} currentUser={currentUser} onLogout={handleLogout} />}

      {/* Main Content Area */}
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>

        {/* React Router DOM Routes */}
        <Routes>

          {/* Public Authentication Routes */}
          <Route path="/login" element={!currentUser ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/" replace />} />
          <Route path="/register" element={!currentUser ? <Register /> : <Navigate to="/" replace />} />

          {/* Shop Overview (Dashboard) */}
          <Route path="/" element={currentUser ? <Dashboard repairs={repairs} /> : <Navigate to="/login" replace />} />

          {/* Active Queue */}
          <Route
            path="/queue"
            element={currentUser ? (
              <ActiveQueue
                repairs={repairs}
                isAdmin={isAdmin}
                currentUser={currentUser}
                historicalServiceMap={historicalServiceMap}
                onRefresh={fetchQueue}
                onStatusChange={handleStatusChange}
                onAssignWorker={handleAssignWorker}
                onServiceChange={handleServiceChange}
                onDeleteClick={handleDeleteClick}
                onViewDeepDive={setViewedRepair}
                viewedRepairId={viewedRepair?.id}
              />
            ) : <Navigate to="/login" replace />
            }
          />

          {/* Admin Protected: Pricing */}
          <Route
            path="/pricing"
            element={
              (currentUser && isAdmin) ? (
                <PricingPage repairs={repairs} onSavePricing={handleSavePricing} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Admin Protected: History */}
          <Route
            path="/history"
            element={
              (currentUser && isAdmin) ? (
                <HistoryPage
                  repairs={repairs}
                  historicalServiceMap={historicalServiceMap}
                  onStatusChange={handleStatusChange}
                  onAssignWorker={handleAssignWorker}
                  onServiceChange={handleServiceChange}
                  onViewDeepDive={setViewedRepair}
                  onDeleteClick={handleDeleteClick}
                  viewedRepairId={viewedRepair?.id}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Tailwind Deep Dive Modal */}
      {viewedRepair && (
        <div
          onClick={() => setViewedRepair(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl border border-slate-100"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-xl font-bold text-amstar-blue">Vehicle Snapshot</h3>
              <button onClick={() => setViewedRepair(null)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">
                &times;
              </button>
            </div>

            {viewedRepair.vehicle?.carImageUrl ? (
              <img src={viewedRepair.vehicle.carImageUrl} alt="Vehicle" className="w-full h-64 object-cover rounded-xl mb-4 shadow" />
            ) : (
              <div className="w-full h-48 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold text-sm mb-4">
                No Photo Available
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase block">Customer</span>
                <span className="font-bold text-slate-800">{viewedRepair.customerName}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase block">Vehicle</span>
                <span className="font-bold text-slate-800">
                  {viewedRepair.vehicle?.year} {viewedRepair.vehicle?.make} {viewedRepair.vehicle?.model}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase block">VIN</span>
                <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">{viewedRepair.vehicle?.vin || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase block">Plate</span>
                <div className="inline-block border border-slate-400 bg-slate-100 px-3 py-1 rounded text-center font-bold">
                  {viewedRepair.vehicle?.licensePlate} <span className="text-[10px] block text-slate-500">{viewedRepair.vehicle?.state}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase block">Job & Severity</span>
                <span className="font-bold text-amstar-red text-base">{viewedRepair.serviceType}</span>
                <span className="block mt-1 text-xs font-bold text-slate-600">Level {viewedRepair.severity} Priority</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-bold uppercase block">Assigned Tech(s)</span>
                <span className="font-bold text-slate-800 text-sm block">{viewedRepair.assignedWorker || 'Unassigned'}</span>
                <span className="inline-block mt-1 text-xs font-bold bg-amstar-blue text-white px-2 py-0.5 rounded">
                  {viewedRepair.status}
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Tailwind Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
              ⚠️ Permanent Deletion
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to delete this ticket? This action removes it permanently from the PostgreSQL database.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition"
              >
                Delete Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Floating Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-xl shadow-2xl text-white font-bold text-sm z-[9999] flex items-center gap-3 animate-slide-up border ${toast.type === 'success' ? 'bg-emerald-600 border-emerald-500' : 'bg-red-600 border-red-500'}`}>
          <span className='text-lg'>{toast.type === 'success' ? '\u2713' : '⚠️'}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}

export default App;
