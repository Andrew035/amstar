export interface VehicleRepair {
  id?: number;
  customerName: string;
  licensPlate?: string;
  state?: string;
  make?: string;
  model?: string;
  year?: number;
  carImageUrl?: string;
  serviceType: string;
  severity: number;
  entryDate: string;
  expectedCompletionDate: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  priorityScore?: number;
}
