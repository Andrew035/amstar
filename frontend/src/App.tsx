import React, { useCallback, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import type { ServiceType, Technician, VehicleRepair } from "./types/repair";
import { Navbar } from "./components/Navbar";
import { Dashboard } from "./pages/Dashboard";
import { ActiveQueue } from "./pages/ActiveQueue";
import { PricingPage } from "./pages/Pricing";
import { HistoryPage } from "./pages/History";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { apiFetch, ApiError } from "./api";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { TicketNotes } from "./components/TicketNotes";

export const App: React.FC = () => {
  const [repairs, setRepairs] = useState<VehicleRepair[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [serviceCatalog, setServiceCatalog] = useState<ServiceType[]>([]);

  // Global Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [repairToDelete, setRepairToDelete] = useState<number | null>(null);
  const [viewedRepair, setViewedRepair] = useState<VehicleRepair | null>(null);

  // Global Toast Notification State
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Helper function to display toast and auto-dismiss after 3 seconds
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const toastError = (error: unknown, fallback: string) =>
    showToast(error instanceof ApiError ? error.message : fallback, "error");

  const isAdmin = currentRole === "ADMIN";

  // Centralized Authentication Check
  const authenticateUser = useCallback(() => {
    const token = localStorage.getItem("amstar_token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setCurrentUser(payload.sub);
        setCurrentRole(payload.role ?? null);
        return true;
      } catch {
        console.error("Invalid token format");
        localStorage.removeItem("amstar_token");
      }
    }
    setCurrentUser(null);
    setCurrentRole(null);
    return false;
  }, []);

  // On-Load Login
  useEffect(() => {
    const isLoggedIn = authenticateUser();
    if (isLoggedIn) {
      fetchQueue();
      fetchReferenceData();
    } else {
      setLoading(false); // Stop loading immediately if not logged in
    }
  }, [authenticateUser]);

  // Logic to run immediately after login
  const handleLoginSuccess = () => {
    authenticateUser();
    setLoading(true);
    fetchQueue();
    fetchReferenceData();
  };

  const handleSaveNotes = async (id: number, notes: string) => {
    if (!isAdmin) return;
    await apiFetch(`/api/repairs/${id}/notes`, {
      method: "PATCH",
      body: JSON.stringify({ notes }),
    });
    fetchQueue();
  };

  const fetchQueue = async () => {
    if (!localStorage.getItem("amstar_token")) return;
    try {
      setRepairs(await apiFetch<VehicleRepair[]>("/api/repairs/queue"));
    } catch (error) {
      // apiFetch already logged the user out on 401; anything else is worth showing.
      if (!(error instanceof ApiError) || error.status !== 401) {
        showToast("Could not load the queue.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    if (!localStorage.getItem("amstar_token")) return;
    try {
      const [techs, services] = await Promise.all([
        apiFetch<Technician[]>("/api/technicians"),
        apiFetch<ServiceType[]>("/api/services"),
      ]);
      setTechnicians(techs);
      setServiceCatalog(services);
    } catch (error) {
      console.error("Failed to fetch reference data:", error);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    if (!isAdmin) return;
    try {
      await apiFetch(`/api/repairs/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      fetchQueue();
    } catch (error) {
      toastError(error, "Could not update status.");
    }
  };

  const handleAssignWorker = async (id: number, workerUsername: string) => {
    if (!isAdmin) return;
    try {
      await apiFetch(`/api/repairs/${id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ worker: workerUsername }),
      });
      fetchQueue();
    } catch (error) {
      toastError(error, "Could not assign technician.");
    }
  };

  const handleServiceChange = async (id: number, newService: string) => {
    if (!isAdmin) return;
    try {
      await apiFetch(`/api/repairs/${id}/service`, {
        method: "PATCH",
        body: JSON.stringify({ serviceType: newService }),
      });
      fetchQueue();
      fetchReferenceData();
    } catch (error) {
      toastError(error, "Could not update service.");
    }
  };

  const handleSavePricing = async (id: number, payload: any) => {
    try {
      await apiFetch(`/api/repairs/${id}/pricing`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      showToast("Pricing updated successfully!", "success");
      fetchQueue();
    } catch (error) {
      toastError(error, "Could not save pricing.");
    }
  };

  const handleDeleteClick = (id: number) => {
    if (!isAdmin) return;
    setRepairToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (repairToDelete === null) return;
    try {
      await apiFetch(`/api/repairs/${repairToDelete}`, { method: "DELETE" });
      showToast("Repair permanently deleted.", "success");
      fetchQueue();
    } catch (error) {
      toastError(error, "Could not delete the repair.");
    } finally {
      setIsDeleteModalOpen(false);
      setRepairToDelete(null);
    }
  };

  // Service severities now come from the catalog table instead of being
  // reverse-engineered from whichever ticket happened to be newest.
  const historicalServiceMap: Record<string, number> = React.useMemo(() => {
    const map: Record<string, number> = {};
    serviceCatalog.forEach((service) => {
      map[service.name] = service.defaultSeverity;
    });
    return map;
  }, [serviceCatalog]);

  const technicianNames = React.useMemo(
    () => technicians.map((t) => t.fullName),
    [technicians],
  );

  const handleLogout = () => {
    localStorage.removeItem("amstar_token");
    window.location.reload();
  };

  if (loading)
    return (
      <div className="p-8 text-center text-amstar-ink-dim">
        Connecting to AMStar database...
      </div>
    );

  return (
    <div className="min-h-screen bg-amstar-ground">
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
      {currentUser && (
        <Navbar
          isAdmin={isAdmin}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* React Router DOM Routes */}
        <Routes>
          {/* Public Authentication Routes */}
          <Route
            path="/login"
            element={
              !currentUser ? (
                <Login onLoginSuccess={handleLoginSuccess} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/register"
            element={!currentUser ? <Register /> : <Navigate to="/" replace />}
          />
          <Route
            path="/forgot-password"
            element={
              !currentUser ? <ForgotPassword /> : <Navigate to="/" replace />
            }
          />
          <Route path="reset-password" element={<ResetPassword />} />

          {/* Shop Overview (Dashboard) */}
          <Route
            path="/"
            element={
              currentUser ? (
                <Dashboard repairs={repairs} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Active Queue */}
          <Route
            path="/queue"
            element={
              currentUser ? (
                <ActiveQueue
                  repairs={repairs}
                  isAdmin={isAdmin}
                  currentUser={currentUser}
                  historicalServiceMap={historicalServiceMap}
                  technicianNames={technicianNames}
                  onRefresh={fetchQueue}
                  onStatusChange={handleStatusChange}
                  onAssignWorker={handleAssignWorker}
                  onServiceChange={handleServiceChange}
                  onDeleteClick={handleDeleteClick}
                  onViewDeepDive={setViewedRepair}
                  viewedRepairId={viewedRepair?.id}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Admin Protected: Pricing */}
          <Route
            path="/pricing"
            element={
              currentUser && isAdmin ? (
                <PricingPage
                  repairs={repairs}
                  onSavePricing={handleSavePricing}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Admin Protected: History */}
          <Route
            path="/history"
            element={
              currentUser && isAdmin ? (
                <HistoryPage
                  repairs={repairs}
                  historicalServiceMap={historicalServiceMap}
                  technicianNames={technicianNames}
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
            onClick={(e) => e.stopPropagation()}
            className="bg-amstar-raised border border-amstar-line rounded p-6 w-full max-w-xl shadow-2xl"
          >
            <div className="flex justify-between items-center border-b border-amstar-line pb-3 mb-4">
              <h3 className="font-cond text-xl font-bold uppercase tracking-wider text-amstar-ink">
                Vehicle Snapshot
              </h3>
              <button
                onClick={() => setViewedRepair(null)}
                className="text-amstar-ink-faint hover:text-amstar-ink text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            {viewedRepair.vehicle?.carImageUrl ? (
              <img
                src={viewedRepair.vehicle.carImageUrl}
                alt="Vehicle"
                className="w-full h-64 object-cover rounded mb-4 border border-amstar-line"
              />
            ) : (
              <div className="w-full h-48 bg-amstar-field rounded flex items-center justify-center text-amstar-ink-faint font-cond uppercase tracking-widest text-sm mb-4">
                No Photo Available
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <span className="font-cond text-xs text-amstar-ink-dim uppercase tracking-widest block">
                  Customer
                </span>
                <span className="font-bold text-amstar-ink">
                  {viewedRepair.customerName}
                </span>
              </div>
              <div>
                <span className="font-cond text-xs text-amstar-ink-dim uppercase tracking-widest block">
                  Vehicle
                </span>
                <span className="font-bold text-amstar-ink">
                  {viewedRepair.vehicle?.year} {viewedRepair.vehicle?.make}{" "}
                  {viewedRepair.vehicle?.model}
                </span>
              </div>
              <div>
                <span className="font-cond text-xs text-amstar-ink-dim uppercase tracking-widest block">
                  VIN
                </span>
                <span className="font-mono tabular-nums text-xs bg-amstar-field px-2 py-1 rounded text-amstar-ink">
                  {viewedRepair.vehicle?.vin || "N/A"}
                </span>
              </div>
              <div>
                <span className="font-cond text-xs text-amstar-ink-dim uppercase tracking-widest block">
                  Plate
                </span>
                <div className="inline-block border border-amstar-line bg-amstar-field px-3 py-1 rounded font-mono tabular-nums text-center font-bold">
                  {viewedRepair.vehicle?.licensePlate}{" "}
                  <span className="text-[10px] block text-amstar-ink-dim">
                    {viewedRepair.vehicle?.state}
                  </span>
                </div>
              </div>
            </div>

            <TicketNotes
              repairId={viewedRepair.id!}
              initialNotes={viewedRepair.notes}
              isAdmin={isAdmin}
              onSave={handleSaveNotes}
            />

            <div className="bg-amstar-surface p-4 rounded border border-amstar-line flex justify-between items-center">
              <div>
                <span className="font-cond text-xs text-amstar-ink-dim uppercase tracking-widest block">
                  Job & Severity
                </span>
                <span className="font-bold text-amstar-red-ink text-base">
                  {viewedRepair.serviceType}
                </span>
                <span className="block mt-1 text-xs font-bold text-amstar-ink-dim">
                  Level {viewedRepair.severity} Priority
                </span>
              </div>
              <div className="text-right">
                <span className="font-cond text-xs text-amstar-ink-dim uppercase tracking-widest block">
                  Assigned Tech(s)
                </span>
                <span className="font-bold text-amstar-ink text-sm block">
                  {viewedRepair.assignedWorker || "Unassigned"}
                </span>
                <span className="inline-block mt-1 text-xs font-bold bg-amstar-blue text-white px-2 py-0.5 rounded-sm font-cond uppercase tracking-wider border border-amstar-line">
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
          <div className="bg-amstar-raised border border-amstar-line rounded p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-cond text-lg font-bold uppercase tracking-wider text-amstar-red-ink flex items-center gap-2">
              ⚠️ Permanent Deletion
            </h3>
            <p className="text-sm text-amstar-ink-dim leading-relaxed">
              Are you sure you want to delete this ticket? This action removes
              it permanently from the PostgreSQL database.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-transparent border border-amstar-line hover:bg-amstar-surface text-amstar-ink-dim rounded-sm font-cond uppercase tracking-widest text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-amstar-red hover:bg-red-700 text-white rounded-sm font-cond uppercase tracking-widest text-xs shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)] transition"
              >
                Delete Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-8 right-8 px-6 py-4 rounded-sm shadow-2xl text-white font-bold text-sm z-[9999] flex items-center gap-3 animate-slide-up border border-amstar-line ${toast.type === "success" ? "bg-emerald-700" : "bg-red-600"}`}
        >
          <span className="text-lg">
            {toast.type === "success" ? "\u2713" : "⚠️"}
          </span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default App;
