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
  isComeback?: boolean;
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

/** One priced row on a ticket. The invoice is the sum of these plus labor. */
export interface LineItem {
  id?: number;
  description: string;
  unitPrice: number;
  quantity: number;
  vendor?: string;
  position?: number;
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
  ticketCount?: number;

  // Priced rows. Absent on a shop-floor account - the API withholds them.
  lineItems?: LineItem[];
  billingType?: "RETAIL" | "WHOLESALE";
  /** Computed server-side: line items + labor, or the legacy sum on old tickets. */
  invoiceTotal?: number;

  // Legacy pricing. Kept so tickets written before line items still total
  // correctly; nothing new should write these.
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
    | "DUE_DATE"
    | "CUSTOMER"
    | "DELETED"
    | "LINE_ITEMS"
    | "BILLING_TYPE"
    | "COMEBACK";
  detail: string | null;
  createdAt: string;
}
