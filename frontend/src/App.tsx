import React, { useCallback, useEffect, useRef, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import type {
  ServiceType,
  Technician,
  TicketActivity,
  VehicleRepair,
  LineItem,
} from "./types/repair";
import { Navbar } from "./components/Navbar";
import { Toast, type ToastTone } from "./components/Toast";
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
import { PricingModal } from "./components/PricingModal";
import { ConfirmDeleteModal } from "./components/ConfirmDeleteModal";

/**
 * What the shop did, not how alarming it is. Green for something added or
 * changed, red for something removed, amber for something that failed.
 */
export type ToastType = "success" | "deleted" | "error";

const TOAST_TONE: Record<ToastType, ToastTone> = {
  success: "ok",
  deleted: "gone",
  error: "warn",
};

export const App: React.FC = () => {
  const location = useLocation();
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
  const [pricedRepair, setPricedRepair] = useState<VehicleRepair | null>(null);

  // Global Toast Notification State. The id exists so a second toast remounts
  // the component rather than inheriting the first one's running timer.
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    type: ToastType;
  } | null>(null);
  const toastId = useRef(0);

  /** Toast owns its own lifetime, including pausing while it is being dragged. */
  const showToast = (message: string, type: ToastType) => {
    toastId.current += 1;
    setToast({ id: toastId.current, message, type });
  };

  const toastError = (error: unknown, fallback: string) =>
    showToast(error instanceof ApiError ? error.message : fallback, "error");

  // Exact matches only. An unrecognized role - a stale token issued before the
  // rename, or anything invented - lands on neither flag and gets the least
  // privilege the UI can offer. SecurityConfig is the actual boundary.
  const isAdmin = currentRole === "ADMIN";
  /**
   * Both roles run the shop floor, so this is simply "signed in". The role
   * decides one thing: the Invoices page, and PATCH /invoiced which lives there.
   * The `isAdmin` prop on the queue, dashboard and vehicle modal means "may
   * edit", so it is handed this rather than isAdmin.
   */
  const canEdit = Boolean(currentUser);

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
    if (!canEdit) return;
    await apiFetch(`/api/repairs/${id}/notes`, {
      method: "PATCH",
      body: JSON.stringify({ notes }),
    });
    showToast("Notes saved.", "success");
    fetchQueue();
  };

  const handleSaveComeback = async (id: number, isComeback: boolean) => {
    if (!canEdit) return;
    try {
      await apiFetch(`/api/repairs/${id}/comeback`, {
        method: "PATCH",
        body: JSON.stringify({ isComeback }),
      });
      showToast(isComeback ? "Marked as a comeback." : "Comeback cleared.", "success");
      fetchQueue();
    } catch (error) {
      toastError(error, "Could not update the comeback flag.");
    }
  };

  const handleSaveParts = async (id: number, parts: string) => {
    if (!canEdit) return;
    await apiFetch(`/api/repairs/${id}/parts`, {
      method: "PATCH",
      body: JSON.stringify({ parts }),
    });
    showToast("Parts saved.", "success");
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
    if (!canEdit) return;
    try {
      await apiFetch(`/api/repairs/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      showToast("Status updated.", "success");
      fetchQueue();
    } catch (error) {
      toastError(error, "Could not update status.");
    }
  };

  /**
   * Requirement 0.4. Its own handler rather than handleStatusChange, because it
   * is its own endpoint: the bookkeeper is authorized for this one transition
   * and no other, and the guard here mirrors that.
   */
  const handleMarkInvoiced = async (id: number) => {
    if (!isAdmin) return;
    try {
      await apiFetch(`/api/repairs/${id}/invoiced`, { method: "PATCH" });
      showToast("Invoice marked complete.", "success");
      fetchQueue();
    } catch (error) {
      toastError(error, "Could not mark this invoice complete.");
    }
  };

  const handleSeverityChange = async (id: number, severity: number) => {
    if (!canEdit) return;
    try {
      await apiFetch(`/api/repairs/${id}/severity`, {
        method: "PATCH",
        body: JSON.stringify({ severity }),
      });
      // Refetch reorders the queue: severity feeds priorityScore.
      showToast("Severity updated.", "success");
      fetchQueue();
    } catch (error) {
      toastError(error, "Could not update severity.");
    }
  };

  const handleCustomerNameChange = async (id: number, name: string) => {
    if (!canEdit) return;
    try {
      await apiFetch(`/api/repairs/${id}/customer`, {
        method: "PATCH",
        body: JSON.stringify({ customerName: name }),
      });
      showToast("Customer updated.", "success");
      fetchQueue();
    } catch (error) {
      toastError(error, "Could not update the customer name.");
    }
  };

  const handleDueDateChange = async (id: number, dueDate: string) => {
    if (!canEdit) return;
    try {
      await apiFetch(`/api/repairs/${id}/due-date`, {
        method: "PATCH",
        body: JSON.stringify({ dueDate }),
      });
      // Refetch reorders the queue: the due date feeds priorityScore.
      showToast("Due date updated.", "success");
      fetchQueue();
    } catch (error) {
      toastError(error, "Could not update the due date.");
    }
  };

  const handleAssignWorker = async (id: number, workerUsername: string) => {
    if (!canEdit) return;
    try {
      await apiFetch(`/api/repairs/${id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ worker: workerUsername }),
      });
      showToast("Technicians updated.", "success");
      fetchQueue();
    } catch (error) {
      toastError(error, "Could not assign technician.");
    }
  };

  const handleServiceChange = async (id: number, newService: string) => {
    if (!canEdit) return;
    try {
      await apiFetch(`/api/repairs/${id}/service`, {
        method: "PATCH",
        body: JSON.stringify({ serviceType: newService }),
      });
      showToast("Services updated.", "success");
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
      notes: string;
      parts: string;
    },
  ) => {
    if (!isAdmin) return;
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
      await apiFetch(`/api/repairs/${id}/notes`, {
        method: "PATCH",
        body: JSON.stringify({ notes: payload.notes }),
      });
      await apiFetch(`/api/repairs/${id}/parts`, {
        method: "PATCH",
        body: JSON.stringify({ parts: payload.parts }),
      });
      showToast("Invoice saved.", "success");
      fetchQueue();
    } catch (error) {
      // Four sequential writes, so a failure part way through leaves the
      // earlier ones applied. Acceptable here: every one of them is idempotent
      // and the page refetches, so saving again settles it.
      toastError(error, "Could not save the invoice.");
    }
  };

  /**
   * Parts and labor, for the modal on the queue. Separate from
   * handleSaveInvoice, which also writes notes and the parts pad from the
   * Invoices page; this one touches only what the modal shows.
   */
  const handleSavePricing = async (
    id: number,
    lineItems: LineItem[],
    laborPrice: number,
  ) => {
    if (!canEdit) return;
    try {
      await apiFetch(`/api/repairs/${id}/line-items`, {
        method: "PATCH",
        body: JSON.stringify({ items: lineItems }),
      });
      await apiFetch(`/api/repairs/${id}/pricing`, {
        method: "PATCH",
        body: JSON.stringify({ laborPrice, includeLabor: true }),
      });
      showToast("Pricing updated.", "success");
      fetchQueue();
    } catch (error) {
      toastError(error, "Could not save the pricing.");
    }
  };

  const handleAddTechnician = async (fullName: string): Promise<boolean> => {
    if (!canEdit) return false;
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
    if (!canEdit) return false;
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
    if (!canEdit) return;
    try {
      await apiFetch(`/api/technicians/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: active }),
      });
      showToast(
        active ? "Back on the roster." : "Removed from the roster.",
        active ? "success" : "deleted",
      );
      fetchReferenceData();
    } catch (error) {
      toastError(error, "Could not update the roster.");
    }
  };

  const handleDeleteClick = (id: number) => {
    if (!canEdit) return;
    setRepairToDelete(id);
    setIsDeleteModalOpen(true);
  };

  /**
   * The new-ticket form's success path. ActiveQueue passes this as onRefresh,
   * which it uses for nothing else, so the toast belongs here rather than
   * inside the form.
   */
  const handleTicketCreated = () => {
    showToast("Ticket created.", "success");
    fetchQueue();
  };

  const confirmDelete = async () => {
    if (repairToDelete === null) return;
    try {
      await apiFetch(`/api/repairs/${repairToDelete}`, { method: "DELETE" });
      showToast("Repair permanently deleted.", "deleted");
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
    /*
     * The page does not scroll; <main> does.
     *
     * With the document scrolling, the scrollbar sits beside the navbar and
     * stops it reaching the window edge, and nothing can be painted into that
     * strip - not a background, not a box-shadow, not an element overhanging
     * it. Giving the scroll to <main> puts the scrollbar below the navbar
     * instead, on one flat background where a transparent track is invisible,
     * and lets the bar run the full width of the window.
     *
     * `scrollbar-gutter: stable` moves down here with it, so a page that
     * scrolls and a page that does not still measure the same and the centred
     * column never shifts between them.
     */
    <div className="h-dvh flex flex-col overflow-hidden bg-amstar-ground">
      {/* Top Navigation */}
      {currentUser && (
        <Navbar
          isAdmin={isAdmin}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}

      {/*
        Keyed on the path so React throws the old page away and mounts the new
        one, which is what replays `anim-rise`. Without the key the <main>
        element persists across navigation and the animation only ever runs on
        the first load. Remounting also returns a new page to the top, which
        the document scroll used to do by itself.
      */}
      <main
        key={location.pathname}
        className="flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable] anim-rise"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              element={
                !currentUser ? <Register /> : <Navigate to="/" replace />
              }
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
                    isAdmin={canEdit}
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
                    isAdmin={canEdit}
                    currentUser={currentUser}
                    historicalServiceMap={historicalServiceMap}
                    technicianNames={technicianNames}
                    onRefresh={handleTicketCreated}
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
                    canEdit={canEdit}
                    onOpenPricing={setPricedRepair}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            {/* Invoices: the owner prices, the bookkeeper invoices. */}
            <Route
              path="/invoices"
              element={
                currentUser && isAdmin ? (
                  <PricingPage
                    repairs={repairs}
                    onSaveInvoice={handleSaveInvoice}
                    onMarkInvoiced={handleMarkInvoiced}
                  />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            {/* Dashboard.tsx:373 and any bookmark still say /pricing. */}
            <Route
              path="/pricing"
              element={<Navigate to="/invoices" replace />}
            />

            {/* Admin Protected: History */}
            <Route
              path="/history"
              element={
                currentUser ? (
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
                currentUser ? (
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
        </div>
      </main>

      {viewedRepair && (
        <VehicleModal
          repair={viewedRepair}
          isAdmin={canEdit}
          onClose={() => setViewedRepair(null)}
          onSaveNotes={handleSaveNotes}
          onSaveParts={handleSaveParts}
          onSaveComeback={handleSaveComeback}
        />
      )}

      {pricedRepair && (
        <PricingModal
          repair={pricedRepair}
          onClose={() => setPricedRepair(null)}
          onSave={handleSavePricing}
        />
      )}

      {isDeleteModalOpen && (
        <ConfirmDeleteModal
          onCancel={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete}
        />
      )}

      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          tone={TOAST_TONE[toast.type]}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default App;
