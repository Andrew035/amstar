export interface Vehicle {
  id?: number;
  licensePlate?: string;
  state?: string;
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  carImageUrl?: string;
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
}
