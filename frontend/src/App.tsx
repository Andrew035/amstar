import React, { useCallback, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import type {
  ServiceType,
  Technician,
  TicketActivity,
  VehicleRepair,
  LineItem,
} from "./types/repair";
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
import { Roster } from "./pages/Roster";
import { VehicleModal } from "./components/VehicleModal";
import { ConfirmDeleteModal } from "./components/ConfirmDeleteModal";

export const App: React.FC = () => {
  const [repairs, setRepairs] = useState<VehicleRepair[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [serviceCatalog, setServiceCatalog] = useState<ServiceType[]>([]);
  const [activity, setActivity] = useState<TicketActivity[]>([]);

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

  useEffect(() => {
    if (!currentUser) return;
    const refresh = () => {
      if (document.visibilityState === "visible") fetchQueue();
    };
    const timer = window.setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [currentUser]);

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

  const handleSaveComeback = async (id: number, isComeback: boolean) => {
    if (!isAdmin) return;
    try {
      await apiFetch(`/api/repairs/${id}/comeback`, {
        method: "PATCH",
        body: JSON.stringify({ isComeback }),
      });
      fetchQueue();
    } catch (error) {
      toastError(error, "Could not update the comeback flag.");
    }
  };

  const handleSaveParts = async (id: number, parts: string) => {
    if (!isAdmin) return;
    await apiFetch(`/api/repairs/${id}/parts`, {
      method: "PATCH",
      body: JSON.stringify({ parts }),
    });
    fetchQueue();
  };

  const fetchQueue = async () => {
    if (!localStorage.getItem("amstar_token")) return;
    try {
      setRepairs(await apiFetch<VehicleRepair[]>("/api/repairs/queue"));
      fetchActivity();
    } catch (error) {
      // apiFetch already logged the user out on 401; anything else is worth showing.
      if (!(error instanceof ApiError) || error.status !== 401) {
        showToast("Could not load the queue.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchActivity = async () => {
    try {
      setActivity(await apiFetch<TicketActivity[]>("/api/activity"));
    } catch {
      // The feed is supplementary; a failure here must not interrupt the queue.
    }
  };

  const fetchReferenceData = async () => {
    if (!localStorage.getItem("amstar_token")) return;
    try {
      const [techs, services] = await Promise.all([
        apiFetch<Technician[]>("/api/technicians?includeInactive=true"),
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

  const handleSeverityChange = async (id: number, severity: number) => {
    if (!isAdmin) return;
    try {
      await apiFetch(`/api/repairs/${id}/severity`, {
        method: "PATCH",
        body: JSON.stringify({ severity }),
      });
      // Refetch reorders the queue: severity feeds priorityScore.
      fetchQueue();
    } catch (error) {
      toastError(error, "Could not update severity.");
    }
  };

  const handleCustomerNameChange = async (id: number, name: string) => {
    if (!isAdmin) return;
    try {
      await apiFetch(`/api/repairs/${id}/customer`, {
        method: "PATCH",
        body: JSON.stringify({ customerName: name }),
      });
      fetchQueue();
    } catch (error) {
      toastError(error, "Could not update the customer name.");
    }
  };

  const handleDueDateChange = async (id: number, dueDate: string) => {
    if (!isAdmin) return;
    try {
      await apiFetch(`/api/repairs/${id}/due-date`, {
        method: "PATCH",
        body: JSON.stringify({ dueDate }),
      });
      // Refetch reorders the queue: the due date feeds priorityScore.
      fetchQueue();
    } catch (error) {
      toastError(error, "Could not update the due date.");
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

  /**
   * Line items and labor live behind two endpoints, but they are one Save to
   * the shop. Both PATCH, then one refetch and one toast.
   */
  const handleSaveInvoice = async (
    id: number,
    payload: {
      lineItems: LineItem[];
      laborPrice: number;
    },
  ) => {
    try {
      await apiFetch(`/api/repairs/${id}/line-items`, {
        method: "PATCH",
        body: JSON.stringify({ items: payload.lineItems }),
      });
      await apiFetch(`/api/repairs/${id}/pricing`, {
        method: "PATCH",
        body: JSON.stringify({
          laborPrice: payload.laborPrice,
          includeLabor: true,
        }),
      });
      showToast("Pricing updated successfully!", "success");
      fetchQueue();
    } catch (error) {
      toastError(error, "Could not save pricing.");
    }
  };

  const handleAddTechnician = async (fullName: string): Promise<boolean> => {
    if (!isAdmin) return false;
    try {
      await apiFetch("/api/technicians", {
        method: "POST",
        body: JSON.stringify({ fullName }),
      });
      showToast(`${fullName} added to the roster.`, "success");
      await fetchReferenceData();
      return true;
    } catch (error) {
      toastError(error, "Could not add that technician.");
      return false;
    }
  };

  const handleRenameTechnician = async (
    id: number,
    fullName: string,
  ): Promise<boolean> => {
    if (!isAdmin) return false;
    try {
      await apiFetch(`/api/technicians/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ fullName }),
      });
      showToast(`Renamed to ${fullName}.`, "success");
      // Tickets carry the technician's name, so the queue is stale until refetched.
      await Promise.all([fetchReferenceData(), fetchQueue()]);
      return true;
    } catch (error) {
      toastError(error, "Could not rename that technician.");
      return false;
    }
  };

  const handleSetTechnicianActive = async (id: number, active: boolean) => {
    if (!isAdmin) return;
    try {
      await apiFetch(`/api/technicians/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: active }),
      });
      showToast(
        active ? "Back on the roster." : "Removed from the roster.",
        "success",
      );
      fetchReferenceData();
    } catch (error) {
      toastError(error, "Could not update the roster.");
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
    () => technicians.filter((t) => t.isActive).map((t) => t.fullName),
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
                <Dashboard
                  repairs={repairs}
                  technicianNames={technicianNames}
                  activity={activity}
                  isAdmin={isAdmin}
                />
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
                  onSeverityChange={handleSeverityChange}
                  onDueDateChange={handleDueDateChange}
                  onCustomerNameChange={handleCustomerNameChange}
                  onAssignWorker={handleAssignWorker}
                  onServiceChange={handleServiceChange}
                  onDeleteClick={handleDeleteClick}
                  onSaveNotes={handleSaveNotes}
                  onSaveParts={handleSaveParts}
                  onSaveComeback={handleSaveComeback}
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
                  onSaveInvoice={handleSaveInvoice}
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

          {/* Admin Protected: Roster */}
          <Route
            path="/roster"
            element={
              currentUser && isAdmin ? (
                <Roster
                  technicians={technicians}
                  repairs={repairs}
                  onAddTechnician={handleAddTechnician}
                  onRenameTechnician={handleRenameTechnician}
                  onSetTechnicianActive={handleSetTechnicianActive}
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

      {viewedRepair && (
        <VehicleModal
          repair={viewedRepair}
          isAdmin={isAdmin}
          onClose={() => setViewedRepair(null)}
          onSaveNotes={handleSaveNotes}
          onSaveParts={handleSaveParts}
          onSaveComeback={handleSaveComeback}
        />
      )}

      {isDeleteModalOpen && (
        <ConfirmDeleteModal
          onCancel={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete}
        />
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
