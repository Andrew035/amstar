export interface Vehicle {
  id?: number;
  licensePlate?: string;
  state?: string;
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  carImageUrl?: string;
  customer?: Customer;
}

export interface Customer {
  id?: number;
  fullName: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface Technician {
  id: number;
  fullName: string;
  phone?: string;
  hiredOn?: string;
  isActive: boolean;
}

export interface ServiceType {
  id: number;
  name: string;
  defaultSeverity: number;
  isActive: boolean;
}

export interface VehicleRepair {
  id?: number;
  customerName: string;
  vehicle?: Vehicle;
  serviceType: string;
  severity: number;
  entryDate: string;
  expectedCompletionDate: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  assignedWorker: string;
  actualCompletionDate: string;
  priorityScore?: number;
  notes?: string;
  parts?: string;
  retailPrice?: number;
  leasePrice?: number;
  laborPrice?: number;
  includeRetail?: boolean;
  includeLease?: boolean;
  includeLabor?: boolean;

  // Normalized data the backend now also sends. Nothing reads these yet -
  // they're what the comma strings above will eventually be replaced with.
  customer?: Customer;
  services?: ServiceType[];
  technicians?: Technician[];
}

/** One change to a ticket, from GET /api/activity. */
export interface TicketActivity {
  id: number;
  ticketId: number | null;
  ticketLabel: string;
  actor: string;
  action:
    | "CREATED"
    | "STATUS"
    | "SEVERITY"
    | "ASSIGNED"
    | "SERVICES"
    | "PRICING"
    | "NOTES"
    | "PARTS"
    | "DELETED";
  detail: string | null;
  createdAt: string;
}
